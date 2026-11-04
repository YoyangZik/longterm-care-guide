import type { SituationType } from '../records/situation-model';
const questions:[string,string,string,SituationType[]][]=[
 ['day','요즘 어르신은 하루를 어떻게 보내시나요?','주로 어디에서 무엇을 하며 지내시는지 편하게 떠올려보세요.',[]],
 ['support','평소에는 누가 곁에서 도와드리나요?','함께 지내는 분이나 자주 찾아와 돕는 분이 있는지 떠올려보세요.',[]],
 ['daily-help','하루 중 누군가의 손길이 필요한 때가 있나요?','혼자 하시는 일과 도움을 받으시는 일을 함께 떠올려보세요.',[]],
 ['standing','침대나 의자에서 일어나실 때는 어떠세요?','혼자 일어나시는지, 곁에서 지켜보거나 몸을 잡아드리는 때가 있는지 대답을 떠올려보세요.',['movement']],
 ['moving','집 안에서 다른 곳으로 가실 때는 어떻게 이동하세요?','혼자 이동하시는지, 보조기구를 쓰시는지, 누군가 도와드리는지 떠올려보세요.',['movement']],
 ['meal','식사를 차려드린 뒤, 드시는 동안에는 어떠세요?','혼자 드시는 부분과 곁에서 도와드리는 부분이 있는지 떠올려보세요.',['daily']],
 ['washing','세수나 양치를 하실 때는 어떠세요?','스스로 하시는지, 준비하거나 순서를 알려드리는 도움이 있는지 떠올려보세요.',['daily']],
 ['bathing','몸을 씻거나 목욕하실 때는 어떠세요?','혼자 씻으시는 부분과 직접 도와드리는 부분이 있는지 떠올려보세요.',['daily']],
 ['clothing','옷을 갈아입으실 때는 어떠세요?','옷을 고르거나 입고 벗는 동안 어떤 도움이 있는지 떠올려보세요.',['daily']],
 ['toilet','화장실을 이용하실 때는 어떠세요?','이동부터 옷 정리와 뒤처리까지 평소 모습을 떠올려보세요.',['daily']],
 ['memory','최근 있었던 일이나 해야 할 일을 기억하시는 건 어떠세요?','직접 보거나 들은 일이 있다면 그때 어떤 모습이었는지 떠올려보세요. 잘 모르셔도 괜찮아요.',['memory']],
 ['communication','말씀을 주고받거나 뜻을 전하실 때는 어떠세요?','말씀을 듣거나 이해하고 원하는 것을 표현하시는 평소 모습을 떠올려보세요.',['memory']],
 ['sleep','밤에 주무시거나 낮에 지내실 때, 곁에서 살펴야 하는 일이 있나요?','특별한 일이 없다면 그대로 이야기하시면 돼요. 있다면 어떤 때인지 떠올려보세요.',['behavior']],
 ['health','집에서 받고 계신 치료나 간호가 있나요?','알고 계신 치료나 실제로 받고 있는 도움만 떠올려보세요. 확인하려고 동작을 시험하실 필요는 없어요.',['health']],
 ['housework','약을 챙기거나 식사를 준비하는 일은 어떻게 하고 계세요?','누가 어떤 일을 맡고 있는지, 혼자 하시는 일은 무엇인지 떠올려보세요.',['health','daily','other']],
 ['closing','방문 때 꼭 전하고 싶은 이야기가 더 있나요?','상태가 달라지는 때나 평소 돌보며 기억에 남은 일을 떠올려보세요.',[]],
];
export const visitQuestions=questions.map(([id,title,hint,types])=>({id,title,hint,types}));
export type VisitProgress={position:string;completed:boolean};
export const initialVisitProgress=():VisitProgress=>({position:'intro',completed:false});
export function validVisitPosition(position:unknown){return typeof position==='string'&&(['intro','finish'].includes(position)||visitQuestions.some(q=>q.id===position));}
export function visitEntryLabel(progress?:VisitProgress){return progress?.completed?'다시 살펴보기':progress&&progress.position!=='intro'?'이어서 살펴보기':'방문조사 질문 살펴보기';}
export function moveVisit(progress:VisitProgress,direction:1|-1):VisitProgress{
 const positions=['intro',...visitQuestions.map(q=>q.id),'finish'];
 const current=positions.indexOf(progress.position);if(current<0)throw new Error('Invalid visit position');
 const position=positions[Math.max(0,Math.min(positions.length-1,current+direction))];
 return {position,completed:progress.completed||position==='finish'};
}
