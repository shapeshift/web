import { type AccountId, type AssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { AxiosError } from 'axios'
import axios from 'axios'
import { getConfig } from 'config'
import { bn } from 'lib/bignumber/bignumber'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'

import { fromThorBaseUnit, getAccountAddresses } from '.'
import type {
  MidgardLiquidityProvider,
  MidgardLiquidityProvidersList,
  MidgardPool,
  MidgardSwapHistoryResponse,
  ThorchainLiquidityProvidersResponseSuccess,
} from './lp/types'

export const getAllThorchainLiquidityProviderPositions = async (
  assetId: AssetId,
): Promise<ThorchainLiquidityProvidersResponseSuccess> => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })

  if (!poolAssetId) throw new Error(`Pool asset not found for assetId ${assetId}`)

  const { data } = await axios.get<ThorchainLiquidityProvidersResponseSuccess>(
    `${
      getConfig().REACT_APP_THORCHAIN_NODE_URL
    }/lcd/thorchain/pool/${poolAssetId}/liquidity_providers`,
  )

  if (!data || 'error' in data) return []

  return data
}

export const getAllThorchainLiquidityMembers = async (): Promise<MidgardLiquidityProvidersList> => {
  const { data } = await axios.get<MidgardLiquidityProvidersList>(
    `${getConfig().REACT_APP_MIDGARD_URL}/members`,
  )

  if (!data?.length || 'error' in data) return []

  return data
}

export const getThorchainLiquidityMember = async (
  address: string,
): Promise<MidgardLiquidityProvider | null> => {
  try {
    const { data } = await axios.get<MidgardLiquidityProvider>(
      `${getConfig().REACT_APP_MIDGARD_URL}/member/${address}`,
    )

    return data
  } catch (e) {
    // THORCHain returns a 404 which is perfectly valid, but axios catches as an error
    // We only want to log errors to the console if they're actual errors, not 404s
    if ((e as AxiosError).isAxiosError && (e as AxiosError).response?.status !== 404)
      console.error(e)

    return null
  }
}

export const getThorchainLiquidityProviderPosition = async ({
  accountId,
  assetId,
}: {
  accountId: AccountId
  assetId: AssetId
}): Promise<MidgardPool[] | null> => {
  const accountPosition = await (async () => {
    if (!isUtxoChainId(fromAssetId(assetId).chainId)) {
      const address = fromAccountId(accountId).account
      return getThorchainLiquidityMember(address)
    }

    const allMembers = await getAllThorchainLiquidityMembers()

    if (!allMembers.length) {
      throw new Error(`No THORChain members found`)
    }

    const accountAddresses = await getAccountAddresses(accountId)

    const foundMember = allMembers.find(member => accountAddresses.includes(member))
    if (!foundMember) return null

    return getThorchainLiquidityMember(foundMember)
  })()
  if (!accountPosition) return null

  // An address may be shared across multiple pools for EVM chains, which could produce wrong results
  const positions = accountPosition.pools.filter(
    pool => pool.pool === assetIdToPoolAssetId({ assetId }),
  )

  return positions
}

export const calculateTVL = (
  assetDepthCryptoBaseUnit: string,
  runeDepthCryptoBaseUnit: string,
  runePrice: string,
): string => {
  const assetDepthCryptoPrecision = fromThorBaseUnit(assetDepthCryptoBaseUnit)
  const runeDepthCryptoPrecision = fromThorBaseUnit(runeDepthCryptoBaseUnit)

  const assetValueFiatUserCurrency = assetDepthCryptoPrecision.times(runePrice)
  const runeValueFiatUserCurrency = runeDepthCryptoPrecision.times(runePrice)

  const tvl = assetValueFiatUserCurrency.plus(runeValueFiatUserCurrency).times(2)

  return tvl.toFixed()
}

export const getVolume = async (
  timeframe: '24h' | '7d',
  assetId: AssetId,
  runePrice: string,
): Promise<string> => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })
  const days = timeframe === '24h' ? '1' : '7'

  const { data } = await axios.get<MidgardSwapHistoryResponse>(
    `${
      getConfig().REACT_APP_MIDGARD_URL
    }/history/swaps?interval=day&count=${days}&pool=${poolAssetId}`,
  )

  const volume = (data?.intervals ?? []).reduce(
    (acc, { totalVolume }) => acc.plus(totalVolume),
    bn(0),
  )

  return fromThorBaseUnit(volume).times(runePrice).toFixed()
}

export const getRedeemable = (
  liquidityUnits: string,
  poolUnits: string,
  assetDepth: string,
  runeDepth: string,
): { redeemableRune: string; redeemableAsset: string } => {
  const liquidityUnitsCryptoPrecision = fromThorBaseUnit(liquidityUnits)
  const poolUnitsCryptoPrecision = fromThorBaseUnit(poolUnits)
  const assetDepthCryptoPrecision = fromThorBaseUnit(assetDepth)
  const runeDepthCryptoPrecision = fromThorBaseUnit(runeDepth)

  const poolShare = liquidityUnitsCryptoPrecision.div(poolUnitsCryptoPrecision)
  const redeemableRune = poolShare.times(runeDepthCryptoPrecision).toFixed()
  const redeemableAsset = poolShare.times(assetDepthCryptoPrecision).toFixed()

  return {
    redeemableRune,
    redeemableAsset,
  }
}
