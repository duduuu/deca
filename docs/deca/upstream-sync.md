# Upstream(Orca) 업데이트 반영 절차

Deca는 [Orca](https://github.com/stablyai/orca)의 git 기록을 유지한 포크다. upstream 변경은 **merge**로 받는다. squash나 rebase를 쓰면 공통 조상이 사라져 다음 동기화부터 저장소 전체가 충돌하므로 쓰지 않는다.

이 문서는 사람과 에이전트가 그대로 따라 할 수 있도록 쓴 절차다. 무엇을 제거·변경했는지는 [removed-features.md](removed-features.md)를 기준으로 판단한다.

## 0. 원격 설정 (최초 1회)

```sh
git remote add upstream https://github.com/stablyai/orca.git
git remote -v   # origin = Deca 저장소, upstream = stablyai/orca
```

upstream으로는 절대 push하지 않는다. 필요하면 `git remote set-url --push upstream DISABLED`로 막아 둔다.

## 1. 동기화 브랜치에서 병합

```sh
git fetch upstream
git switch main && git pull
git switch -c sync/upstream-YYYYMMDD
git merge upstream/main
```

한 번에 너무 많은 upstream 커밋이 쌓이지 않게 주기적으로(예: 2~4주) 동기화한다.

## 2. 충돌 해결 규칙

| 충돌 유형                                                                                                                                 | 해결                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Deca가 삭제한 파일을 upstream이 수정(modify/delete)                                                                                       | **삭제 유지**(`git rm`). 단, 그 수정이 유지 기능에 필요한 공용 코드로 옮겨졌는지 확인      |
| 삭제한 언어 파일(`src/renderer/src/i18n/locales/` 의 en·ko 외)                                                                            | 삭제 유지                                                                                  |
| 식별자 문자열(`deca`, `Deca`, `com.deca.desktop`, `~/.deca`, `deca://`)                                                                   | Deca 쪽 유지                                                                               |
| 생성 파일(`src/cli/bundled-skill-guides.ts`, `src/main/skills/bundled-skill-install/bundled-skill-sources.ts`, `resources/skills/*.json`) | 손으로 고치지 않는다. 원본(`skill-guides/`, `skill-stubs/`)을 해결한 뒤 생성기를 다시 실행 |
| `en.json`, `ko.json`                                                                                                                      | upstream의 새 키는 받고, 값의 제품명은 Deca로. ko 번역이 없으면 영어 fallback 허용         |
| 제거한 기능의 진입점(설정 섹션, 메뉴, IPC/RPC 등록, 시작 코드)                                                                            | 다시 등록되지 않게 Deca 쪽 유지                                                            |

생성기 실행(Windows Git Bash에서는 절대 경로로 실행해야 동작한다):

```sh
node "$(pwd -W)/config/scripts/skills/bundle-generation/generate-bundled-skill-guides.mjs" --write
node "$(pwd -W)/config/scripts/skills/bundle-generation/generate-skill-bundle-manifest.mjs" --write
```

## 3. 충돌 없이 들어온 변경 점검 (가장 중요)

upstream이 **새 파일**로 추가한 기능은 충돌 없이 병합된다. 병합 후 아래 항목을 반드시 검색하고, 제거 정책에 어긋나는 것은 같은 동기화 브랜치에서 제거한다. 기준은 `git diff main...sync/upstream-YYYYMMDD`의 추가분이다.

| 검사               | 찾을 것                                                                                                                                                                                                                                   | 조치                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 벤더 통신          | `onorca.dev`, `posthog`, `stablyai/orca/releases`, `api.github.com/repos/stablyai`                                                                                                                                                        | 제거                                                                                                                     |
| 텔레메트리         | 새 이벤트 전송 경로, 새 동의 화면                                                                                                                                                                                                         | 전송 제거(호출부는 stub 유지)                                                                                            |
| 업데이트·공지      | `electron-updater` 사용 재개, changelog/nudge fetch, 업데이트 메뉴                                                                                                                                                                        | 제거                                                                                                                     |
| 원격·모바일        | 새 SSH·페어링·모바일·relay 진입점, 데스크톱 WebSocket 활성화, `0.0.0.0` 바인드                                                                                                                                                            | 제거 또는 WSL 전용으로 제한                                                                                              |
| 클라우드 계정·공유 | 로그인, artifact·skill 공유, connector                                                                                                                                                                                                    | 제거                                                                                                                     |
| 에이전트           | 새 에이전트 카탈로그 항목(`src/shared/agent-launch/catalog/tui-agent-config.ts`)                                                                                                                                                          | 승인 목록에 없으면 제거                                                                                                  |
| 중국 계열          | `codebuddy`, `trae`, `mimo`, `xiaomi`, `qoder`, `qwen`, `dashscope`, `kimi`, `moonshot`, `deepseek`, `zcode`, `z.ai`, `bigmodel`, `zhipu`, `glm`, `minimax`, `tencent`, `bytedance`, `alibaba`, `aliyun`, `doubao`, `volcengine`, `baidu` | 코드 흔적까지 제거                                                                                                       |
| CLI 이름           | 새 안내 문구·예시의 `` `orca <명령>` ``, `'orca <명령>'`, `orca-ide`                                                                                                                                                                      | `deca` / `deca-ide`로                                                                                                    |
| 제품명             | 사용자에게 보이는 새 문자열의 `Orca`                                                                                                                                                                                                      | `Deca`로(내부 식별자·`ORCA_*`·`X-Orca-*` 헤더는 유지)                                                                    |
| 홈·데이터 경로     | `'.orca'`(홈 디렉터리 의미), `Application Support/orca`, `AppData/Roaming/orca`, `.local/share/orca`                                                                                                                                      | `deca`로(프로젝트 안 `.orca/` 폴더는 유지)                                                                               |
| 새 언어 파일       | en·ko 외 locale JSON                                                                                                                                                                                                                      | 삭제                                                                                                                     |
| CI                 | 새 릴리스·배포·예약 workflow                                                                                                                                                                                                              | 제거                                                                                                                     |
| Computer Use       | `src/main/computer`, `deca computer`, `computer.*` RPC, `native/computer-use-*`, `orca-computer-use` 스킬                                                                                                                                 | 다시 들어오면 제거                                                                                                       |
| 받아쓰기           | 클라우드 전사(`audio/transcriptions`, OpenAI 호환 provider, API 키 저장), 새 로컬 모델                                                                                                                                                    | 클라우드는 제거. 새 로컬 모델은 출처 확인 후 중국 계열이면 제외, 다운로드 저장소에 `csukuangfj`·`k2-fsa`가 있으면 제외   |
| 내장 브라우저      | 쿠키 가져오기, 비밀번호 가져오기, Chrome Web Store 확장 설치·업데이트                                                                                                                                                                     | 제거(확장 지원은 항상 꺼짐 유지)                                                                                         |
| 외부 자동 요청     | 새 `fetch`·`net.request`·이미지 URL(파비콘·아바타 호스트), 채팅 비주얼 CDN(`NATIVE_CHAT_VISUAL_CDN_ORIGINS`), 링크 미리보기 경로                                                                                                          | 차단 유지(`src/shared/deca-blocked-remote-images.ts`, `deca-inline-visuals-policy.ts`, `DECA_WEB_LINK_PREVIEWS_ENABLED`) |
| 사용량·계정        | `src/main/rate-limits/providers/`의 새 provider, 브라우저 쿠키·키체인 읽기, 크레딧 사용 등 상태 변경 호출                                                                                                                                 | Claude·Codex 외 사용량 조회는 넣지 않음                                                                                  |
| AI Vault           | 새 세션 기록 리더                                                                                                                                                                                                                         | `AI_VAULT_READABLE_AGENTS`(claude, codex)에 맞춤                                                                         |
| 플러그인           | 새 기여 유형(contribution)·실행 방식                                                                                                                                                                                                      | `src/shared/plugins/deca-plugin-policy.ts`의 허용 목록(테마·아이콘)만 유지                                               |
| 보안 기본값        | `default-global-settings.ts`의 `agentPermissionDefault`·`nativeChatPermissionMode`(`ask`), `terminalAllowOsc52Clipboard`(false), `browserPasskeysEnabled`(false)                                                                          | Deca 값 유지                                                                                                             |
| CLI 명령           | 다시 등록된 `serve`, `pair`, `connector`, `vm`, `vm-env`, `host rm`, `environment add`                                                                                                                                                    | 제거                                                                                                                     |
| 도움말·About       | GitHub·Discord·X 링크, 크래시 신고, 스타 요청                                                                                                                                                                                             | 제거                                                                                                                     |

승인된 에이전트: Claude Code(+ Agent Teams), Codex, GitHub Copilot, Gemini CLI, Cursor Agent, Devin, Grok, OpenCode(v1·v2), Antigravity, Kiro.

예시 검색:

```sh
git diff main...HEAD --name-only --diff-filter=A
git grep -niE "onorca\.dev|posthog|bigmodel|minimax|deepseek|qwen|kimi" -- src config ':!src/renderer/src/i18n/locales'
```

## 4. 내장 플러그인 갱신

Deca는 플러그인 마켓을 쓰지 않으므로 Material Icon Theme(`resources/plugins/launch/stablyai.orca-material-icons`)는 저장소에 들어 있는 고정 버전이다. 갱신하려면:

1. [stablyai/orca-plugins](https://github.com/stablyai/orca-plugins)의 `plugins/material-icons`를 특정 커밋 기준으로 받아 폴더를 교체한다(현재: `a501d84`, 1.1.0). 데이터 전용(`"execution": "data"`)인지 확인한다.
2. `orca-plugin.json`의 `engines.orca`가 Deca `package.json` 버전보다 높으면 Deca 버전으로 낮춘다. Deca는 upstream 릴리스 버전 번호를 찍지 않아 버전 숫자가 실제 코드보다 낮다.
3. `resources/plugins/launch/bundled-plugins.json`의 `contentHash`를 `src/main/plugins/plugin-content-hash.ts`의 `hashPluginTree`와 같은 방식으로 다시 계산해 넣는다. 파일 줄바꿈은 LF(`.gitattributes`)여야 한다.
4. `pnpm test src/main/plugins/plugin-launch-content.test.ts config/scripts/desktop-distribution/runtime-verification/verify-packaged-plugin-resources.test.mjs`로 확인한다.

## 5. 검증

```sh
pnpm tc
pnpm verify:localization-catalog
pnpm verify:localization-extraction
node "$(pwd -W)/config/scripts/skills/bundle-generation/generate-bundled-skill-guides.mjs" --check
pnpm test <관련 파일> --maxWorkers=2
pnpm check:changed
```

Windows 테스트 메모:

- 이 저장소의 일부 테스트는 Windows에서 파일 잠금(EBUSY/EPERM)이나 플랫폼 차이로 실행마다 결과가 달라진다.
- 실패를 분류할 때는 **같은 파일 묶음**을 병합 전 커밋(`main`)에서 같은 조건으로 다시 돌려 비교한다. 병합 후에만 실패하는 것만 고친다.
- 실패 목록은 `--reporter=json --outputFile=<파일>`로 받는다(dot reporter는 목록을 남기지 않는다).
- 명령줄 길이 제한이 있으므로 테스트 파일은 30개 정도씩 나눠 넘긴다.
- 별도 worktree에서 작업할 때 `node_modules`를 메인 체크아웃으로 junction한 채 pnpm을 실행하지 않는다. 메인의 패키지 링크가 worktree 기준 경로로 다시 써져 깨진다. worktree마다 `pnpm install --offline --frozen-lockfile`로 따로 설치한다.
- 플러그인 기계 장치 테스트는 코드 플러그인 fixture를 쓰므로 `config/scripts/test-runtime/environment/vitest-deca-plugin-policy-off.ts`에서 Deca 플러그인 정책을 끈 상태로 돈다. 정책 자체는 `src/main/plugins/deca-plugin-policy.test.ts`가 검사한다.

앱 동작 확인은 `ORCA_BACKGROUND_LAUNCH=1`로 백그라운드 실행 후 CDP 화면 캡처로 한다(AGENTS.md의 Electron UI Validation).

## 6. 마무리

1. `docs/deca/removed-features.md`에 변경된 내용이 있으면 갱신한다.
2. 커밋 메시지에 반영한 upstream 범위를 남긴다(예: `merge: upstream stablyai/orca@<sha>`).
3. `sync/upstream-YYYYMMDD`를 PR로 `main`에 병합한다(merge commit 유지).
