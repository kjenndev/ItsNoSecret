// @vitest-environment node
import {expect,it,vi} from 'vitest';
vi.mock('./db.ts',()=>({prisma:{}}));
it('snapshots only active administrator recipients, deduplicated, without internal notes',async()=>{
 const {enqueueLeadEmail}=await import('./leadEmail.ts');
 const tx={emailSettings:{findUnique:vi.fn().mockResolvedValue({enabled:true,apiKeyEncrypted:'encrypted',fromEmail:'sender@example.test',fromName:'Service',replyTo:'reply@example.test'})},user:{findMany:vi.fn().mockResolvedValue([{email:'Admin@example.test'},{email:'admin@example.test'},{email:'other@example.test'}])},leadEmailJob:{createMany:vi.fn()}};
 await enqueueLeadEmail(tx as never,{id:'lead1',name:'Customer',source:'PHONE',serviceNeed:'Repair',email:'customer@example.test',phone:'123',preferredContact:'PHONE',message:'Help',notes:'PRIVATE'} as never);
 expect(tx.user.findMany).toHaveBeenCalledWith({where:{isActive:true,roles:{has:'ADMIN'}},select:{email:true}});
 const jobs=tx.leadEmailJob.createMany.mock.calls[0][0].data;
 expect(jobs).toHaveLength(2);expect(JSON.stringify(jobs)).not.toContain('PRIVATE');
 expect(jobs[0].payload).toMatchObject({to:['admin@example.test'],reply_to:'reply@example.test',subject:'New lead notification'});
 expect(jobs[0].payload.text).toContain('Customer');expect(jobs[0].payload.text).toContain('Repair');
});

it('delivers frozen text to an eligible admin with fixed URL and idempotency',async()=>{
 const {deliverNextLeadEmail}=await import('./leadEmail.ts');
 const {encryptApiKey}=await import('./emailCrypto.ts');
 vi.stubEnv('EMAIL_SETTINGS_ENCRYPTION_KEY',Buffer.alloc(32,9).toString('base64'));
 const job={id:'job1',recipient:'admin@example.test',payload:{from:'sender@example.test',to:['admin@example.test'],text:'frozen'},createdAt:new Date(),attempts:0};
 const tx={$queryRaw:vi.fn().mockResolvedValue([job]),emailSettings:{findUnique:vi.fn().mockResolvedValue({enabled:true,apiKeyEncrypted:encryptApiKey('re_testSecret123456789')})},user:{findFirst:vi.fn().mockResolvedValue({id:'admin'})},leadEmailJob:{findFirst:vi.fn().mockResolvedValue(null),update:vi.fn()}};
 const db={$transaction:vi.fn(async(fn)=>fn(tx))};const send=vi.fn().mockResolvedValue(new Response('{}',{status:200}));
 await deliverNextLeadEmail(db as never,send);
 expect(send).toHaveBeenCalledWith('https://api.resend.com/emails',expect.objectContaining({redirect:'error',body:JSON.stringify(job.payload),headers:expect.objectContaining({'Idempotency-Key':'lead-email/job1'})}));
 expect(tx.user.findFirst).toHaveBeenCalledWith({where:{email:{equals:job.recipient,mode:'insensitive'},isActive:true,roles:{has:'ADMIN'}},select:{id:true}});
 expect(tx.leadEmailJob.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'SENT',lastStatus:'sent'})}));
 vi.unstubAllEnvs();
});

it('retries transient failures safely, bounds attempts/window, and cancels ineligible recipients',async()=>{
 const {deliverNextLeadEmail}=await import('./leadEmail.ts');const {encryptApiKey}=await import('./emailCrypto.ts');
 vi.stubEnv('EMAIL_SETTINGS_ENCRYPTION_KEY',Buffer.alloc(32,9).toString('base64'));
 for(const scenario of ['network','rate','permanent','exhausted','expired','inactive','disabled','encryption','conflict','concurrent']){
 const job={id:'job1',recipient:'admin@example.test',payload:{text:'frozen'},createdAt:new Date(Date.now()-(scenario==='expired'?24*3600000:0)),attempts:scenario==='exhausted'?7:0};
 const tx={$queryRaw:vi.fn().mockResolvedValue([job]),emailSettings:{findUnique:vi.fn().mockResolvedValue({enabled:scenario!=='disabled',apiKeyEncrypted:scenario==='encryption'?'bad':encryptApiKey('re_testSecret123456789')})},user:{findFirst:vi.fn().mockResolvedValue(scenario==='inactive'?null:{id:'admin'})},leadEmailJob:{findFirst:vi.fn().mockResolvedValue(null),update:vi.fn()}};
 const db={$transaction:vi.fn(async(fn)=>fn(tx))};
 const send=vi.fn(async()=>{if(scenario==='network')throw new Error('SECRET');return new Response(JSON.stringify({name:scenario==='concurrent'?'concurrent_idempotent_requests':'invalid_idempotent_request',message:'SECRET'}),{status:scenario==='permanent'?401:scenario==='conflict'||scenario==='concurrent'?409:429,headers:{'Retry-After':'120'}});});
 await deliverNextLeadEmail(db as never,send);
 const data=tx.leadEmailJob.update.mock.calls[0][0].data;
 expect(data.status).toBe(['network','rate','encryption','concurrent'].includes(scenario)?'PENDING':['inactive','disabled'].includes(scenario)?'CANCELLED':'FAILED');
 expect(JSON.stringify(data)).not.toContain('SECRET');
 if(['expired','inactive','disabled','exhausted','encryption'].includes(scenario))expect(send).not.toHaveBeenCalled();
 if(scenario==='rate')expect(data.nextAttemptAt.getTime()).toBeGreaterThan(Date.now()+119000);
 }
 vi.unstubAllEnvs();
});

