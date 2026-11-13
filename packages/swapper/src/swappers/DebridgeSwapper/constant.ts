import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  cronosChainId,
  ethChainId,
  hyperEvmChainId,
  megaethChainId,
  monadChainId,
  optimismChainId,
  polygonChainId,
  robinhoodChainId,
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
  [polygonChainId]: polygon.id,
  [monadChainId]: 100000030,
  [hyperEvmChainId]: 100000022,
  [baseChainId]: base.id,
  [arbitrumChainId]: arbitrum.id,
  [avalancheChainId]: avalanche.id,
  [cronosChainId]: 100000019,
  [megaethChainId]: 100000031,
  [robinhoodChainId]: robinhood.id,
}

export const debridgeChainIdToChainId = invert(chainIdToDebridgeChainId)

export const DEBRIDGE_SUPPORTED_CHAIN_IDS = Object.keys(chainIdToDebridgeChainId)

export const DEFAULT_DEBRIDGE_TOKEN_ADDRESS = zeroAddress

export const DEFAULT_DEBRIDGE_USER_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
