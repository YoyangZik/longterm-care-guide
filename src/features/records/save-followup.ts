// Saving the original has already succeeded. Notification failures cannot undo it.
export async function refreshAfterSave(refresh:()=>Promise<boolean|void>){
 try{return await refresh()!==false;}catch{return false;}
}
