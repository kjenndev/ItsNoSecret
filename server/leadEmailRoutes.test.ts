// @vitest-environment node
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import express from 'express';import jwt from 'jsonwebtoken';import {randomBytes} from 'node:crypto';
const db=vi.hoisted(()=>({$transaction:vi.fn(),lead:{create:vi.fn(),findUnique:vi.fn(),update:vi.fn()},user:{findUnique:vi.fn(),findMany:vi.fn()},emailSettings:{findUnique:vi.fn()},leadEmailJob:{createMany:vi.fn()}}));
vi.mock('./db.ts',()=>({prisma:db}));
let server:ReturnType<express.Express['listen']>;let url:string;let token:string;
beforeEach(async()=>{
 vi.stubEnv('JWT_SECRET',randomBytes(32).toString('hex'));db.$transaction.mockImplementation(async fn=>fn(db));
 db.user.findUnique.mockResolvedValue({id:'admin',roles:['ADMIN'],isActive:true,tokenVersion:0});
 db.emailSettings.findUnique.mockResolvedValue({enabled:true,apiKeyEncrypted:'encrypted',fromEmail:'sender@example.test',fromName:'Service',replyTo:''});
 db.user.findMany.mockResolvedValue([{email:'admin@example.test'}]);
 db.lead.create.mockImplementation(async({data})=>({id:'lead1',...data}));
 const app=express();app.use(express.json());app.use('/api/leads',(await import('./routes/leads.ts')).default);app.use('/api/crm',(await import('./routes/crm.ts')).default);
 server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;token=jwt.sign({userId:'admin',tokenVersion:0},process.env.JWT_SECRET!);
});
afterEach(async()=>{await new Promise<void>(r=>server.close(()=>r()));vi.resetAllMocks();vi.resetModules();vi.unstubAllEnvs();});
it.each(['/api/leads','/api/crm/leads'])('atomically queues notifications only on valid creation at %s',async(path)=>{
 const headers={'Content-Type':'application/json',Authorization:`Bearer ${token}`};
 expect((await fetch(url+path,{method:'POST',headers,body:'{}'})).status).toBe(400);expect(db.leadEmailJob.createMany).not.toHaveBeenCalled();
 const response=await fetch(url+path,{method:'POST',headers,body:JSON.stringify({name:'Customer',email:'customer@example.test',message:'Please repair my computer',notes:'PRIVATE'})});
 expect(response.status).toBe(201);expect(db.$transaction).toHaveBeenCalledOnce();expect(db.leadEmailJob.createMany).toHaveBeenCalledOnce();expect(JSON.stringify(db.leadEmailJob.createMany.mock.calls)).not.toContain('PRIVATE');
});

it('updates never enqueue and disabled settings do not queue creation',async()=>{
 const body={name:'Customer',email:'customer@example.test',message:'Please repair my computer'};
 const headers={'Content-Type':'application/json',Authorization:`Bearer ${token}`};
 db.lead.findUnique.mockResolvedValue({id:'lead1',status:'NEW'});db.lead.update.mockResolvedValue({id:'lead1',...body});
 expect((await fetch(url+'/api/crm/leads/lead1',{method:'PUT',headers,body:JSON.stringify(body)})).status).toBe(200);
 expect(db.leadEmailJob.createMany).not.toHaveBeenCalled();
 db.emailSettings.findUnique.mockResolvedValue(null);
 expect((await fetch(url+'/api/leads',{method:'POST',headers,body:JSON.stringify(body)})).status).toBe(201);
 expect(db.leadEmailJob.createMany).not.toHaveBeenCalled();
});
