import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  hyperEvmChainId,
  monadChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  seiChainId,
} from '@shapeshiftoss/caip'
import invert from 'lodash/invert'
import { zeroAddress } from 'viem'

export const chainIdToDebridgeChainId: Record<string, number> = {
  [ethChainId]: 1,
  [optimismChainId]: 10,
  [bscChainId]: 56,
  [gnosisChainId]: 100000002,
  [polygonChainId]: 137,
  [monadChainId]: 100000030,
  [hyperEvmChainId]: 100000022,
  [seiChainId]: 100000027,
  [baseChainId]: 8453,
  [plasmaChainId]: 100000028,
  [arbitrumChainId]: 42161,
  [avalancheChainId]: 43114,
}

export const debridgeChainIdToChainId = invert(chainIdToDebridgeChainId)

export const DEBRIDGE_SUPPORTED_CHAIN_IDS = Object.keys(chainIdToDebridgeChainId)

export const DEFAULT_DEBRIDGE_TOKEN_ADDRESS = zeroAddress

export const DEFAULT_DEBRIDGE_USER_ADDRESS = '0x000000000000000000000000000000000000dead'
