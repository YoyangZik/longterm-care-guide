// A web credential lives only in memory and is never persisted in browser storage.
let code:string|null=null;
export async function setCode(_key:string,value:string){code=value;}
export async function getCode(_key:string){return code;}
export async function clearCode(_key:string){code=null;}
