import {deliverNextLeadEmail} from './leadEmail.ts';
let running=false;
let timer:ReturnType<typeof setTimeout>|undefined;
let inFlight:Promise<unknown>|undefined;
export function startEmailWorker(){
 if(running)return;running=true;
 const schedule=()=>{if(running){timer=setTimeout(tick,1000);timer.unref();}};
 const tick=()=>{
 // Database/provider failures never escape to HTTP or log secrets. Durable rows remain retryable.
 inFlight=deliverNextLeadEmail().catch(()=>undefined).finally(()=>{inFlight=undefined;schedule();});
 };
 schedule();
}
export async function stopEmailWorker(){running=false;clearTimeout(timer);await inFlight;}
