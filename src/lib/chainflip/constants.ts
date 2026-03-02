import type { AssetId } from '@shapeshiftoss/caip'
import {
  btcAssetId,
  ethAssetId,
  flipAssetId,
  solAssetId,
  usdcAssetId,
  usdtAssetId,
} from '@shapeshiftoss/caip'

import type { ChainflipAsset, ChainflipAssetSymbol } from './types'

import { getConfig } from '@/config'

export const CF_RPC_URL = getConfig().VITE_CHAINFLIP_RPC_URL
export const BLOCKS_TO_EXPIRY = 120
export const CHAINFLIP_SS58_PREFIX = 2112

export const CHAINFLIP_GATEWAY_CONTRACT_ADDRESS = '0x6995ab7c4d7f4b03f467cf4c8e920427d9621dbd'
export const CHAINFLIP_FLIP_TOKEN_ADDRESS = '0x826180541412d574cf1336d22c0c0a287822678a'

export const ENVIRONMENT_PALLET_INDEX = 2
export const ENVIRONMENT_NON_NATIVE_SIGNED_CALL_INDEX = 10
export const ENVIRONMENT_BATCH_CALL_INDEX = 11

export const LENDING_POOLS_PALLET_INDEX = 53
export const LIQUIDITY_PROVIDER_PALLET_INDEX = 31

export const LENDING_POOLS_CALL_INDEX = {
  AddLenderFunds: 5,
  RemoveLenderFunds: 6,
  AddCollateral: 7,
  RemoveCollateral: 8,
  RequestLoan: 9,
  UpdateCollateralTopupAsset: 10,
  ExpandLoan: 11,
  MakeRepayment: 12,
  InitiateVoluntaryLiquidation: 13,
  StopVoluntaryLiquidation: 14,
} as const

export const LIQUIDITY_PROVIDER_CALL_INDEX = {
  RequestLiquidityDepositAddress: 0,
  WithdrawAsset: 1,
  RegisterLpAccount: 2,
  RegisterLiquidityRefundAddress: 4,
} as const

export const CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET: Partial<Record<ChainflipAssetSymbol, AssetId>> =
  {
    BTC: btcAssetId,
    ETH: ethAssetId,
    SOL: solAssetId,
    USDC: usdcAssetId,
    USDT: usdtAssetId,
    FLIP: flipAssetId,
  }

export const CHAINFLIP_LENDING_ASSET_BY_ASSET_ID: Partial<Record<AssetId, ChainflipAsset>> = {
  [btcAssetId]: { chain: 'Bitcoin', asset: 'BTC' },
  [ethAssetId]: { chain: 'Ethereum', asset: 'ETH' },
  [solAssetId]: { chain: 'Solana', asset: 'SOL' },
  [usdcAssetId]: { chain: 'Ethereum', asset: 'USDC' },
  [usdtAssetId]: { chain: 'Ethereum', asset: 'USDT' },
}
