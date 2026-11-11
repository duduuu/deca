<h1 align="center">
  <img src="resources/build/icon.png" alt="" width="64" valign="middle" /> Deca
</h1>

<p align="center">여러 AI 코딩 에이전트를 병렬로 돌리는 사내 전용 데스크톱 개발 환경</p>

Deca는 오픈소스 [Orca](https://github.com/stablyai/orca)(MIT)를 사내용으로 포크한 앱입니다. 로컬 개발 경험은 그대로 유지하고, 외부 기기 접속, 벤더 클라우드, 텔레메트리, 자동 업데이트, 승인되지 않은 에이전트 연동은 제거했습니다.

- 무엇을 바꾸고 제거했는지: [docs/deca/removed-features.md](docs/deca/removed-features.md)
- upstream(Orca) 업데이트 반영 절차: [docs/deca/upstream-sync.md](docs/deca/upstream-sync.md)

> [!IMPORTANT]
> 사내 전용 소프트웨어입니다. 외부 공개·재배포하지 않습니다.

## 주요 기능

- **병렬 워크스페이스**: Git worktree 또는 일반 폴더마다 독립된 워크스페이스에서 에이전트를 동시에 실행합니다.
- **채팅 또는 터미널**: 같은 에이전트를 네이티브 채팅 화면이나 터미널(PTY)로 사용합니다. 앱을 다시 시작해도 터미널 세션이 복구됩니다.
- **에이전트 협업(오케스트레이션)**: 코디네이터 에이전트가 작업자 에이전트에게 일을 나누고 결과를 모읍니다. `deca orchestration` CLI로 제어합니다.
- **AI 결과 리뷰**: diff 확인, 주석, 커밋·푸시, PR 체크까지 앱 안에서 처리합니다.
- **탭·분할**: 터미널, 에디터, 브라우저, 미리보기를 자유롭게 나눠 배치합니다.
- **Windows WSL 백엔드**: WSL distro 안에서 터미널과 에이전트를 실행합니다.
- **예약 자동화**: 정해진 시각에 로컬 에이전트 작업을 실행합니다.
- **Deca CLI**: 에이전트와 사람이 워크스페이스, 터미널, 브라우저, 오케스트레이션을 명령으로 다룹니다.
- **GitHub·Linear·Jira 연동**, 파일 탐색·편집, 내장 브라우저, 모바일 에뮬레이터, 받아쓰기

## 지원 에이전트

Claude Code(Agent Teams 포함), Codex, GitHub Copilot, Gemini CLI, Cursor Agent, Devin, Grok, OpenCode, Antigravity, Kiro

각 에이전트의 CLI는 별도로 설치하고, 사내에서 승인된 계정·모델 설정으로 로그인합니다. Deca는 에이전트 CLI가 만드는 통신을 차단하지 않으므로 모델 접근은 사내 네트워크 정책과 모델 gateway로 통제합니다.

## 설치

1. 기존 Orca가 설치되어 있으면 먼저 제거합니다. Deca와 Orca는 같은 에이전트 설정 파일(예: `~/.claude/settings.json`)에 hook을 등록하므로 함께 쓰지 않습니다.
2. 사내 배포 경로로 받은 `deca-windows-setup.exe`를 실행합니다.
3. 앱에서 **Settings → Command line**으로 `deca` 명령을 PATH에 등록합니다. WSL 안에서는 `deca-ide` 명령을 씁니다.

| 항목                         | 위치                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| 사용자 데이터                | `%APPDATA%\deca` (macOS `~/Library/Application Support/deca`, Linux `~/.config/deca`) |
| 홈 설정·자격 증명·hook       | `~/.deca`                                                                             |
| 터미널 daemon 실행 파일 사본 | `%LOCALAPPDATA%\Deca`                                                                 |

Deca는 기존 Orca 데이터를 가져오지 않습니다.

## 개발

필요한 도구: Node 24, `package.json`의 `packageManager`에 적힌 pnpm, `config/.bun-version`의 Bun, C++ 빌드 도구와 Python 3(Windows는 Visual Studio Build Tools). Windows CLI 런처와 agent hook을 빌드하려면 Rust도 필요합니다.

```sh
pnpm install
pnpm dev
```

| 작업         | 명령                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| 타입 검사    | `pnpm tc`                                                                                                    |
| 테스트       | `pnpm test <파일> --maxWorkers=2`                                                                            |
| lint         | `pnpm exec oxlint <파일>`                                                                                    |
| 푸시 전 검사 | `pnpm check:changed`                                                                                         |
| 릴리스 빌드  | `pnpm build:release` 후 `electron-builder --config config/electron-builder.config.cjs --win --publish never` |

에이전트로 작업할 때의 저장소 규칙은 [AGENTS.md](AGENTS.md), 코드 기여 규칙은 [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)를 따릅니다. 사내 패키징 workflow와 코드 서명은 아직 정해지지 않았습니다.

## 라이선스

[MIT License](LICENSE). Orca의 원저작권 고지(Lovecast Inc.)를 유지합니다.
