# Expo Go 실행 복구 · 2026-11-02

## 확인된 원인과 조치

기존 8081 포트의 Node 프로세스는 LISTEN 상태였지만 `/status`와 `/_expo/open` 모두 각각 10초 안에 응답하지 않았다. 새 Expo 실행도 포트 사용 중 오류로 중단됐다. 앱의 최근 UI 변경에서 번들 오류는 재현되지 않았다. 기존 프로세스가 멈춘 내부 원인은 확인하지 못했다.

기존 프로세스를 강제로 종료하거나 데이터를 지우지 않고 8082에서 이 프로젝트의 Expo Go LAN 서버를 새로 실행했다. `/status`, iOS/Android 연결 정보와 매니페스트가 모두 HTTP 200으로 응답했다. 사용자가 새 주소로 Expo Go에서 **정상 실행됨**을 확인했다.

복구 서버는 작업 종료 시에도 유지한다. 터미널을 닫거나 컴퓨터를 재시작하면 개발 서버는 다시 실행해야 한다. 다음 실행 명령을 package.json에 추가했다.

```powershell
npm run start:go
```

이 명령은 `expo start --go --lan --port 8082`를 실행한다. 기존 Expo Go 최근 목록의 8081 주소 대신 새 서버의 QR/8082 주소를 사용한다. 주소의 IP는 네트워크에 따라 달라질 수 있으므로 다음 실행 시 CLI가 제공하는 주소를 따른다. 이미 복구 서버가 실행 중이면 같은 명령을 중복 실행할 필요는 없다.

## 검증 결과

- `npx.cmd tsc --noEmit`: 통과.
- `npx.cmd expo lint`: 통과.
- `npx.cmd expo export --platform ios --platform android --output-dir .expo/recovery-bundle`: 성공. iOS 1,212개 / Android 1,373개 모듈과 Hermes 번들 각각 2,709,263 / 3,074,637바이트 생성.
- 새 Metro에서 실제 Expo Go 개발 번들 요청: iOS HTTP 200 / 6,008,766바이트, Android HTTP 200 / 6,703,975바이트.
- 매니페스트의 프로젝트 경로가 현재 care-diary이고 SDK 58인 것을 확인했다.
- 사용자 휴대폰 Expo Go 정상 실행 확인. 별도 Android/iOS 양쪽 실기기 전체 동작 검증은 하지 않았다.
- node_modules 설치/재설치 없음. 앱 저장소·기존 기록·초안·단계·일정 삭제/초기화 없음. 기존 변경 전체 되돌리기 없음.
- Expo CLI open.js SHA256 보존: `F63DA59BF7C928CEB8A44F3E250BBDFAFC046A287900C1D1A9B867A6160F4180`.

변경 파일은 package.json의 실행 명령과 이 문서·PROGRESS.md뿐이다. 앱 기능/라우팅/저장 로직은 변경하지 않았다. 번들 산출물은 Git 제외 경로인 .expo 아래에만 생성했다.
