import express from 'express';
import {prisma} from '../db.ts';
import {authenticateToken, requireAdmin} from '../middleware/auth.ts';
import {encryptApiKey,decryptApiKey} from '../emailCrypto.ts';
const router=express.Router();
router.use(authenticateToken,requireAdmin);
const view=(s: {enabled:boolean;fromEmail:string;fromName:string;replyTo:string;apiKeyEncrypted:string|null}|null)=>({enabled:s?.enabled??false,fromEmail:s?.fromEmail??'',fromName:s?.fromName??'',replyTo:s?.replyTo??'',apiKeyConfigured:!!s?.apiKeyEncrypted});
router.get('/',async(_req,res)=>{try{res.json(view(await prisma.emailSettings.findUnique({where:{id:'default'}})));}catch{res.status(503).json({error:'Email settings unavailable'});}});
router.put('/',async(req,res)=>{
 try{
 const body=req.body;
 if(!body || typeof body!=='object' || Array.isArray(body)){res.status(400).json({error:'Invalid email settings'});return;}
 const {enabled,fromEmail,fromName,replyTo,apiKey,clearApiKey}=body;
 const safe=(s:unknown,max:number)=>typeof s==='string' && s.length<=max && !/[\x00-\x1f\x7f<>]/.test(s);
 const email=(s:string)=>/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(s);
 if(typeof enabled!=='boolean' || !safe(fromEmail,254) || !safe(fromName,100) || !safe(replyTo,254)
 || (fromEmail!=='' && !email(fromEmail)) || (enabled && !fromEmail) || (replyTo!=='' && !email(replyTo))
 || (clearApiKey!==undefined && typeof clearApiKey!=='boolean')
 || (apiKey!==undefined && (typeof apiKey!=='string' || /[\x00-\x1f\x7f]/.test(apiKey) || (apiKey.trim()!=='' && !/^re_[A-Za-z0-9_-]{8,200}$/.test(apiKey))))
 || (clearApiKey && apiKey?.trim())){res.status(400).json({error:'Invalid email settings'});return;}
 const data={enabled,fromEmail:fromEmail.trim(),fromName:fromName.trim(),replyTo:replyTo.trim(),...(clearApiKey?{apiKeyEncrypted:null}:apiKey?.trim()?{apiKeyEncrypted:encryptApiKey(apiKey)}:{})};
 const saved=await prisma.$transaction(async tx=>{
 await tx.$queryRaw`SELECT pg_advisory_xact_lock(741852964)::text`;
 if(enabled){
 const encrypted='apiKeyEncrypted' in data?data.apiKeyEncrypted:(await tx.emailSettings.findUnique({where:{id:'default'}}))?.apiKeyEncrypted;
 if(!encrypted)throw new Error('Email API key required');
 decryptApiKey(encrypted);
 }
 return tx.emailSettings.upsert({where:{id:'default'},create:{id:'default',...data},update:data});
 });
 res.json(view(saved));
 }catch(error){res.status(error instanceof Error && error.message==='Email API key required'?400:503).json({error:'Email settings could not be saved'});}
});
export default router;
