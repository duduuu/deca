// Prepare daemon copies in the background so a disappearing FUSE mount cannot sever them.
import { existsSync } from 'node:fs'
import { resolveAppImageRuntimeIdentity } from '../linux-appimage/appimage-runtime-identity'
import {
  isAppImageExtractionComplete,
  resolveAppImageCacheRootPath,
  resolveAppImageExtractedRoot,
  runAppImageExtract,
  stageAppImageExtractedRoot,
  type AppImageExtractRunner
} from './appimage-extracted-root'
import { pruneAppImageExtractedRoots } from './appimage-extraction-pruning'
import { withAppImageRegistrationLock } from './appimage-registration-lock'
import { probeAppImageCache } from './appimage-serve-preparation'

/** How long a daemon launch waits for this launch's copy before falling back to the mount. */
export const APPIMAGE_COPY_DAEMON_WAIT_MS = 8_000
// Why `nice` alone: without an explicit I/O class, Linux derives a best-effort I/O priority from it.
const NICE_PROGRAM_PATHS = ['/usr/bin/nice', '/bin/nice'] as const

export type AppImageCopyPreExtractionOptions = {
  /** The running AppImage; defaults to this process's validated one. */
  appImagePath?: string
  cacheRootPath?: string
  runExtract?: AppImageExtractRunner
  probeCache?: (cacheRootPath: string, appImagePath: string) => Promise<string | null>
  log?: (line: string) => void
}

let currentCopy: Promise<boolean> | null = null

const runAppImageExtractInBackground: AppImageExtractRunner = (appImagePath, cwd, timeoutMs) =>
  runAppImageExtract(appImagePath, cwd, timeoutMs, NICE_PROGRAM_PATHS.find(existsSync))

/** At launch: unpack this AppImage's copy when there is none yet. Null when nothing needs doing. */
export function startAppImageCopyPreExtraction(
  options: AppImageCopyPreExtractionOptions = {}
): Promise<boolean> | null {
  const appImagePath = options.appImagePath ?? resolveAppImageRuntimeIdentity()?.appImagePath
  if (!appImagePath || currentCopy) {
    return currentCopy
  }
  const root = resolveAppImageExtractedRoot({ ...options, appImagePath })
  if (!root) {
    return null
  }
  if (isAppImageExtractionComplete(root)) {
    void pruneIdleGenerations(root.rootPath, { ...options, appImagePath })
    return null
  }
  currentCopy = preExtract({ ...options, appImagePath }, 'this AppImage')
  // A daemon waiting on the copy must not also wait for pruning.
  void currentCopy.then(async (ready) => {
    if (ready) {
      await pruneIdleGenerations(root.rootPath, { ...options, appImagePath })
    }
  })
  return currentCopy
}

/** True when this launch's copy finished within `timeoutMs`; false at once when none is running. */
export async function waitForAppImageCopyPreExtraction(
  timeoutMs = APPIMAGE_COPY_DAEMON_WAIT_MS
): Promise<boolean> {
  if (!currentCopy) {
    return false
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs)
    timer.unref?.()
  })
  try {
    return await Promise.race([currentCopy, timedOut])
  } finally {
    clearTimeout(timer)
  }
}

async function preExtract(
  options: AppImageCopyPreExtractionOptions & { appImagePath: string },
  subject: string
): Promise<boolean> {
  const log = options.log ?? ((line: string) => console.log(line))
  const cacheRootPath = resolveAppImageCacheRootPath(options)
  try {
    const refusal = await (options.probeCache ?? probeAppImageCache)(
      cacheRootPath,
      options.appImagePath
    )
    if (refusal) {
      log(`[appimage-copy] Not unpacking ${subject}: ${refusal}`)
      return false
    }
    const startedAt = Date.now()
    log(`[appimage-copy] Unpacking ${subject} in the background into ${cacheRootPath}`)
    const root = await withAppImageRegistrationLock(cacheRootPath, () =>
      stageAppImageExtractedRoot({
        ...options,
        runExtract: options.runExtract ?? runAppImageExtractInBackground
      })
    )
    if (!root) {
      log(`[appimage-copy] Could not unpack ${subject}; terminal daemons keep the mount fallback`)
      return false
    }
    log(`[appimage-copy] Unpacked ${subject} in ${Math.round((Date.now() - startedAt) / 1000)}s`)
    return true
  } catch (error) {
    log(`[appimage-copy] Could not unpack ${subject}: ${describe(error)}`)
    return false
  }
}

/** Without this, a desktop that never registers the CLI keeps every release's copy it unpacked. */
async function pruneIdleGenerations(
  keepRootPath: string,
  options: AppImageCopyPreExtractionOptions & { appImagePath: string }
): Promise<void> {
  const log = options.log ?? ((line: string) => console.log(line))
  try {
    await withAppImageRegistrationLock(resolveAppImageCacheRootPath(options), () =>
      pruneAppImageExtractedRoots(keepRootPath)
    )
  } catch (error) {
    log(`[appimage-copy] Could not prune older AppImage copies: ${describe(error)}`)
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
