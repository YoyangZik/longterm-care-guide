import {randomBytes,createHash} from 'node:crypto';
const token=randomBytes(32).toString('hex');
console.log('개인 기기에 입력할 접근 코드 (안전하게 전달하고 공유하지 마세요):\n'+token);
console.log('Workers ACCESS_TOKEN_HASHES Secret에 등록할 SHA-256:\n'+createHash('sha256').update(token).digest('hex'));
