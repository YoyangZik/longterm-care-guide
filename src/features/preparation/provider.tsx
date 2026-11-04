import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { freshPreparation, parsePreparation, type Preparation } from './model';
import { preparationRepository, memoryPreparationRepository } from './storage';
import { dataGeneration, dataTask } from '../reset/gate';
import type { SurveyReturn } from './initial-survey-return';
type Context = { data:Preparation; loaded:boolean; error:boolean; reload:()=>void; update:(change:(p:Preparation)=>Preparation)=>Promise<void>;surveyReturn:SurveyReturn|null;rememberSurveyReturn:(target:SurveyReturn)=>void;clearSurveyReturn:()=>void;recordHint:boolean;showRecordHint:()=>void;dismissRecordHint:()=>void };
const PreparationContext=createContext<Context|null>(null);
export function PreparationProvider({children,testing}:{children:ReactNode;testing:boolean}) {
  const [data,setData]=useState(freshPreparation);const [loaded,setLoaded]=useState(false);const [error,setError]=useState(false);
  // Only this first-run session can return; never replay the offer after restart.
  const [surveyReturn,rememberSurveyReturn]=useState<SurveyReturn|null>(null);
  const clearSurveyReturn=useCallback(()=>rememberSurveyReturn(null),[]);
  const [recordHint,setRecordHint]=useState(false);
  const showRecordHint=useCallback(()=>setRecordHint(true),[]);
  const dismissRecordHint=useCallback(()=>setRecordHint(false),[]);
  const [repository]=useState(()=>{const base=testing?memoryPreparationRepository():preparationRepository;const token=dataGeneration();return {read:()=>dataTask(()=>base.read(),token),save:(p:Preparation)=>dataTask(()=>base.save(p),token)};});
  const current=useRef<Preparation|null>(null);const queue=useRef<Promise<unknown>>(Promise.resolve());
  const load=useCallback(()=>{let live=true;void repository.read().then(p=>{if(live){current.current=p;setData(p);setLoaded(true);setError(false);}}).catch(()=>{if(live)setError(true);});return()=>{live=false;};},[repository]);
  useEffect(load,[load]);
  const update=useCallback((change:(p:Preparation)=>Preparation)=>{const operation=queue.current.then(async()=>{if(!current.current)throw new Error('Preparation not loaded');const next=parsePreparation(JSON.stringify(change(current.current)));await repository.save(next);current.current=next;setData(next);});queue.current=operation.catch(()=>{});return operation;},[repository]);
  return <PreparationContext.Provider value={{data,loaded,error,reload:()=>{load();},update,surveyReturn,rememberSurveyReturn,clearSurveyReturn,recordHint,showRecordHint,dismissRecordHint}}>{children}</PreparationContext.Provider>;
}
export function usePreparation(){const p=useContext(PreparationContext);if(!p)throw new Error('PreparationProvider required');return p;}
