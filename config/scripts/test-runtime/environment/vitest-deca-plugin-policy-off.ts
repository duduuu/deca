// Upstream plugin-machinery tests load code-plugin fixtures; deca-plugin-policy.test.ts turns the policy back on.
import { beforeEach } from 'vitest'
import { setDecaPluginPolicyEnforced } from '../../../../src/shared/plugins/deca-plugin-policy'

beforeEach(() => {
  setDecaPluginPolicyEnforced(false)
})
