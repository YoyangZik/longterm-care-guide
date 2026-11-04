// Narrow guards for high-risk additions, NOT an exact-text/word-overlap score.
// These checks do not prove complete semantic faithfulness; the prompt and
// the visible original remain essential, including for negation and inference.
const medicalGroups=[
 /치매/u,/알츠하이머/u,/파킨슨/u,/우울증/u,/뇌졸중/u,/뇌경색/u,/뇌출혈/u,
 /인지\s*(?:기능\s*)?저하/u,/식욕\s*부진/u,/연하\s*장애/u,/편마비/u,/섬망/u,
];
const assistanceGroups=[
 /전적(?:인)?\s*(?:도움|보조|부축)|완전(?:한)?\s*(?:도움|보조|부축)|모든\s*동작을?\s*(?:도와|대신)/u,
 /24\s*시간\s*(?:돌봄|간병|도움)|하루\s*종일\s*(?:돌봄|간병)/u,
];
const frequencyGroups=[/매일|날마다|하루도 빠짐없이/u,/항상|늘\s|언제나/u];
const countWords={'한':1,'하나':1,'일':1,'두':2,'둘':2,'이':2,'세':3,'셋':3,'삼':3,'네':4,'넷':4,'사':4,'다섯':5,'오':5,'여섯':6,'육':6,'일곱':7,'칠':7,'여덟':8,'팔':8,'아홉':9,'구':9,'열':10,'십':10};
function numberValue(word){
 if(/^\d/u.test(word))return Number(word);
 if(countWords[word]!==undefined)return countWords[word];
 for(const [prefix,value] of [['스물',20],['스무',20],['서른',30],['마흔',40],['쉰',50],['예순',60],['일흔',70],['여든',80],['아흔',90],['열',10]])if(word.startsWith(prefix)){const rest=word.slice(prefix.length);return value+(rest?countWords[rest]??NaN:0);}
 let total=0,digit=0;
 for(const c of word){const unit={십:10,백:100,천:1000}[c];if(unit){total+=(digit||1)*unit;digit=0;}else digit=countWords[c]??NaN;}
 return total+digit;
}
function counts(text){
 const found=new Set();
 const pattern=/(\d+(?:\.\d+)?|(?:스물|스무|서른|마흔|쉰|예순|일흔|여든|아흔|열)(?:다섯|여섯|일곱|여덟|아홉|한|두|세|네)?|다섯|여섯|일곱|여덟|아홉|하나|둘|셋|넷|한|두|세|네|[일이삼사오육칠팔구십백천]+)\s*(번|회|차례|시간|분|초|퍼센트|%)/gu;
 for(const m of text.matchAll(pattern)){
  // Do not read the suffix of ordinary words (e.g. '이번', '지난 시간') as a number.
  const before=text.slice(0,m.index).at(-1);if(!/^\d/u.test(m[1])&&before&&/[가-힣\d]/u.test(before))continue;
  let amount=numberValue(m[1]);
  if(m[2]==='시간'&&/^\s*반/u.test(text.slice(m.index+m[0].length)))amount+=0.5;
  let unit=['번','회','차례'].includes(m[2])?'count':m[2]==='퍼센트'?'%':m[2];
  if(['시간','분','초'].includes(unit)){amount*=unit==='시간'?3600:unit==='분'?60:1;unit='seconds';}
  found.add(amount+':'+unit);
 }
 if(/반\s*시간/u.test(text))found.add('1800:seconds');
 if(/절반|반\s*(?:정도|가량)/u.test(text))found.add('50:%');
 return found;
}
export function hasRepeatedObservation(records){
 const source=records.map(record=>record.body).join('\n');
 return /반복|자주|자꾸|여러\s*(?:번|차례)|수차례|거듭|매일|날마다|항상/u.test(source)||[...counts(source)].some(count=>count.endsWith(':count')&&Number(count.split(':')[0])>=2);
}
export function validateSummaryEvidence(summary,records){
 const source=records.map(r=>r.body).join('\n');
 for(const group of medicalGroups)if(group.test(summary)&&!group.test(source))throw new Error('unsupported-medical-claim');
 for(const group of assistanceGroups)if(group.test(summary)&&!group.test(source))throw new Error('unsupported-assistance-claim');
 for(const group of frequencyGroups)if(group.test(summary)&&!group.test(source))throw new Error('unsupported-frequency-claim');
 const knownCounts=counts(source);for(const count of counts(summary))if(!knownCounts.has(count))throw new Error('unsupported-count-claim');
 if(/(?:장기요양\s*)?[1-5일이삼사오]\s*등급[^.!?]*(?:예상|예측|받을\s*수|가능성이)/u.test(summary))throw new Error('unsupported-grade-claim');
 return summary;
}
