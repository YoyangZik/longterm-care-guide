import AsyncStorage from '../reset/storage';
import { freshPreparation, parsePreparation, type Preparation } from './model';
export const preparationKey='care-diary:preparation:v1';
export const readPreparation=async()=>parsePreparation(await AsyncStorage.getItem(preparationKey));
export async function savePreparation(p:Preparation){const normalized=parsePreparation(JSON.stringify(p));await AsyncStorage.setItem(preparationKey,JSON.stringify(normalized));}
export const preparationRepository={read:readPreparation,save:savePreparation};
export function memoryPreparationRepository(){let value=freshPreparation();return {read:async()=>parsePreparation(JSON.stringify(value)),save:async(p:Preparation)=>{value=parsePreparation(JSON.stringify(p));}};}
