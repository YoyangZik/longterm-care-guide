import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { usePreventRemove, useFocusEffect } from 'expo-router';
import { createExitGate } from './exit-gate';
type Options = { enabled: boolean; save: () => Promise<void>; leave: () => void; discard?: () => void; cancelPending?: () => void; leavesRoute?: boolean };
export function useSafeExit({ enabled, save, leave, discard, cancelPending, leavesRoute = false }: Options) {
  const gate = useRef(createExitGate());
  const [saving, setSaving] = useState(false);
  const [allowRemoval, setAllowRemoval] = useState(false);
  const [failed, setFailed] = useState(false);
  const [focused,setFocused]=useState(false);
  useFocusEffect(useCallback(()=>{setFocused(true);return()=>setFocused(false);},[]));
  const requestRef = useRef<() => void>(() => {});
  const disable = usePreventRemove(enabled && focused && !allowRemoval, () => requestRef.current());
  const finish = useCallback(() => { if (leavesRoute) { setAllowRemoval(true); disable(); } leave(); }, [disable, leave, leavesRoute]);
  const request = useCallback(async () => {
    cancelPending?.();
    setSaving(true);
    const result = await gate.current.attempt(save, finish);
    if (result === false) setFailed(true);
    if (result !== null) setSaving(false);
  }, [cancelPending, save, finish]);
  useEffect(() => { requestRef.current = () => { void request(); }; }, [request]);
  useEffect(() => {
    if (!enabled || !focused) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { void request(); return true; });
    return () => subscription.remove();
  }, [enabled, focused, request]);
  return { finishSaved: (navigate:()=>void) => { setAllowRemoval(true); disable(); navigate(); }, request, saving, failed, blocked: saving || failed,
    keepEditing: () => setFailed(false),
    discard: () => { cancelPending?.(); discard?.(); setFailed(false); finish(); },
  };
}
