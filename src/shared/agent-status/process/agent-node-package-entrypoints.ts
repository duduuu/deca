// Require resolved package paths: even agent-named scripts can belong to unrelated Node apps. Keep entrypoint data separate from recognition logic.
export const NODE_PACKAGE_SCRIPT_ENTRYPOINTS: Record<string, readonly string[]> = {
  codex: ['node_modules/@openai/codex/'],
  gemini: ['node_modules/@google/gemini-cli/']
  // DSH's PATH launcher re-execs its profile-installed copy by absolute path.
}
