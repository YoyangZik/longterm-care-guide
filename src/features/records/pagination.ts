export function recordPage<T>(records:T[],requested:number,size=10){
 const pages=Math.max(1,Math.ceil(records.length/size));
 const page=Math.min(Math.max(0,requested),pages-1);
 return {page,pages,items:records.slice(page*size,(page+1)*size)};
}
