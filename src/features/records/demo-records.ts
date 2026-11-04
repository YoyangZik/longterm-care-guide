import { localDate } from './time';
import { questionsFor, type SituationRecord, type SituationType } from './situation-model';

export const DEMO_PREFIX='demo-care-90-v1:';
// Fictional observations only. Never generated from personal records.
const cases:{type:SituationType;scenario?:string;event:string;difficulty:string;help:string;outcome:string}[]=[
 {type:'movement',event:'아침에 침대에서 일어나려 하셨어요.',difficulty:'몸이 옆으로 기울어 혼자 앉기 어려워하셨어요.',help:'팔과 등을 받쳐 침대 가장자리에 앉도록 도와드렸어요.',outcome:'잠시 앉아 쉰 뒤 일어나셨어요.'},
 {type:'daily',scenario:'meal',event:'점심에 밥과 생선 반찬을 드셨어요.',difficulty:'생선 가시를 골라내기 어려워하셨어요.',help:'가시를 발라 작은 접시에 담아드렸어요.',outcome:'숟가락은 직접 사용하셨어요.'},
 {type:'memory',event:'오후에 오늘이 무슨 요일인지 여러 번 물으셨어요.',difficulty:'달력에서 오늘 날짜를 찾기 어려워하셨어요.',help:'달력을 함께 보며 날짜에 표시해드렸어요.',outcome:'표시한 날짜를 손으로 짚어보셨어요.'},
 {type:'movement',event:'화장실로 가려고 거실에서 일어나셨어요.',difficulty:'문턱 앞에서 발을 떼지 못하고 멈추셨어요.',help:'한쪽 팔을 잡고 문턱을 넘을 때까지 곁에서 부축했어요.',outcome:'화장실 앞 의자에 앉아 쉬셨어요.'},
 {type:'daily',scenario:'toilet',event:'저녁에 화장실을 이용하셨어요.',difficulty:'앉고 일어날 때 바지 정리를 혼자 하기 어려워하셨어요.',help:'바지를 내리고 올리는 것을 도와드렸어요.',outcome:'손 씻기는 직접 하셨어요.'},
 {type:'behavior',event:'밤에 잠에서 깨서 거실로 나오셨어요.',difficulty:'방으로 돌아가기 싫다며 문 앞에 서 계셨어요.',help:'곁에 앉아 이야기를 듣고 방까지 함께 걸어갔어요.',outcome:'침대에 누운 것은 확인했지만 이후 잠든 시각은 보지 못했어요.'},
 {type:'health',event:'세수한 뒤 손등이 건조하다고 말씀하셨어요.',difficulty:'로션 뚜껑을 열기 어려워하셨어요.',help:'뚜껑을 열고 손바닥에 로션을 덜어드렸어요.',outcome:'양손에 바르는 것은 직접 하셨어요.'},
 {type:'daily',scenario:'washing',event:'아침에 세면대에서 양치를 하셨어요.',difficulty:'칫솔에 치약을 짜기 어려워하셨어요.',help:'치약을 짜드리고 물컵을 손이 닿는 곳에 놓았어요.',outcome:'양치와 헹구기는 직접 하셨어요.'},
 {type:'movement',event:'오후에 집 앞 복도를 걸으셨어요.',difficulty:'돌아오는 길에 다리가 힘들다고 하셨어요.',help:'팔을 부축하고 중간 의자에 앉아 쉬도록 도왔어요.',outcome:'쉬고 나서 집까지 함께 걸어왔어요.'},
 {type:'other',event:'오전에 옷장 앞에서 갈아입을 옷을 고르셨어요.',difficulty:'높은 칸에 있는 옷에 손이 닿지 않았어요.',help:'말씀하신 카디건을 꺼내 손에 건네드렸어요.',outcome:'입는 데에는 별도로 손을 보태지 않았어요.'},
 {type:'daily',scenario:'meal',event:'아침 식사로 죽을 드셨어요.',difficulty:'식사 도중 그릇이 자꾸 앞으로 밀렸어요.',help:'그릇 아래에 미끄럼 방지 받침을 놓고 위치를 가까이 옮겨드렸어요.',outcome:'죽은 직접 떠서 드셨어요.'},
 {type:'memory',event:'오전에 안경이 보이지 않는다고 하셨어요.',difficulty:'어디에 두었는지 기억나지 않는다고 말씀하셨어요.',help:'함께 거실과 침대 옆을 살펴 안경을 찾아드렸어요.',outcome:'앞으로 놓을 자리를 함께 정했어요.'},
 {type:'movement',event:'저녁에 의자에서 소파로 옮겨 앉으셨어요.',difficulty:'일어설 때 몸이 뒤로 쏠렸어요.',help:'등과 팔을 받치고 소파 앞까지 이동할 때 부축했어요.',outcome:'앉은 뒤에는 스스로 자세를 고치셨어요.'},
 {type:'daily',scenario:'washing',event:'오후에 머리를 감으셨어요.',difficulty:'샤워기를 든 채 머리를 헹구기 어려워하셨어요.',help:'샤워기를 잡고 머리 뒤쪽 거품을 헹궈드렸어요.',outcome:'수건으로 얼굴을 닦는 것은 직접 하셨어요.'},
 {type:'behavior',event:'해 질 무렵 현관에서 밖에 나가겠다고 하셨어요.',difficulty:'날이 어두워졌다는 설명 뒤에도 문을 열려고 하셨어요.',help:'옆에서 이야기를 듣고 거실에서 차를 함께 마시자고 안내했어요.',outcome:'거실에 앉아 한동안 대화를 나누셨어요.'},
 {type:'health',event:'오후에 발뒤꿈치가 불편하다고 말씀하셨어요.',difficulty:'양말을 벗고 발을 살펴보기 어려워하셨어요.',help:'양말을 벗겨드리고 발을 올려놓을 낮은 받침을 가져다드렸어요.',outcome:'불편한 이유는 확인하지 못했어요.'},
 {type:'daily',scenario:'toilet',event:'새벽에 화장실에 가겠다고 부르셨어요.',difficulty:'변기에서 일어날 때 손잡이를 찾으며 주저하셨어요.',help:'손잡이를 짚도록 안내하고 팔을 받쳐 일어나도록 도왔어요.',outcome:'방까지 돌아올 때도 곁에서 부축했어요.'},
 {type:'other',event:'오후에 가족에게 전화하고 싶다고 하셨어요.',difficulty:'전화기에서 원하는 연락처를 찾지 못하셨어요.',help:'연락처 화면을 열어 말씀하신 상대를 찾아 통화 버튼을 눌러드렸어요.',outcome:'통화는 직접 하셨어요.'},
];
export function makeDemoRecords(today=new Date()):SituationRecord[]{
 return Array.from({length:90},(_,index)=>{
  const day=new Date(today.getFullYear(),today.getMonth(),today.getDate()-89+index,0,0);
  const date=localDate(day),c=cases[(index*7)%cases.length];
  const stamp=day.toISOString(),method=index%3===0?'questions':'direct';
  const answers:Record<string,string>=method==='questions'?{event:c.event,difficulty:c.difficulty,help:c.help,outcome:c.outcome}:{};
  const body=`[기능 테스트용 가상 기록]\n${c.event} ${c.difficulty} ${c.help} ${c.outcome}`;
  return {version:2,id:DEMO_PREFIX+date,date,type:c.type,scenario:c.scenario??null,method,body,answers,questionSnapshot:method==='questions'?questionsFor(c.type,c.scenario??null,answers):[],cursor:0,step:'preview',status:'saved',createdAt:stamp,updatedAt:stamp,savedAt:stamp,revision:1,edited:method==='questions',generated:''};
 });
}
