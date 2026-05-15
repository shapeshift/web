import {
  ASSET_NAMESPACE,
  btcAssetId,
  btcChainId,
  starknetChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import { DAO_TREASURY_BASE } from '@shapeshiftoss/utils'

export const GARDEN_API_BASE_URL = 'https://api.garden.finance/v2'

export const GARDEN_API_KEY_HEADER = 'garden-app-id'

export const STRKBTC_TOKEN_CONTRACT_ADDRESS =
  '0x0787150e306e6eae6e3f79dea881770e8bbff2c1b8eb490f969669ee945b3135'

export const GARDEN_BITCOIN_ASSET = 'bitcoin:btc'
export const GARDEN_STRKBTC_ASSET = 'starknet:strkbtc'

export const strkbtcAssetId = toAssetId({
  chainId: starknetChainId,
  assetNamespace: ASSET_NAMESPACE.starknetToken,
  assetReference: STRKBTC_TOKEN_CONTRACT_ADDRESS,
})

export { btcAssetId as gardenBitcoinAssetId, btcChainId }

export const GARDEN_AFFILIATE_FEE_ASSET = 'base:cbbtc' as const
export const GARDEN_AFFILIATE_FEE_RECIPIENT = DAO_TREASURY_BASE

export const GARDEN_QUOTE_DEADLINE_MS = 60 * 1000

export const GARDEN_DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005'
