import * as arbitrum from './arbitrum'
import * as arbitrumNova from './arbitrumNova'
import * as avalanche from './avalanche'
import * as base from './base'
import * as bnbsmartchain from './bnbsmartchain'
import * as ethereum from './ethereum'
import * as gnosis from './gnosis'
import * as optimism from './optimism'
import * as polygon from './polygon'

export type { evm as types } from '@shapeshiftoss/common-api'

export type Api =
  | ethereum.V1Api
  | avalanche.V1Api
  | optimism.V1Api
  | polygon.V1Api
  | gnosis.V1Api
  | bnbsmartchain.V1Api
  | arbitrum.V1Api
  | arbitrumNova.V1Api
  | base.V1Api

export * from './parser'

export {
  ethereum,
  avalanche,
  optimism,
  gnosis,
  polygon,
  bnbsmartchain,
  arbitrum,
  arbitrumNova,
  base,
}
