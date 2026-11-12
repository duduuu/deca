import { defineMethod } from '../../core'
import {
  ORCAD_DECLARE_CLIENT_METHOD,
  ORCAD_PEER_DESKTOPS_METHOD,
  OrcadDeclareClientParamsSchema,
  OrcadPeerDesktopsParamsSchema
} from '../../../../../shared/orcad-peer-desktops-contract'

// WSL hosts still ask their orcad about the other desktops attached to it.
export const ORCAD_PEER_DESKTOP_METHODS = [
  defineMethod({
    name: ORCAD_PEER_DESKTOPS_METHOD,
    permission: 'workspace',
    params: OrcadPeerDesktopsParamsSchema,
    handler: (params, ctx) => {
      if (!ctx.peerDesktops) {
        throw new Error('runtime_device_required')
      }
      return ctx.peerDesktops.list(params.clientInstanceId)
    }
  }),
  defineMethod({
    name: ORCAD_DECLARE_CLIENT_METHOD,
    permission: 'workspace',
    params: OrcadDeclareClientParamsSchema,
    handler: (params, ctx) => {
      if (!ctx.peerDesktops) {
        throw new Error('runtime_device_required')
      }
      ctx.peerDesktops.declare(params.clientInstanceId)
      return {}
    }
  })
]