it('honors shared rate-limit cooldown before any provider request',async()=>{
 const {deliverNextLeadEmail}=await import('./leadEmail.ts');
 const tx={$queryRaw:vi.fn().mockResolvedValue([{id:'job2',recipient:'a@example.test',createdAt:new Date(),attempts:0}]),leadEmailJob:{update:vi.fn(),findFirst:vi.fn().mockResolvedValue({id:'rate-limited-job'})},emailSettings:{findUnique:vi.fn()},user:{findFirst:vi.fn()}};
 const send=vi.fn();const db={$transaction:vi.fn(async fn=>fn(tx))};
 expect(await deliverNextLeadEmail(db as never,send)).toBe(false);expect(send).not.toHaveBeenCalled();
 expect(tx.leadEmailJob.findFirst).toHaveBeenCalledWith({where:{lastStatus:'rate_limited',nextAttemptAt:{gt:expect.any(Date)}},select:{id:true}});
});

it('reuses the frozen idempotency key after a failed delivery and a restarted invocation',async()=>{
 const {deliverNextLeadEmail}=await import('./leadEmail.ts');const {encryptApiKey}=await import('./emailCrypto.ts');
 vi.stubEnv('EMAIL_SETTINGS_ENCRYPTION_KEY',Buffer.alloc(32,9).toString('base64'));
 const job={id:'durable-job',recipient:'admin@example.test',payload:{text:'original payload'},createdAt:new Date(),attempts:0,status:'PENDING'};
 const tx={$queryRaw:vi.fn().mockImplementation(async()=>job.status==='PENDING'?[job]:[]),emailSettings:{findUnique:vi.fn().mockResolvedValue({enabled:true,apiKeyEncrypted:encryptApiKey('re_testSecret123456789')})},user:{findFirst:vi.fn().mockResolvedValue({id:'admin'})},leadEmailJob:{findFirst:vi.fn().mockResolvedValue(null),update:vi.fn().mockImplementation(async({data})=>Object.assign(job,data))}};
 const db={$transaction:vi.fn(async fn=>fn(tx))};const send=vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(new Response('{}',{status:200}));
 await deliverNextLeadEmail(db as never,send);expect(job.status).toBe('PENDING');expect(job.attempts).toBe(1);
 await deliverNextLeadEmail(db as never,send);expect(job.status).toBe('SENT');expect(job.attempts).toBe(2);
 expect(send.mock.calls[0][1].body).toBe(send.mock.calls[1][1].body);expect(send.mock.calls[0][1].headers['Idempotency-Key']).toBe(send.mock.calls[1][1].headers['Idempotency-Key']);
 await deliverNextLeadEmail(db as never,send);expect(send).toHaveBeenCalledTimes(2);vi.unstubAllEnvs();
});

it('compares UTC-naive job deadlines against UTC without weakening worker locks',async()=>{
 const {deliverNextLeadEmail}=await import('./leadEmail.ts');
 const tx={$queryRaw:vi.fn().mockResolvedValue([])};
 const db={$transaction:vi.fn(async fn=>fn(tx))};
 const send=vi.fn();
 expect(await deliverNextLeadEmail(db as never,send)).toBe(false);
 expect(tx.$queryRaw).toHaveBeenCalledExactlyOnceWith([`SELECT * FROM "LeadEmailJob" WHERE status = 'PENDING' AND "nextAttemptAt" <= (NOW() AT TIME ZONE 'UTC') AND pg_try_advisory_xact_lock(741852963) ORDER BY "createdAt", id LIMIT 1 FOR UPDATE SKIP LOCKED`]);
 expect(send).not.toHaveBeenCalled();
});
