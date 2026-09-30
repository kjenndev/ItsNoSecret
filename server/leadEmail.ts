import type {Prisma,Lead} from '../src/generated/prisma/client.ts';
export async function enqueueLeadEmail(tx:Prisma.TransactionClient,lead:Lead){
 const settings=await tx.emailSettings.findUnique({where:{id:'default'}});
 if(!settings?.enabled || !settings.apiKeyEncrypted)return;
 const admins=await tx.user.findMany({where:{isActive:true,roles:{has:'ADMIN'}},select:{email:true}});
 const recipients=[...new Set(admins.map(a=>a.email.trim().toLowerCase()))].filter(email=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email));
 const text=[`Name: ${lead.name}`,`Source: ${lead.source}`,`Service: ${lead.serviceNeed??''}`,`Email: ${lead.email??''}`,`Phone: ${lead.phone??''}`,`Preferred contact: ${lead.preferredContact??''}`,`Message: ${lead.message}`].join('\n');
 if(recipients.length)await tx.leadEmailJob.createMany({data:recipients.map(recipient=>({leadId:lead.id,recipient,payload:{from:settings.fromName?`${settings.fromName} <${settings.fromEmail}>`:settings.fromEmail,to:[recipient],subject:'New lead notification',text,...(settings.replyTo?{reply_to:settings.replyTo}:{})}}))});
}

import {prisma} from './db.ts';
import {decryptApiKey} from './emailCrypto.ts';
import type {LeadEmailJob} from '../src/generated/prisma/client.ts';
// A transaction-scoped global lock serializes workers, including overlapping processes.
// Frozen payload + stable provider key makes a commit failure safe to retry.
export async function deliverNextLeadEmail(db=prisma,send:typeof fetch=fetch){
 return db.$transaction(async tx=>{
 const jobs=await tx.$queryRaw<LeadEmailJob[]>`SELECT * FROM "LeadEmailJob" WHERE status = 'PENDING' AND "nextAttemptAt" <= (NOW() AT TIME ZONE 'UTC') AND pg_try_advisory_xact_lock(741852963) ORDER BY "createdAt", id LIMIT 1 FOR UPDATE SKIP LOCKED`;
 const job=jobs[0];if(!job)return false;
 // Resend limits are shared across the team, not just one recipient/job.
 if(await tx.leadEmailJob.findFirst({where:{lastStatus:'rate_limited',nextAttemptAt:{gt:new Date()}},select:{id:true}}))return false;
 const settings=await tx.emailSettings.findUnique({where:{id:'default'}});
 const recipient=await tx.user.findFirst({where:{email:{equals:job.recipient,mode:'insensitive'},isActive:true,roles:{has:'ADMIN'}},select:{id:true}});
 const now=Date.now();
 const finish=async(status:string,lastStatus:string,delay=0)=>{
 await tx.leadEmailJob.update({where:{id:job.id},data:{status,lastStatus,attempts:job.attempts+1,firstAttemptAt:job.firstAttemptAt??new Date(now),nextAttemptAt:new Date(now+delay)}});return true;
 };
 if(!settings?.enabled || !settings.apiKeyEncrypted || !recipient)return finish('CANCELLED','disabled_or_ineligible');
 // Use creation time, not first attempt: even a crash before commit cannot reset the window.
 if(now-job.createdAt.getTime()>=23*3600000 || job.attempts>=7)return finish('FAILED','retry_limit');
 const retry=(reason:string,delay=0)=>finish(job.attempts>=6?'FAILED':'PENDING',reason,Math.max(delay,Math.min(3600000,30000*2**job.attempts)));
 let key:string;try{key=decryptApiKey(settings.apiKeyEncrypted);}catch{return retry('configuration_unavailable');}
 try{
 const response=await send('https://api.resend.com/emails',{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`lead-email/${job.id}`},body:JSON.stringify(job.payload),signal:AbortSignal.timeout(5000)});
 if(response.ok){await response.body?.cancel();return finish('SENT','sent');}
 let concurrent=false;
 if(response.status===409){
 // Inspect only the documented code; never store/log the response or its message.
 const data=await response.json().catch(()=>null);concurrent=data?.name==='concurrent_idempotent_requests';
 }else await response.body?.cancel();
 if(response.status===429 || response.status>=500 || concurrent){
 const seconds=Number(response.headers.get('Retry-After'));
 return retry(response.status===429?'rate_limited':'provider_unavailable',Number.isFinite(seconds)&&seconds>0?Math.min(seconds*1000,23*3600000):0);
 }
 return finish('FAILED','provider_rejected');
 }catch{return retry('provider_unavailable');}

 },{timeout:15000});
}
