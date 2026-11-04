import { Redirect } from 'expo-router';
import { useStart } from '@/features/start/provider';
export default function LegacyEntry(){const {stage}=useStart();return <Redirect href={stage?'/home':'/stage'}/>;}
