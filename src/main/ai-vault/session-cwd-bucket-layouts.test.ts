import { describe, expect, it } from 'vitest'

function piDirInScope(dirName: string, scopePath: string): boolean {
  return PI_CWD_BUCKET_LAYOUT.isDirInScope(
    dirName,
    new Set(PI_CWD_BUCKET_LAYOUT.encodeScopePrefixes(scopePath))
  )
}

describe('PI_CWD_BUCKET_LAYOUT', () => {
  it('does not match an unrelated bucket', () => {
    expect(piDirInScope('--home-ada-other--', '/home/ada/repo')).toBe(false)
    expect(piDirInScope('--home-ada-reposit--', '/home/ada/repo')).toBe(false)
  })
})

describe('CODEBUDDY_CWD_BUCKET_LAYOUT', () => {})
