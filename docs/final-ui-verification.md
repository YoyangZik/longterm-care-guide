# 최종 UI 정정 검증 · 2026-11-02

이 문서와 PROJECT_BRIEF.md의 최종 정정이 이전 UX 검증의 더보기·밑줄·문구 규칙보다 우선한다. 실제 AI·음성·서버·알림은 추가하지 않았다.

## 구현

- 홈 단계 옆 수정 아이콘 → 단계 선택, 날짜 알려주기·일정 수정 아이콘 → 방문 일정으로 직접 이동한다. 중간 행동 팝업은 제거했다. 수정 아이콘의 터치 영역은 48×48이고 접근성 이름을 제공한다.
- 일정 등록·수정은 2단계에서만 보인다. 준비 화면과 직접 라우트도 같은 정책을 적용한다. 다른 단계로 바꿔도 저장한 일정은 유지한다.
- 두 달력은 같은 MonthGrid를 사용한다. 주마다 7개 셀을 유지하고 빈칸도 같은 너비다. 선택은 청록 원·흰 숫자, 오늘은 미선택일 때 얇은 원 테두리다. 오늘을 선택하면 선택 표시가 우선한다. 밑줄·선택됨 문구·아래 날짜 반복을 없앴다. 기록 표시는 원 아래에 둔다.
- 날짜 터치 영역 최소 48, 숫자 18을 유지한다. 글자 확대에 맞춰 원과 열 너비가 증가하며 좁은 화면에서는 달력 가로 스크롤을 사용한다.
- 방문 일정은 화면 안의 임시 선택만 바꾸며 완료 후 저장 성공을 기다린다. 완료 전 뒤로 나가면 기존 일정으로 돌아간다. 이전 저장 형식·임시 필드는 삭제/마이그레이션하지 않으며 취소한 선택은 다시 적용하지 않는다. 시간은 선택 사항, 아직 정해지지 않았어요 동작도 유지한다.
- 공통 버튼은 최소 높이 56·모서리 16·글씨 18/600·청록 단색이다. 안내/단계/최종 확인은 공통 TaskActions로 Safe Area 안의 하단 행동 배치를 사용하며 긴 내용은 스크롤한다. 선택지는 선택 행, 보조 행동은 텍스트/아이콘이다.
- 문답 전송은 입력창 안의 48×48 원형 화살표다. 질문·개발용 표시·더보기·고정 질문과 모의 처리 범위는 유지한다. 기록·돌봄일지·작성 중인 기록·이어서 작성하기로 표시 문구를 정리했다.

## 실행한 검사

- `npx.cmd tsc --noEmit`: 통과.
- `npx.cmd expo lint`: 통과, 오류·경고 없음.
- `node --test tests/final-ui.test.cjs`: 새 회귀 2개 통과. 4/5/6주·윤년 달의 모든 날짜와 빈 열 정렬, 4단계 변경/재조회 뒤 일정 및 기존 기록 바이트 보존을 검사한다.
- `node --test tests/result-ux.test.cjs tests/current-time-navigation.test.cjs`: 관련 회귀 8개 통과. 저장 실패·편집 내용 보존·재시도, 원문/최초 시각, 확정/작성 중 분리, 저장 직후 정렬, 공통 뒤로가기 실패/중복 방지 등을 검사한다.
- 이전 전체 43개 통과 결과는 이전 작업 기록이다. 이번에는 변경 관련 10개만 실행했으며 변경이 없는 전체 검사를 반복하지 않았다.
- 의존성 설치/재설치 없음. Expo CLI open.js SHA256은 작업 전후 동일: `F63DA59BF7C928CEB8A44F3E250BBDFAFC046A287900C1D1A9B867A6160F4180`.

## 웹에서 직접 확인

기존 가상 일지·초안을 삭제/초기화하지 않았다. 단계·일정 변경 검증은 개발용 메모리 첫 실행 테스트에서 수행했다.

