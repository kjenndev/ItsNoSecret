import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
function key(){
 const value=process.env.EMAIL_SETTINGS_ENCRYPTION_KEY??'';
 const decoded=Buffer.from(value,'base64');
 if(decoded.length!==32 || decoded.toString('base64')!==value) throw new Error('Email encryption unavailable');
 return decoded;
}
export function encryptApiKey(value:string){
 const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key(),iv);
 const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return ['v1',iv.toString('base64'),cipher.getAuthTag().toString('base64'),encrypted.toString('base64')].join('.');
}
export function decryptApiKey(value:string){
 const [version,iv,tag,data]=value.split('.');if(version!=='v1')throw new Error('Email encryption unavailable');
 const cipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64'));cipher.setAuthTag(Buffer.from(tag,'base64'));
 return Buffer.concat([cipher.update(Buffer.from(data,'base64')),cipher.final()]).toString('utf8');
}
