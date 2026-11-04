import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { freshPreparation, parsePreparation, type Preparation } from './model';
import { preparationRepository, memoryPreparationRepository } from './storage';
import { dataGeneration, dataTask } from '../reset/gate';
type Context = { data:Preparation; loaded:boolean; error:boolean; reload:()=>void; update:(change:(p:Preparation)=>Preparation)=>Promise<void> };
const PreparationContext=createContext<Context|null>(null);
export function PreparationProvider({children,testing}:{children:ReactNode;testing:boolean}) {
  const [data,setData]=useState(freshPreparation);const [loaded,setLoaded]=useState(false);const [error,setError]=useState(false);
  const [repository]=useState(()=>{const base=testing?memoryPreparationRepository():preparationRepository;const token=dataGeneration();return {read:()=>dataTask(()=>base.read(),token),save:(p:Preparation)=>dataTask(()=>base.save(p),token)};});
  const current=useRef<Preparation|null>(null);const queue=useRef<Promise<unknown>>(Promise.resolve());
  const load=useCallback(()=>{let live=true;void repository.read().then(p=>{if(live){current.current=p;setData(p);setLoaded(true);setError(false);}}).catch(()=>{if(live)setError(true);});return()=>{live=false;};},[repository]);
  useEffect(load,[load]);
  const update=useCallback((change:(p:Preparation)=>Preparation)=>{const operation=queue.current.then(async()=>{if(!current.current)throw new Error('Preparation not loaded');const next=parsePreparation(JSON.stringify(change(current.current)));await repository.save(next);current.current=next;setData(next);});queue.current=operation.catch(()=>{});return operation;},[repository]);
  return <PreparationContext.Provider value={{data,loaded,error,reload:()=>{load();},update}}>{children}</PreparationContext.Provider>;
}
export function usePreparation(){const p=useContext(PreparationContext);if(!p)throw new Error('PreparationProvider required');return p;}
