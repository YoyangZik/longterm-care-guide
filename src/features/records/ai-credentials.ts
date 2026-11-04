import * as SecureStore from 'expo-secure-store';
export const setCode=(key:string,value:string)=>SecureStore.setItemAsync(key,value);
export const getCode=(key:string)=>SecureStore.getItemAsync(key);
export const clearCode=(key:string)=>SecureStore.deleteItemAsync(key);
