import AsyncStorage from '../reset/storage';
const key = 'care-diary:onboarding-completed:v1';
export const readCompletion = async () => (await AsyncStorage.getItem(key)) === 'true';
export const saveCompletion = () => AsyncStorage.setItem(key, 'true');
