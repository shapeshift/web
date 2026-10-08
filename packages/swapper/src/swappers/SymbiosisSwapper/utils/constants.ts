import type { ChainId } from '@shapeshiftoss/caip'
import {
  abstractChainId,
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  berachainChainId,
  bscChainId,
  cronosChainId,
  ethChainId,
  fromChainId,
  gnosisChainId,
  hyperEvmChainId,
  katanaChainId,
  lineaChainId,
  mantleChainId,
  modeChainId,
  monadChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  robinhoodChainId,
  scrollChainId,
  seiChainId,
  soneiumChainId,
  sonicChainId,
  tronChainId,
  unichainChainId,
  zkSyncEraChainId,
} from '@shapeshiftoss/caip'

const SYMBIOSIS_TRON_CHAIN_ID = 728126428

const SYMBIOSIS_SUPPORTED_EVM_CHAIN_IDS: ChainId[] = [
  ethChainId,
  bscChainId,
  polygonChainId,
  avalancheChainId,
  arbitrumChainId,
  optimismChainId,
  baseChainId,
  gnosisChainId,
  zkSyncEraChainId,
  lineaChainId,
  scrollChainId,
  mantleChainId,
  modeChainId,
  seiChainId,
  cronosChainId,
  sonicChainId,
  abstractChainId,
  berachainChainId,
  unichainChainId,
  soneiumChainId,
  hyperEvmChainId,
  katanaChainId,
  plasmaChainId,
  monadChainId,
  robinhoodChainId,
]

// Symbiosis uses the EVM chain reference as its chain id, and its own id for Tron
const SYMBIOSIS_CHAIN_ID_ENTRIES: [ChainId, number][] = [
  ...SYMBIOSIS_SUPPORTED_EVM_CHAIN_IDS.map((chainId): [ChainId, number] => [
    chainId,
    Number(fromChainId(chainId).chainReference),
  ]),
  [tronChainId, SYMBIOSIS_TRON_CHAIN_ID],
]

export const chainIdToSymbiosisChainId: Partial<Record<ChainId, number>> = Object.fromEntries(
  SYMBIOSIS_CHAIN_ID_ENTRIES,
)

export const symbiosisChainIdToChainId: Partial<Record<number, ChainId>> = Object.fromEntries(
  SYMBIOSIS_CHAIN_ID_ENTRIES.map(([chainId, symbiosisChainId]) => [symbiosisChainId, chainId]),
)

// Disabled liquidity providers: bridges we integrate directly, custodial Changelly, and intent routes that skip the partner fee
export const SYMBIOSIS_DISABLED_PROVIDERS =
  'chainflip-bridge,thorchain-bridge,changelly,intent-solver'

export const SYMBIOSIS_CROSSCHAIN_SWAP_KIND = 'crosschain-swap'
export const SYMBIOSIS_SRC_CHAIN_SWAP_LABEL = 'src-chain-swap'

// Labels on routes with a leg outside Symbiosis
export const SYMBIOSIS_PARTNER_SWAP_LABEL = 'partner-swap'
export const SYMBIOSIS_SEMI_CENTRALIZED_LABEL = 'semi-centralized'

// /v2/quote answers 'Slippage is too low' under 10 and 'too high' over 1000
export const SYMBIOSIS_MIN_SLIPPAGE_BPS = 10
export const SYMBIOSIS_MAX_SLIPPAGE_BPS = 1000

// Our registered partner address and the fixed fee rate Symbiosis has configured for it
export const SYMBIOSIS_PARTNER_ADDRESS = '0xF5AA59151bE6515C4Ca68A0282CF68B3eA4846fC'
export const SYMBIOSIS_PARTNER_FEE_BPS = '60'
export const SYMBIOSIS_PARTNER_FEE_DESCRIPTION = 'Partner fee'

// Sent as X-Partner-Id so Symbiosis attributes our swaps to this client id in its explorer and metrics
export const SYMBIOSIS_PARTNER_ID = 'shapeshift'

export const DEFAULT_SYMBIOSIS_EVM_USER_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
export const DEFAULT_SYMBIOSIS_TRON_USER_ADDRESS = 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7'

// metaRoute energy over 31 mainnet calls on 2026-10-05: up to 467,826 bridging the sell token, up to 578,456 with a source swap first
export const SYMBIOSIS_TRON_BRIDGE_ENERGY = '470000'
export const SYMBIOSIS_TRON_SOURCE_SWAP_ENERGY = '580000'

export const SYMBIOSIS_EXPLORER_URL = 'https://explorer.symbiosis.finance'
