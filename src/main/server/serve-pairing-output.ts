import { statSync } from 'node:fs'
import { isAbsolute } from 'node:path'

/** The recipe line names this root, so it must be a real absolute directory. */
export function assertServeProjectRoot(projectRoot: string): string {
  if (!isAbsolute(projectRoot)) {
    throw new Error(`--serve-project-root must be absolute: ${projectRoot}`)
  }
  if (!statSync(projectRoot).isDirectory()) {
    throw new Error(`--serve-project-root must be a directory: ${projectRoot}`)
  }
  return projectRoot
}
