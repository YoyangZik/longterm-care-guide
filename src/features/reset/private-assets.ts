import { Directory, Paths } from 'expo-file-system';
import { clearCode } from '../records/ai-credentials';

// Only the app-owned PDF directory is removed. User-picked/shared locations
// are outside this boundary and must never be recursively traversed.
export async function clearPrivateAssets(){
 await clearCode('care-diary-ai-access');
 const reports=new Directory(Paths.document,'reports');
 if(reports.exists)reports.delete();
}
