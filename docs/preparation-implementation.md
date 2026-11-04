# 홈·단계별 준비 기능 · 2026-11-02

이번 승인 범위가 이전 추가 일지 정책·자리표시자 준비 화면보다 우선한다.

## 구현과 저장

- 1·3·4단계: 첫 진입은 한 화면에 질문 하나(신청 경험→필요시 목적 / 의사소견서 상태 / 받은 결과). 완료 뒤 맞춤 체크리스트 홈, 재접속은 홈 직행, 상황 수정은 관련 질문만 연다. 초기 안내 완료 `setup`과 항목 `status`는 별도다.
- 체크 영역과 상세 진입은 별도 접근성 이름·48 이상 터치 영역이다. 완료 항목을 흐리거나 취소선 처리하지 않는다. 기본/선택 항목 중 todo만 집계하며 na는 제외한다. 제외 목록에서 복원할 수 있다. 기본 준비는 앱의 정리 기준이며 법적 필수 서류 판정이 아니다.
- 메모·서류 상태·기한 편집, 직접 체크·해제, 출처 펼침과 외부 공식 안내가 연결됐다. 안내/질문/메모 저장은 항목을 자동 완료하지 않는다. 공단 처리와 사용자 표시를 구분한다. 준비 항목을 다 체크하지 않아도 1→2→3→4 이동 가능하다.
- 2단계 홈은 D-Day·오늘 기록 행동을 유지하고 방문 준비 목록으로 연결한다. 단계/날짜 자체를 누르는 조작, 기존 expo-symbols의 gearshape/settings 톱니, 기울임 없는 보조 D−N을 적용했다.
- 홈 기록 상태는 실제 확정/유효 초안에서 계산한다. 공백 초안 제외, 오늘 최신 수정 우선, 과거 제외, 확정 우선이다. focus/foreground/자정/저장·삭제 이벤트에서 갱신하고 로딩 중 잘못된 행동을 노출하지 않는다.
- 날짜별 새 시작·확정은 저장 트랜잭션에서도 보호한다. 하루 확정 후 추가 진입 제거. 과거 복수 일지와 초안은 삭제/병합하지 않는다. 이미 확정한 날짜의 다른 초안은 조회·삭제만 가능하고 기존 오탈자 정정은 유지한다.
- 준비는 별도 `care-diary:preparation:v1`에 저장한다. 목적/결과별 체크·메모를 다른 scope로 보존한다. 서류 상태와 기한은 단계 사이에 유지한다. 기존 키는 수정/초기화하지 않았다. 첫 실행 테스트는 준비도 메모리 저장소로 격리한다. 로컬 저장의 암호화·백업 한계는 기존과 같다.

## 공식 근거·적용 범위

확인일은 모두 **2026-11-02**. 생활법령 본문 기준일 **2026-10-15**, 법령은 현 시행 **2026-05-26**을 확인했고 11월 27일 시행 예정 본문을 현행으로 사용하지 않았다. 콘텐츠별 제목/본문/source URL/checkedOn은 content.ts에서 관리한다.

