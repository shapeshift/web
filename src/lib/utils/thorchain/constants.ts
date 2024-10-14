import { bn } from 'lib/bignumber/bignumber'

export const THOR_PRECISION = 8
export const BASE_BPS_POINTS = '10000'
export const THORCHAIN_AFFILIATE_NAME = 'ss'
export const THORCHAIN_POOL_MODULE_ADDRESS = 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0'
export const THORCHAIN_OUTBOUND_FEE_CRYPTO_BASE_UNIT = '2000000'

// Current blocktime as per https://thorchain.network/stats
export const THORCHAIN_BLOCK_TIME_SECONDS = '6'
export const thorchainBlockTimeMs = bn(THORCHAIN_BLOCK_TIME_SECONDS).times(1000).toNumber()
export const RUNEPOOL_DEPOSIT_MEMO = 'POOL+'