1. 2단계 첫 안내 → 날짜 알려주기 → 날짜 선택 → 완료 → 안내 복귀 → 홈에 선택 일정/D-Day 반영.
2. 홈 수정 아이콘 → 날짜 변경 → 뒤로가기 → 기존 일정 유지. 달을 바꾼 뒤 취소해도 기존 일정 유지.
3. 3·4·1단계로 각각 변경 후 홈 일정 조작 0개. 다시 2단계로 돌아오면 기존 일정과 수정 아이콘 복원.
4. 테스트 종료 및 새로 실행 후 원래 2단계·11월 9일 일정·완료/작성 중 기록 유지.
5. 11월과 12월 첫 주/마지막 주 빈칸 정렬, 선택 청록 원, 오늘 얇은 원, 오늘 선택 시 흰 숫자/테두리 0 확인. 선택 날짜의 aria-selected=true 확인.
6. 일지 달력에서 날짜 클릭 즉시 내용 갱신, 빈 날 문구와 저장 버튼 없음 확인. 확정 일지만 표시하고 초안 목록은 나오지 않는다.
7. 390×844 및 320×568 웹 문답 화면에서 큰 질문·입력창 내부 화살표와 줄바꿈 확인. 전송 터치 영역 48×48을 DOM 치수로 확인했다. 실제 키보드를 띄운 검증은 아니다.

개발 도중 공통 Context 모듈의 Fast Refresh에서 일시적인 Provider 오류가 있었으며 전체 새로고침 후 기존 저장값으로 정상 재실행을 확인했다. 배포 실행 오류로 재현되지는 않았다.

캡처: screenshots/final-home.jpg, final-calendar.jpg, final-question.jpg, final-visit.jpg (390×844 웹).

## 미검증·휴대폰 확인 순서

실제 iOS/Android, 키보드, 시스템 글자 확대, VoiceOver/TalkBack, 네이티브 뒤로가기 제스처는 미검증이다. 실제 기기 저장 실패도 강제로 유발하지 않았으며 관련 저장/이탈 계층은 자동 검사로 확인했다.

1. 홈 단계 수정 → 1/3/4단계에서는 일정 조작 숨김 → 2단계 복귀 및 앱 재실행 시 일정 유지.
2. 날짜 알려주기/일정 수정 → 날짜 선택 → 취소하면 기존 값 유지 → 다시 선택 후 완료하면 홈 즉시 갱신. 시간 없이도 완료.
3. 두 달력에서 첫/마지막 주·오늘/선택 날짜·기록 점 확인. 일지 달력은 바로 조회되고 날짜 반복/저장 버튼 없음.
4. 문답 긴 답변 입력 → 원형 전송 → 최종 읽기·수정·확인하고 저장. 뒤로가기로 입력 보존.
5. 작은 화면과 시스템 큰 글자에서 달력 가로 스크롤, 긴 버튼/질문 줄바꿈, 하단 Safe Area와 키보드 겹침 확인.

## 변경 파일

- 홈/일정/라우팅: src/features/home/home-screen.tsx, src/features/start/visit-policy.ts, guidance-storage.ts, src/app/visit.tsx, preparation.tsx, _layout.tsx.
- 공통: src/components/month-grid.tsx, icon-button.tsx, selection-row.tsx, task-actions.tsx, navigation/app-header.tsx, src/design/styles.ts, tokens.ts.
- 안내/기록: src/features/onboarding/onboarding-screen.tsx, src/features/trial/stage-survey.tsx, src/app/guide.tsx, src/features/records/interview.tsx, draft-review.tsx, typo-correction.tsx, draft-list.tsx, record-calendar.tsx, records-screen.tsx, calendar.ts.
- 검사/문서: tests/final-ui.test.cjs, PROJECT_BRIEF.md, PROGRESS.md, docs/ux-verification.md, 이 문서와 실행 캡처.
