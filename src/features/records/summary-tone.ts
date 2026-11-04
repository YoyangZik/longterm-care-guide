// Applied only to known answer templates when creating a new summary.
// Stored originals and free-form details are never rewritten.
export const uncertainTemplates = [
 '어떤 도움을 드렸는지는 잘 기억나지 않는다.',
 '그 뒤 어떻게 되었는지는 잘 기억나지 않는다.',
 '그때의 구체적인 상황은 잘 기억나지 않는다.',
 '어떤 도움을 받으셨는지는 직접 보지 못했다.',
 '그 뒤 어떻게 되었는지는 직접 확인하지 못했다.',
 '그때의 구체적인 상황은 직접 확인하지 못했다.',
];
export function politeTemplate(text:string){
 return text.replace(/이었다\.$/,'이었어요.').replace(/셨다\.$/,'셨어요.').replace(/드렸다\.$/,'드렸어요.').replace(/봤다\.$/,'봤어요.').replace(/졌다\.$/,'졌어요.').replace(/했다\.$/,'했어요.').replace(/알렸다\.$/,'알렸어요.').replace(/었다\.$/,'었어요.').replace(/았다\.$/,'았어요.').replace(/않는다\.$/,'않아요.');
}
export function summaryAnswer(value:string,templates:string[]){
 // A whole answer must consist of selected templates; mixed/manual input stays verbatim.
 const lines=value.split('\n');
 return lines.every(line=>templates.includes(line)||uncertainTemplates.includes(line))?lines.map(politeTemplate).join('\n'):value;
}
