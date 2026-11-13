# Deca: Orca 대비 변경·제거 기능 목록

Deca는 Orca(`stablyai/orca`, 기준 커밋 `7d92d106f49`, v1.4.214)를 포크한 앱이다. 로컬 개발 기능은 유지하고, 외부 기기 접속·Orca Cloud·벤더 통신·배포 경로·일부 에이전트 연동을 제거했다.

- 브랜치: `internal/deca-fork`
- 상태: 기능 정리 완료, 배포 패키징 workflow 미작성.
- 검증 상태는 문서 끝의 [검증 현황](#검증-현황)을 따른다.

## 한눈에 보기

| 영역                                                                  | 처리                              |
| --------------------------------------------------------------------- | --------------------------------- |
| 로컬 터미널, 탭·분할, PTY 복구, 파일·Git·worktree, 폴더 워크스페이스  | 유지                              |
| 에이전트 채팅, 세션 기록·재개, 로컬 에이전트 협업(오케스트레이션)     | 유지                              |
| Windows WSL 백엔드                                                    | 유지                              |
| 예약 자동화                                                           | 유지                              |
| 로컬 프로필, AI CLI·provider 인증                                     | 유지                              |
| AI 제공업체 계정(계정 전환·사용량 표시)                               | 유지(사용량은 Claude·Codex만)     |
| 모바일·웹 원격 클라이언트, SSH, 원격 Orca 서버, 외부 공개 서버        | 제거                              |
| Orca Cloud 계정, relay, push, connector, artifact·skill 클라우드 공유 | 제거                              |
| 텔레메트리, 진단 업로드, 피드백 전송                                  | 제거                              |
| 앱 자동·수동 업데이트, 변경 이력·공지                                 | 제거                              |
| 플러그인 마켓·자동 업데이트·kill-list·설치 통계 통신                  | 제거                              |
| 로컬 플러그인                                                         | 테마·아이콘 테마만 허용           |
| recipe VM(클라우드 VM 프로비저닝)                                     | 차단                              |
| 일부 에이전트 연동(중국 계열 전부 포함)                               | 제거                              |
| Computer Use(에이전트가 데스크톱 앱 조작)                             | 제거                              |
| 받아쓰기 클라우드 전사, 중국 계열 로컬 음성 모델                      | 제거(로컬 전사는 유지)            |
| 내장 브라우저 쿠키·비밀번호 가져오기, 비밀번호 관리자, 확장 프로그램  | 제거(브라우저 자체는 유지)        |
| 채팅 인라인 비주얼(CDN), 링크 미리보기, 파비콘·아바타 자동 요청       | 차단(설정으로 켤 수 없음)         |
| 에이전트 권한, 터미널 OSC 52, 브라우저 패스키                         | 안전한 기본값(설정으로 변경 가능) |
| UI 언어                                                               | 한국어·영어만                     |
| 앱 이름·식별자                                                        | Orca → Deca                       |

## 1. 앱 이름과 식별자

| 항목                                      | Orca                           | Deca                           |
| ----------------------------------------- | ------------------------------ | ------------------------------ |
| 제품명 / 실행 파일                        | Orca / `Orca.exe`              | Deca / `Deca.exe`              |
| appId (Windows AUMID, macOS 번들 ID 계열) | `com.stablyai.orca*`           | `com.deca.desktop*`            |
| 패키지 이름(사용자 데이터 폴더)           | `orca` (`%APPDATA%\orca`)      | `deca` (`%APPDATA%\deca`)      |
| CLI 명령                                  | `orca` (Linux·WSL: `orca-ide`) | `deca` (Linux·WSL: `deca-ide`) |
| URL scheme                                | `orca://`                      | `deca://`                      |
| 홈 디렉터리                               | `~/.orca`                      | `~/.deca`                      |
| LocalAppData                              | `%LOCALAPPDATA%\Orca`          | `%LOCALAPPDATA%\Deca`          |
| WSL guest 데이터                          | `~/.local/share/orca`          | `~/.local/share/deca`          |
| 설치 파일                                 | `orca-windows-setup.exe`       | `deca-windows-setup.exe`       |

- Deca는 Orca 데이터를 가져오지 않는다. 처음 실행하면 빈 상태에서 시작한다.
- 에이전트 설정(예: `~/.claude/settings.json`)에 남은 Orca hook 항목은 Deca가 hook을 설치할 때 Deca hook으로 교체된다.
- 바꾸지 않은 내부 이름: `ORCA_*` 환경변수, `X-Orca-*` 내부 HTTP 헤더, 코드 식별자, 스킬 이름(`orca-cli` 등), 프로젝트 안의 `.orca/` 폴더(저장소에 커밋된 설정 호환), WSL 내부 페어링 문자열 `orca://pair`.
- 원본 Orca와의 공존은 지원 대상이 아니다. **Orca를 제거한 뒤 Deca를 설치한다.**

## 2. 원격 접속·모바일

| 기능                                                                            | 처리                                     |
| ------------------------------------------------------------------------------- | ---------------------------------------- |
| 모바일 앱 페어링, QR, 기기 등록, 폰 relay                                       | 제거                                     |
| 웹 클라이언트 제공                                                              | 제거                                     |
| 데스크톱 WebSocket 서버(외부 기기용 포트)                                       | 열지 않음                                |
| SSH 호스트 추가·연결·재연결, `~/.ssh/config` 가져오기                           | 제거(관련 화면 호출은 빈 결과 또는 거부) |
| 원격 Orca 서버 추가·연결                                                        | 제거                                     |
| `deca serve`, `pair`, `connector`, `vm`, `vm-env`, `host rm`, `environment add` | CLI에서 제거                             |
| 페어링 코드(`--pairing-code`, `ORCA_PAIRING_CODE`), WSL 외 `--environment`      | 거부                                     |
| orcad 외부 바인드                                                               | loopback(127.0.0.1)만 허용               |
| 기존에 저장된 SSH 대상·원격 서버·SSH 저장소                                     | 디스크에 남지만 표시·연결하지 않음       |

유지: WSL 호스트(distro 안의 orcad에 `wsl.exe`로 연결), 로컬 CLI(named pipe), iOS·Android 에뮬레이터 기능.

## 3. Orca Cloud·벤더 통신

| 기능                                                    | 처리                        |
| ------------------------------------------------------- | --------------------------- |
| Orca 계정 로그인·로그아웃·조직·토큰 갱신                | 제거(로컬 프로필은 유지)    |
| 모바일 cloud relay, push 알림 게이트웨이                | 제거                        |
| connector cloud                                         | 제거                        |
| artifact 클라우드 공유(Artifacts 페이지, 공유 버튼)     | 제거(로컬 미리보기는 유지)  |
| skill 클라우드 공유·링크 설치                           | 제거(로컬 스킬 사용은 유지) |
| 플러그인 마켓 seed, 자동 업데이트, kill-list, 설치 통계 | 제거                        |
| 에이전트 상태 규칙 원격 다운로드(GitHub releases)       | 제거(번들 규칙 사용)        |
| 링크 미리보기 User-Agent의 Orca 저장소 주소             | 일반 값으로 변경            |
| 벤더 백엔드 소스(`cloud/`)                              | 저장소에서 삭제             |

제거된 벤더 목적지: `login.onorca.dev`, `relay.onorca.dev`, `push.onorca.dev`, `connector.onorca.dev`, `share.onorca.dev`, `www.onorca.dev/v1/feedback`, `onorca.dev/whats-new/*`, `onorca.dev/plugins/*`, PostHog, GitHub release feed.

## 4. 텔레메트리·진단·업데이트

| 기능                                        | 처리                                    |
| ------------------------------------------- | --------------------------------------- |
| 사용 데이터 전송(PostHog)                   | 제거. 호출 지점은 아무 동작 없는 stub   |
| 동의 배너·개인정보 화면의 사용 데이터 항목  | 제거                                    |
| 진단 번들 업로드                            | 제거. 로컬 진단 파일 생성은 유지        |
| 피드백 전송, 언어 요청 폼, 크래시 보고 전송 | 제거. 크래시 창은 닫기·세부 정보 복사만 |
| 자동·수동 업데이트, 업데이트 메뉴           | 제거. 설정에는 버전만 표시              |
| 변경 이력·공지(nudge)·프리릴리스 조회       | 제거                                    |
| 크래시 덤프                                 | 로컬 저장만(원래도 업로드 안 함)        |

배포는 직접 빌드하거나 조직의 패키지 배포 경로로 대체한다.

## 5. 에이전트 연동

유지: Claude Code(+ Agent Teams), Codex, GitHub Copilot, Gemini CLI, Cursor Agent, Devin, Grok, OpenCode(v1·v2), Antigravity, Kiro.

| 제거                          | 대상                                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 중국 계열(코드 흔적까지 제거) | CodeBuddy(Tencent), Trae(ByteDance), MiMo Code(Xiaomi), Qoder·Qoder CN(Alibaba), Qwen Code(Alibaba), Kimi(Moonshot), DeepSeek Harness, ZCode(Zhipu·Z.ai), MiniMax 사용량·계정 연동                      |
| 그 외                         | Autohand, Ante, Pi, OMP, Prime Agent, Codebuff·Freebuff, Command Code, Hermes, OpenClaw, OpenClaude, Muse, Amp, Aider, Cline, Droid, Goose, Rovo Dev, Continue, Augment, Crush, Kilo Code, Mistral Vibe |

- OpenCode처럼 모델을 고를 수 있는 도구에서 사용자가 직접 중국 모델을 설정하는 것은 Deca 코드로 막을 수 없다. 필요하면 모델 gateway·네트워크 정책으로 통제한다.

## 6. 기타 기능

| 기능                                               | 처리                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| recipe VM(클라우드 VM 프로비저닝)                  | 목록·진단·생성 거부, 설정 화면 제거. 이미 기록된 VM의 정리 경로는 유지                                                                                                                                                                                                                                                                             |
| 예약 자동화                                        | 유지. SSH 대상 자동화는 실행되지 않음                                                                                                                                                                                                                                                                                                              |
| 플러그인                                           | 테마·터미널 테마·아이콘 테마만 로드. 코드를 실행하는 플러그인(`main`, capabilities, 패널·명령·훅 등)은 발견·설치 단계에서 거부. 내장 플러그인: GitHub Themes, VS Code Default Themes, Material Icon Theme(기본 아이콘 테마, 마켓 없이 1.1.0 고정). Multipass VM 레시피 내장 항목은 제거                                                            |
| UI 언어                                            | 한국어·영어만. 다른 언어를 저장해 둔 설정은 시스템 언어로 대체                                                                                                                                                                                                                                                                                     |
| Computer Use                                       | 제거: `deca computer` CLI, RPC/IPC, 설정 화면, 내장 스킬 `orca-computer-use`, 3개 OS 네이티브 helper와 빌드·검증. 이미 에이전트 폴더에 설치된 스킬 사본은 자동 삭제되지 않음                                                                                                                                                                       |
| 받아쓰기(음성 입력)                                | 로컬 전사만. OpenAI·OpenAI 호환(Groq 등) 클라우드 전사와 API 키 저장 제거. 로컬 모델 중 SenseVoice·Paraformer·Zipformer(중국 계열)와 Parakeet JA 제거. 유지 모델(Parakeet v2·v3, Whisper Tiny·Large v3 Turbo, Nemotron 3.5, Silero VAD)은 Hugging Face `handy-computer` 저장소에서 커밋·해시 고정으로 받음                                         |
| 내장 브라우저                                      | 유지(탭, 로컬 미리보기, devtools, 다운로드, 디자인 모드, 에이전트 페이지 조작). 비밀번호 관리자(저장·자동 입력·설정) 제거. 패스키는 기본 꺼짐(설정 > 브라우저에서 켤 수 있음). 다른 브라우저 쿠키 가져오기, 비밀번호 가져오기(Chromium·CSV) 제거. 확장 프로그램은 Chrome Web Store 설치·자동 업데이트·관리 UI·CLI 제거, 남은 로딩 코드는 항상 꺼짐 |
| 모바일 에뮬레이터(iOS Simulator, Android emulator) | 유지(로컬 SDK 필요, 외부 통신 없음)                                                                                                                                                                                                                                                                                                                |
| AI 제공업체 계정                                   | 유지(계정 여러 개 전환, 사용량 표시). 사용량은 Claude·Codex만 조회. Cursor·Grok·OpenCode Go 사용량(키체인·브라우저 쿠키·인증 파일 읽기)과 ChatGPT 리셋 크레딧 사용 호출 제거. Gemini CLI 레거시 OAuth 제거                                                                                                                                         |
| AI Vault(에이전트 세션 기록)                       | Claude·Codex 기록만 읽음                                                                                                                                                                                                                                                                                                                           |
| 내장 스킬                                          | `orca-cli`, `orchestration`, `orca-emulator`, `orca-emulator-android`, `orca-jira`, `orca-linear`, `orca-plugin-authoring`(테마·아이콘 플러그인용). `per-workspace-env` 제거, 중복 Jira·Linear 스킬 통합. 스킬 설치는 앱에 번들된 사본에서 오프라인으로(`deca skills install`)                                                                     |
| 도움말 메뉴·About                                  | GitHub·Discord·X·문서 링크, 크래시 신고 메뉴, GitHub 스타 요청 제거. About은 `Deca 0.1.0` / `Orca 1.4.214 기반` 표시(`deca --version`도 동일)                                                                                                                                                                                                      |
| 앱 아이콘                                          | Orca 로고 대신 임시 Deca 아이콘(`resources/build/deca-icon.svg`). macOS `.icns`는 Pillow로 생성(actool 미사용)                                                                                                                                                                                                                                     |
| 저장소 정리                                        | 사용하지 않는 `mobile/` 앱, `docs/site/`(Orca 문서 사이트), 벤더 백엔드 `cloud/` 삭제                                                                                                                                                                                                                                                              |

## 7. 보안·외부 요청 기본값

원칙: **외부로 나가는 자동 요청은 코드에서 차단**하고, **로컬 동작은 안전한 기본값 + 설정 토글**로 둔다.

| 항목                                                   | 처리                                                                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 에이전트 권한(`agentPermissionDefault`, 채팅 권한)     | 기본값 `ask`(수정·명령 전 확인). Claude는 `--permission-mode default`, Codex는 `-a on-request -s read-only`. 설정에서 전체 권한으로 바꿀 수 있음. 기존 저장값은 유지           |
| 채팅 인라인 비주얼(에이전트가 만든 HTML을 iframe 실행) | 차단. 토글 제거, 비주얼 스킬 미전달, CDN 허용 목록 비움. 비주얼 지시문은 텍스트로 표시. Mermaid 다이어그램은 번들 라이브러리로 정상 렌더링                                     |
| 링크 미리보기                                          | 차단. 토글 제거, 메인 프로세스 조회 함수가 항상 unavailable 반환                                                                                                               |
| Google s2 파비콘, GitHub 아바타                        | 앱 기본 세션의 요청 가드에서 취소. 글자·기본 아이콘으로 대체. 저장소 아이콘은 업로드·로컬 이미지만. 내장 브라우저 탭과 GitHub Enterprise·Jira·Linear·GitLab 아바타는 영향 없음 |
| 터미널 OSC 52 클립보드 쓰기                            | 기본 꺼짐(설정 > 터미널에서 켤 수 있음)                                                                                                                                        |
| 브라우저 패스키                                        | 기본 꺼짐. 꺼져 있으면 USB 보안 키·패스키 선택 창을 거부. OS 자체 Windows Hello 창은 막지 않음                                                                                 |
| 에이전트 hook 자동 설치                                | 유지. 상태 표시를 위해 `~/.claude/settings.json` 등에 Deca hook(로컬 스크립트)을 등록하고 남은 Orca hook은 교체                                                                |
| 에이전트 상태 규칙 원격 다운로드                       | 비활성(번들 규칙만 사용)                                                                                                                                                       |
| 플러그인 마켓 조회, WSL 호스트 정책 갱신               | 실행 안 함                                                                                                                                                                     |

남아 있는 외부 요청(필요 시 네트워크 정책으로 통제): 사용자가 연결한 Claude·Codex 사용량 조회, Antigravity 런타임 다운로드(`dl.google.com`), Android 화면 미러링 도구 scrcpy 다운로드(GitHub), 로컬 음성 모델 다운로드(Hugging Face), 사용자가 연결한 GitHub·Jira·Linear·GitLab API.

## 8. CI·배포

| 항목                                                               | 처리                                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| GitHub 릴리스, 예약(hourly·daily·adhoc)·dev 채널 빌드              | 제거                                                                                                                            |
| Homebrew·`Casks/`, R2 미러, 문서 사이트 배포                       | 제거                                                                                                                            |
| 모바일 스토어 릴리스, orca-server artifact, agent-state-rules 배포 | 제거                                                                                                                            |
| 서명·릴리스 스크립트, 텔레메트리·진단 secret 요구                  | 제거                                                                                                                            |
| PR 검사(lint, 타입 검사, 단위 테스트, e2e)                         | 유지                                                                                                                            |
| 배포 패키징 workflow                                               | 미작성(필요 항목: `pnpm build:release`, `electron-builder --win --publish never`, 코드 서명, Rust·MSVC, 버전 지정, 배포 저장소) |

## 이 포크가 통제하지 않는 것

Deca는 기능 제거 포크이며 통신 샌드박스가 아니다. AI CLI, MCP 서버, 사용자 셸 명령, 내장 브라우저가 만드는 통신은 네트워크 정책과 CLI·모델 설정으로 통제한다.

## 검증 현황

| 항목                                                                            | 상태                                                                                                                                                |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 타입 검사(`pnpm tc`), 변경 파일 lint·format                                     | 통과                                                                                                                                                |
| 번역 카탈로그 검증, 스킬 생성물 검증, reliability gate, 테스트 러너 검사        | 통과                                                                                                                                                |
| 단위 테스트                                                                     | 전체 실행 후 새 실패를 수정. 남은 실패는 기준 커밋(`7d92d106f49`)에서 같은 조건으로도 실패하는 Windows 환경 의존 테스트(파일 잠금·권한·플랫폼 차이) |
| 앱 실행(개발 모드, 백그라운드 + CDP 화면 확인)                                  | 확인: 첫 화면, 한국어 UI, PowerShell 터미널, 설정 메뉴(제거 항목 없음), 에이전트 목록, Material 아이콘 적용                                         |
| e2e golden(세션 복구, 파일 편집, 소스 컨트롤, 에이전트 TUI, 탭바 에이전트 실행) | 통과(15개, POSIX 전용 1개 건너뜀). 테스트 프로필은 UI 언어를 영어로 고정                                                                            |
| 전체 e2e(546개 spec)                                                            | 미실행. 제거한 기능의 spec 정리가 먼저 필요                                                                                                         |
| `pnpm check:changed`                                                            | 단위 테스트 단계만 30분 제한으로 미완료(같은 범위는 기준 커밋과 비교 완료). 나머지 검사 통과                                                        |
| 설치 파일 빌드                                                                  | 미실행(Rust·MSVC 필요)                                                                                                                              |
| WSL 실기, 네트워크 관찰(DNS·HTTP·WebSocket)                                     | 미실행                                                                                                                                              |
