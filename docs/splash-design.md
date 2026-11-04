# 1번 심벌 중심 스플래시 · 2026-11-02

- 첨부 1번의 길/사람 심벌을 로컬 벡터로 재구성하고 아이보리 배경 중앙에 심벌 150, 앱 이름 28/42를 배치했다. 첫 소개나 홈으로 들어가는 기존 조건·저장값은 변경하지 않았다.
- 심벌/이름이 600ms 동안 8만큼 올라오며 0.97→1 크기·투명도로 부드럽게 나타난다. 300ms 유지 후, 기존 시작 정보 읽기 성공 또는 오류 화면 준비를 기다려 300ms 페이드로 전환한다. 저장 실패/읽기 오류를 숨긴 채 영구 스플래시에 머물지 않도록 오류 상태도 준비 완료로 전달한다.
- ‘동작 줄이기’에서는 이동·확대·페이드를 생략하고 짧게 표시한다. 대기 중 아래 화면의 접근성과 터치가 차단된다. 시작 호스트를 테스트/라우팅 호스트 밖에 두어 단계 변경·첫 실행 테스트 진입 때 재생하지 않는다. 앱 재실행/전체 Reload에서 재생한다.
- 앱 내부 이미지가 준비된 뒤 네이티브 스플래시를 해제한다. 기기 최초 실행용 정적 PNG와 expo-splash-screen 설정도 동일한 심벌/이름·배경으로 변경했다. PNG는 scripts/build-splash-art.py로 생성한다.

## 검증

- 타입 검사·기존 린트 통과. 시작 상태 보존 관련 기존 회귀 4개 통과.
- iOS/Android 실제 Hermes 번들 생성 성공, 새 심벌 자산 포함 확인.
- 390×844 웹에서 실제 표시 프레임을 캡처하고 애니메이션 뒤 기존 홈으로 복귀함을 확인했다. 기존 가상 기록·일정·단계가 유지됐다.
- 실제 iPhone/Android의 애니메이션, Reduce Motion과 출시 빌드의 OS 스플래시는 미검증이다. Expo Go에서는 앱 내부 애니메이션을 확인할 수 있지만 OS 네이티브 스플래시 설정 전체를 재현하지 않는다. 네이티브 이미지 변경은 새 development/release build가 필요하다. 빌드/배포는 수행하지 않았다.
- node_modules 설치/재설치·데이터 삭제 없음. Expo CLI open.js 기존 SHA256 보존.

## 확인 경로

Expo Go의 현재 8082 프로젝트 → 전체 Reload → 중앙 심벌/장기요양길잡이 표시 → 기존 홈(또는 처음 사용자 소개)으로 전환. 기존 화면에서 단순 뒤로가기/단계 변경을 할 때는 재생하지 않는다. 기기의 동작 줄이기 설정에서도 확인한다.

변경: src/components/launch-splash.tsx, src/app/_layout.tsx, src/features/start/provider.tsx, app.json, assets/images/splash-symbol.svg, launch-splash.png, scripts/build-splash-art.py, PROGRESS.md.

![웹 실행 프레임](screenshots/splash-launch.jpg)

개발 중 시작 Context를 수정한 Fast Refresh에서 FirstRunTestHost 오류가 일시적으로 나타났으며, 전체 Reload 후 스플래시 → 기존 홈 정상 진입을 재확인했다. 이번 업데이트는 전체 Reload로 확인한다.
