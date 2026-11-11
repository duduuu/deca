export type PluginSources = {
  claudeAgentViewSource?: string
  opencodeStartupPromptSource?: string
  /** Empty string revokes future installs; omission preserves the cached source. */
  opencodePluginSource?: string
  /** Source body of OpenCode 2's status plugin. */
  opencode2PluginSource?: string
}
