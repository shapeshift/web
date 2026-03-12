import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  berachainChainId,
  bobChainId,
  bscChainId,
  cronosChainId,
  ethChainId,
  flowEvmChainId,
  gnosisChainId,
  hyperEvmChainId,
  lineaChainId,
  mantleChainId,
  megaethChainId,
  monadChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  seiChainId,
  sonicChainId,
  storyChainId,
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
  [mantleChainId]: 100000023,
  [cronosChainId]: 100000019,
  [berachainChainId]: 100000020,
  [lineaChainId]: 59144,
  [bobChainId]: 100000021,
  [sonicChainId]: 100000014,
  [storyChainId]: 100000013,
  [flowEvmChainId]: 100000009,
  [megaethChainId]: 100000031,
}

export const debridgeChainIdToChainId = invert(chainIdToDebridgeChainId)

export const DEBRIDGE_SUPPORTED_CHAIN_IDS = Object.keys(chainIdToDebridgeChainId)

export const DEFAULT_DEBRIDGE_TOKEN_ADDRESS = zeroAddress

export const DEFAULT_DEBRIDGE_USER_ADDRESS = '0x000000000000000000000000000000000000dead'
