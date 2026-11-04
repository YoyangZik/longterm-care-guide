const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
function uiFixture(stubs={}){
 const slots=[],effects=[],focus=[],cache=new Map();let cursor=0,mounted=false;
 const jsx=(type,props)=>({type,props});
 const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useCallback:fn=>fn,useEffect(fn){if(!mounted)effects.push(fn);}};
 const mocks={'react':react,'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{Text:'Text',View:'View',Pressable:'Pressable',TextInput:'TextInput',ScrollView:'ScrollView',ActivityIndicator:'ActivityIndicator',KeyboardAvoidingView:'KeyboardAvoidingView',Platform:{OS:'ios'},AppState:{addEventListener:()=>({remove(){}})}},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'expo-router':{Stack:{Screen:'Screen'},router:{},useFocusEffect:fn=>{if(!mounted)focus.push(fn);}},'@/design/styles':{colors:{green:'green',pale:'pale'},styles:{}},'@/components/navigation/app-header':{AppHeader:'AppHeader',ExitFailureDialog:'ExitFailureDialog'},'@/components/navigation/overflow-menu':{InfoDialog:'InfoDialog',OverflowMenu:'OverflowMenu'},'@/components/brand-visuals':{BrandIcon:'BrandIcon'},'@/components/action-controls':{SubtleButton:'SubtleButton'},'@/components/month-grid':{MonthGrid:'MonthGrid'},'./ui':{Action:'Action'},...stubs};
 if(!Object.hasOwn(mocks,'@react-native-async-storage/async-storage'))mocks['@react-native-async-storage/async-storage']={getItem:async()=>null,setItem:async()=>{}};
 function load(relative){const file=path.resolve(root,relative);if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const requireLocal=id=>{if(Object.hasOwn(mocks,id))return mocks[id];const target=id.startsWith('@/')?path.join(root,'src',id.slice(2)):path.resolve(path.dirname(file),id);return load(fs.existsSync(target+'.ts')?target+'.ts':target+'.tsx');};
  new Function('require','module','exports',source)(requireLocal,mod,mod.exports);return mod.exports;
 }
 return {load,draw(fn,props){cursor=0;return fn(props);},mount(){mounted=true;return [...effects,...focus].map(fn=>fn());}};
}
function nodes(node,result=[]){if(Array.isArray(node)){node.forEach(item=>nodes(item,result));return result;}if(!node||typeof node!=='object')return result;result.push(node);nodes(node.props?.children,result);return result;}
module.exports={uiFixture,nodes};
