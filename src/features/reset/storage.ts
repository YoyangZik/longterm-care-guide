import rawStorage from '@react-native-async-storage/async-storage';
import { dataTask } from './gate';
export { rawStorage };
// All app persistence goes through this gate; the reset journal uses rawStorage.
const storage={
 getItem:(key:string)=>dataTask(()=>rawStorage.getItem(key)),
 setItem:(key:string,value:string)=>dataTask(()=>rawStorage.setItem(key,value)),
};
export default storage;
