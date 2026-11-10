import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bobChainId,
  bscChainId,
  cronosChainId,
  ethChainId,
  gnosisChainId,
  hyperEvmChainId,
  mantleChainId,
  megaethChainId,
  monadChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  robinhoodChainId,
  seiChainId,
  sonicChainId,
} from '@shapeshiftoss/caip'
import invert from 'lodash/invert'
import { zeroAddress } from 'viem'
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  mainnet as ethereum,
  optimism,
  polygon,
  robinhood,
} from 'viem/chains'

export const chainIdToDebridgeChainId: Record<string, number> = {
  [ethChainId]: ethereum.id,
  [optimismChainId]: optimism.id,
  [bscChainId]: bsc.id,
  [gnosisChainId]: 100000002,
  [polygonChainId]: polygon.id,
  [monadChainId]: 100000030,
  [hyperEvmChainId]: 100000022,
  [seiChainId]: 100000027,
  [baseChainId]: base.id,
  [plasmaChainId]: 100000028,
  [arbitrumChainId]: arbitrum.id,
  [avalancheChainId]: avalanche.id,
  [mantleChainId]: 100000023,
  [cronosChainId]: 100000019,
  [bobChainId]: 100000021,
  [sonicChainId]: 100000014,
  [megaethChainId]: 100000031,
  [robinhoodChainId]: robinhood.id,
}

export const debridgeChainIdToChainId = invert(chainIdToDebridgeChainId)

export const DEBRIDGE_SUPPORTED_CHAIN_IDS = Object.keys(chainIdToDebridgeChainId)

export const DEFAULT_DEBRIDGE_TOKEN_ADDRESS = zeroAddress

export const DEFAULT_DEBRIDGE_USER_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
