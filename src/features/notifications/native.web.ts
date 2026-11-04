import type { Plan } from './planner';
export const supported=false;
export async function permission(_request=false){return false;}
export async function scheduled():Promise<{identifier:string}[]>{return [];}
export async function cancel(_id:string){}
export async function clearOwned(){}
export async function schedule(_plan:Plan){}
export function observe(_onTap:(kind:unknown,visitDate:unknown)=>void){return ()=>{};}
