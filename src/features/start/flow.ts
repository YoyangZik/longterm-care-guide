import type { StageId } from '@/features/trial/stages';
export function startDestination(onboarded: boolean, stage: StageId | null): '/' | '/stage' | '/home' {
  return !onboarded ? '/' : stage ? '/home' : '/stage';
}
