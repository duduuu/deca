// A finishing on-device dictation fails once the engine goes this long without answering.
export const LOCAL_DICTATION_STOP_TIMEOUT_MS = 60_000
// How long an on-device model may take to load before its dictation fails.
export const START_DICTATION_TIMEOUT_MS = 60_000
// The host's answer still has to cross the network after its own deadline.
const PAIRED_CLIENT_REPLY_MARGIN_MS = 15_000

/** A paired phone or browser waits out the host's on-device stop window. */
export const PAIRED_DICTATION_FINISH_TIMEOUT_MS =
  LOCAL_DICTATION_STOP_TIMEOUT_MS + PAIRED_CLIENT_REPLY_MARGIN_MS