| 출처 | 적용 |
|---|---|
| [공단 인정 절차](https://www.longtermcare.or.kr/npbs/e/b/201/npeb201m01.web?menuId=npe0000000080) | 신청 방법·온라인 제한·갱신/변경 구분·방문 협의·판정 처리기간과 연장 |
| [생활법령 인정 신청](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?csmSeq=2038&ccfNo=2&cciNo=1&cnpClsNo=1&popMenu=ov) | 자격 조건, 대리/65세 미만 증빙, 신청서/소견서 구분 |
| [생활법령 인정 조사](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?csmSeq=2038&ccfNo=2&cciNo=1&cnpClsNo=2&popMenu=ov) | 조사 일시·장소 사전 안내. 앱 기록은 개인 참고자료라는 서비스 원칙과 함께 설명 |
| [생활법령 결과 수령](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?csmSeq=2038&ccfNo=2&cciNo=2&cnpClsNo=2&popMenu=ov) | 인정서·개인별장기요양이용계획서, 결과 사유·공식 문의 |
| [생활법령 기관 선택](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?csmSeq=2038&ccfNo=3&cciNo=2&cnpClsNo=1&popMenu=ov) | 공단 사이트 기관 정보 확인·상담 준비. 특정 이용 자격은 단정하지 않음 |
| [현 시행 법령](https://www.law.go.kr/LSW/lsInfoP.do?ancYnChk=0&chrClsCd=010202&efYd=20260526&lsiSeq=286217&urlMode=lsInfoP) | 제13조 소견서/제외 원칙, 제20·21조 갱신·변경, 제55조 심사청구 기한·예외 |

온라인 신청은 모두 가능하다고 일반화하지 않았다. 일반 문의 전화와 유선 갱신 접수를 구분했다. 앱이 면제 여부를 자동 판단하지 않으며 비용·결과일·자격·불복 결과를 예측하지 않는다. 개별 제출기한은 사용자에게 안내된 날짜만 입력한다. 기관 찾기는 공단 사이트 진입과 메뉴 안내이며 앱 내 기관 검색은 아니다.

## 검사·실행 결과

- 타입 검사·린트 통과. 초기 전체 50개 중 49개 통과 후, 새 정책과 충돌한 마지막 기존 테스트를 ‘과거 복수 데이터 보존’ 검사로 갱신했다. 변경 관련 최종 **16개 모두 통과**. 이미 통과한 나머지는 반복하지 않았다.
- 새 회귀 5개: 빈/과거/유효 초안, 삭제 후 상태, 동시 시작·중복 확정 거부, 과거 복수 데이터 유지, 목적별 필터/완료·메모 분리/NA복원, 저장 오류·손상 데이터 보존, 개발용 격리, 출처 메타정보.
- iOS Hermes 번들 생성 성공: .expo/preparation-bundle, 1,244모듈. node_modules 재설치 없음, CLI open.js 해시 유지.
- 실제 웹: 1단계 신청 경험→갱신 질문→맞춤 홈, 메모만 저장해도 체크 안 됨, 직접 체크·재실행 유지, NA·복원, 1→2→3→4 이동, 방문 전 소견서 제출 상태 유지, 기한 선택·저장, 결과 변경 후 다른 목록, 재접속 시 초기 질문 생략 확인.
- 실제 웹: 빈 기록을 열고 나와도 작성하기 유지 → 가상 답변 후 이어쓰기 → 확정 후 오늘 기록 보기, 추가 버튼 0개 확인. 공식 안내 버튼에서 국가법령정보센터가 별도 페이지로 열렸다.
- 실행 중 단계 변경과 리다이렉트가 중복되던 전환을 수정하고 3·4단계 이동을 재검증했다.
- 미검증: 실기기 키보드·시스템 글자 확대·네이티브 제스처, OS 외부 링크 열기 실패 상황. 저장 오류/데이터 삭제/동시 확정은 자동 검사로 검증했다. 기존 실제 사용자 데이터를 삭제해서 시험하지 않았다.

## 변경 파일

- 준비: features/preparation/{model,storage,provider,content,questions-screen,checklist,detail-screen}, app/preparation.tsx, preparation-question.tsx, preparation-detail.tsx, guide.tsx.
- 연결: features/home/home-screen.tsx, features/start/first-run-test.tsx, app/_layout.tsx, components/brand-visuals.tsx, month-grid.tsx.
- 기록 정책: features/records/{policy,presentation,storage,records-screen,draft-list,draft-review,record-calendar}.
- 검사: tests/preparation-policy.test.cjs, daily-flow.test.cjs, records.test.cjs. 기획/진행 문서 갱신. 스크린샷 screenshots/preparation-home.jpg는 웹 가상 데이터 예시다.

휴대폰은 전체 Reload 후 단계 선택 → 최초 질문 → 체크·상세 메모·완료·NA복원 → 앱 재실행 → 다음 단계 이동 순서로 확인한다.
