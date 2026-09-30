// @vitest-environment node
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import {randomBytes} from 'node:crypto';
const db = vi.hoisted(() => ({$transaction:vi.fn(),$queryRaw:vi.fn(),user:{findUnique:vi.fn()},emailSettings:{findUnique:vi.fn(),upsert:vi.fn()}}));
vi.mock('./db.ts',()=>({prisma:db}));
let server: ReturnType<express.Express['listen']>; let url:string; let token:string;
beforeEach(async()=>{
 vi.stubEnv('JWT_SECRET',randomBytes(32).toString('hex'));
 db.user.findUnique.mockResolvedValue({id:'admin',roles:['ADMIN'],isActive:true,tokenVersion:0});
 db.emailSettings.findUnique.mockResolvedValue(null);db.$transaction.mockImplementation(async fn=>fn(db));
 const {default:router}=await import('./routes/emailSettings.ts');
 const app=express();app.use(express.json());app.use('/api/settings/email',router);
 server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));
 url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/settings/email`;
 token=jwt.sign({userId:'admin',tokenVersion:0},process.env.JWT_SECRET!);
});
afterEach(async()=>{if(server) await new Promise<void>(r=>server.close(()=>r()));vi.resetAllMocks();vi.resetModules();vi.unstubAllEnvs();});
async function request(body?:unknown,auth=true){return fetch(url,{method:body?'PUT':'GET',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});}
it('returns disabled defaults only to a current active administrator',async()=>{
 expect((await request(undefined,false)).status).toBe(401);
 db.user.findUnique.mockResolvedValueOnce({roles:['TECHNICIAN'],isActive:true,tokenVersion:0});expect((await request()).status).toBe(403);
 db.user.findUnique.mockResolvedValueOnce({roles:['ADMIN'],isActive:false,tokenVersion:0});expect((await request()).status).toBe(401);
 expect(await (await request()).json()).toEqual({enabled:false,fromEmail:'',fromName:'',replyTo:'',apiKeyConfigured:false});
});


const input={enabled:true,fromEmail:'sender@example.test',fromName:'Service',replyTo:'reply@example.test'};
it('encrypts a new key and never returns it',async()=>{
 vi.stubEnv('EMAIL_SETTINGS_ENCRYPTION_KEY',randomBytes(32).toString('base64'));
 db.emailSettings.upsert.mockImplementation(async({create})=>create);
 const response=await request({...input,apiKey:'re_testSecret123456789'});
 expect(response.status).toBe(200);
 expect(await response.json()).toEqual({...input,apiKeyConfigured:true});
 const stored=db.emailSettings.upsert.mock.calls[0][0].create.apiKeyEncrypted;
 expect(stored).not.toContain('re_testSecret');
 const {decryptApiKey}=await import('./emailCrypto.ts');expect(decryptApiKey(stored)).toBe('re_testSecret123456789');
});

it('validates fields, preserves blank keys, supports explicit clearing and fails closed',async()=>{
 db.emailSettings.upsert.mockImplementation(async({create})=>create);
 for(const change of [{fromEmail:'x\r\nBcc: a@b.co'},{replyTo:'bad'},{fromName:'x\n'},{apiKey:'bad'},{enabled:'true'},{apiKey:42},{clearApiKey:'true'}]){
 expect((await request({...input,...change})).status).toBe(400);
 }
 expect(db.emailSettings.upsert).not.toHaveBeenCalled();
 expect((await request({...input,apiKey:'re_testSecret123456789'})).status).toBe(503);
 expect(db.emailSettings.upsert).not.toHaveBeenCalled();
 expect((await request({...input,enabled:false,apiKey:'   '})).status).toBe(200);
 expect(db.emailSettings.upsert.mock.calls.at(-1)![0].update).not.toHaveProperty('apiKeyEncrypted');
 expect((await request({...input,enabled:false,clearApiKey:true})).status).toBe(200);
 expect(db.emailSettings.upsert.mock.calls.at(-1)![0].update.apiKeyEncrypted).toBeNull();
});

it('PUT uses current-account admin authorization and masks existing ciphertext',async()=>{
 db.emailSettings.findUnique.mockResolvedValue({...input,apiKeyEncrypted:'ciphertext'});
 expect(await(await request()).json()).toEqual({...input,apiKeyConfigured:true});
 db.user.findUnique.mockResolvedValueOnce({roles:['CLIENT'],isActive:true,tokenVersion:0});expect((await request(input)).status).toBe(403);
 db.user.findUnique.mockResolvedValueOnce({roles:['ADMIN'],isActive:false,tokenVersion:0});expect((await request(input)).status).toBe(401);
 expect(db.emailSettings.upsert).not.toHaveBeenCalled();
});

it('cannot enable without a usable key, but can always disable broken configuration',async()=>{
 db.emailSettings.upsert.mockImplementation(async({create})=>create);
 expect((await request(input)).status).toBe(400);
 expect((await request({...input,clearApiKey:true})).status).toBe(400);
 db.emailSettings.findUnique.mockResolvedValue({...input,apiKeyEncrypted:'broken'});
 expect((await request(input)).status).toBe(503);
 expect((await request({...input,enabled:false})).status).toBe(200);
 vi.stubEnv('EMAIL_SETTINGS_ENCRYPTION_KEY',randomBytes(32).toString('base64'));
 const {encryptApiKey}=await import('./emailCrypto.ts');db.emailSettings.findUnique.mockResolvedValue({...input,apiKeyEncrypted:encryptApiKey('re_testSecret123456789')});
 expect((await request({...input,apiKey:''})).status).toBe(200);
});

it('awaits a Prisma-compatible transaction advisory lock before reading or saving settings',async()=>{
 vi.stubEnv('EMAIL_SETTINGS_ENCRYPTION_KEY',randomBytes(32).toString('base64'));
 const {encryptApiKey}=await import('./emailCrypto.ts');
 db.emailSettings.findUnique.mockResolvedValue({...input,apiKeyEncrypted:encryptApiKey('re_testSecret123456789')});
 db.emailSettings.upsert.mockImplementation(async({create})=>create);
 let release!:()=>void;
 let acquired!:()=>void;
 const started=new Promise<void>(resolve=>{acquired=resolve;});
 const barrier=new Promise<void>(resolve=>{release=resolve;});
 db.$queryRaw.mockImplementation(async()=>{acquired();await barrier;return [{pg_advisory_xact_lock:''}];});
 const pending=request({...input,apiKey:''});
 await started;
 try{
 expect(db.emailSettings.findUnique).not.toHaveBeenCalled();
 expect(db.emailSettings.upsert).not.toHaveBeenCalled();
 }finally{release();}
 const response=await pending;
 expect(response.status).toBe(200);
 expect(db.$queryRaw).toHaveBeenCalledExactlyOnceWith(['SELECT pg_advisory_xact_lock(741852964)::text']);
 expect(db.emailSettings.findUnique).toHaveBeenCalledOnce();
 expect(db.emailSettings.upsert).toHaveBeenCalledOnce();
 expect(db.emailSettings.upsert.mock.calls[0][0].update).not.toHaveProperty('apiKeyEncrypted');
});
