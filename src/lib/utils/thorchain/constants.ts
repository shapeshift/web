import type { AssetId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  bchAssetId,
  binanceAssetId,
  bscAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  ltcAssetId,
  thorchainAssetId,
  tronAssetId,
} from '@shapeshiftoss/caip'

import { bn } from '@/lib/bignumber/bignumber'

export const THOR_PRECISION = 8
export const BASE_BPS_POINTS = '10000'
export const THORCHAIN_AFFILIATE_NAME = 'ss'
export const THORCHAIN_POOL_MODULE_ADDRESS = 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0'
export const THORCHAIN_TCY_MODULE_ADDRESS = 'thor128a8hqnkaxyqv7qwajpggmfyudh64jl3c32vyv'
export const THORCHAIN_OUTBOUND_FEE_CRYPTO_BASE_UNIT = '2000000'

// Current blocktime as per https://thorchain.network/stats
export const THORCHAIN_BLOCK_TIME_SECONDS = '6'
export const thorchainBlockTimeMs = bn(THORCHAIN_BLOCK_TIME_SECONDS).times(1000).toNumber()
export const RUNEPOOL_DEPOSIT_MEMO = 'POOL+'

const usdcEthereumAssetId: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const usdcAvalancheAssetId: AssetId =
  'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e'
const usdtEthereumAssetId: AssetId = 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7'

// The minimum amount to be sent both for deposit and withdraws
// else it will be considered a dust attack and gifted to the network
export const THORCHAIN_DUST_THRESHOLDS_CRYPTO_BASE_UNIT: Record<AssetId, string> = {
  [btcAssetId]: '10000',
  [bchAssetId]: '10000',
  [ltcAssetId]: '10000',
  [dogeAssetId]: '100000000',
  [ethAssetId]: '10000000000',
  [avalancheAssetId]: '10000000000',
  [bscAssetId]: '10000000000',
  [cosmosAssetId]: '1', // the inbound address dust_threshold is '0', but LP withdrawls fail without a dust value
  [thorchainAssetId]: '1', // partial LP withdrawls fail without a dust value
  [tronAssetId]: '1', // the inbound address dust_threshold is '0', but TRON rejects 0-value transactions
  [binanceAssetId]: '0',
  [usdcEthereumAssetId]: '0',
  [usdtEthereumAssetId]: '0',
  [usdcAvalancheAssetId]: '0',
}
