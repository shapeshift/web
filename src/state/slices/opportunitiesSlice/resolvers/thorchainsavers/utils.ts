import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  bchAssetId,
  binanceAssetId,
  bscAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  fromAccountId,
  fromAssetId,
  ltcAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'
import { assetIdToThorPoolAssetId } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import uniq from 'lodash/uniq'

import type {
  MidgardPoolPeriod,
  MidgardPoolRequest,
  MidgardPoolResponse,
  ThorchainRunepoolProviderResponseSuccess,
  ThorchainSaverPositionResponse,
  ThorchainSaversDepositQuoteResponse,
  ThorchainSaversDepositQuoteResponseSuccess,
  ThorchainSaversWithdrawQuoteResponse,
  ThorchainSaversWithdrawQuoteResponseSuccess,
} from './types'

import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { BigNumber, bnOrZero } from '@/lib/bignumber/bignumber'
import { fetchMidgardPoolsGraphQL } from '@/lib/graphql/midgardData'
import { fetchPoolSaversGraphQL, fetchRuneProviderGraphQL } from '@/lib/graphql/thornodeData'
import { fromThorBaseUnit, getAccountAddresses, toThorBaseUnit } from '@/lib/utils/thorchain'
import { BASE_BPS_POINTS, THORCHAIN_AFFILIATE_NAME } from '@/lib/utils/thorchain/constants'
import { isUtxoChainId } from '@/lib/utils/utxo'
import { selectFeatureFlag } from '@/state/slices/preferencesSlice/selectors'
import { store } from '@/state/store'

const AFFILIATE_BPS = 0

const usdcEthereumAssetId: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const usdcAvalancheAssetId: AssetId =
  'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e'
const usdtEthereumAssetId: AssetId = 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7'

export const THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT = {
  [btcAssetId]: '10000',
  [bchAssetId]: '10000',
  [ltcAssetId]: '10000',
  [dogeAssetId]: '100000000',
  [ethAssetId]: '10000000000',
  [avalancheAssetId]: '10000000000',
  [bscAssetId]: '10000000000',
  [cosmosAssetId]: '1',
  [thorchainAssetId]: '1',
  [binanceAssetId]: '0',
  [usdcEthereumAssetId]: '0',
  [usdtEthereumAssetId]: '0',
  [usdcAvalancheAssetId]: '0',
}

const SUPPORTED_THORCHAIN_SAVERS_ASSET_IDS = [
  cosmosAssetId,
  avalancheAssetId,
  ethAssetId,
  bscAssetId,
  btcAssetId,
  bchAssetId,
  ltcAssetId,
  dogeAssetId,
  usdcEthereumAssetId,
  usdtEthereumAssetId,
  usdcAvalancheAssetId,
  thorchainAssetId,
]

export const SUPPORTED_THORCHAIN_SAVERS_CHAIN_IDS = uniq(
  SUPPORTED_THORCHAIN_SAVERS_ASSET_IDS.map(assetId => fromAssetId(assetId).chainId),
)

const mapGraphQLSaverToPosition = (s: {
  asset: string
  assetAddress: string
  lastAddHeight: number
  units: string
  assetDepositValue: string
  assetRedeemValue: string
  growthPct: string
}): ThorchainSaverPositionResponse => ({
  asset: s.asset,
  asset_address: s.assetAddress,
  last_add_height: s.lastAddHeight,
  units: s.units,
  asset_deposit_value: s.assetDepositValue,
  asset_redeem_value: s.assetRedeemValue,
  growth_pct: s.growthPct,
})

export const getAllThorchainSaversPositions = async (
  assetId: AssetId,
): Promise<ThorchainSaverPositionResponse[]> => {
  const poolId = assetIdToThorPoolAssetId({ assetId })
  if (!poolId) return []

  const isGraphQLEnabled = selectFeatureFlag(store.getState(), 'GraphQLPoc')

  if (isGraphQLEnabled) {
    try {
      const graphqlSavers = await fetchPoolSaversGraphQL(poolId)
      return graphqlSavers.map(mapGraphQLSaverToPosition)
    } catch (error) {
      console.error('[getAllThorchainSaversPositions] GraphQL failed, falling back:', error)
    }
  }

  const { data: opportunitiesData } = await queryClient.fetchQuery({
    queryKey: ['thorchainSaversPositions', poolId],
    queryFn: () =>
      axios.get<ThorchainSaverPositionResponse[]>(
        `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/pool/${poolId}/savers`,
      ),
    staleTime: 60_000,
  })

  return opportunitiesData ?? []
}

export const getThorchainSaversPosition = async ({
  accountId,
  assetId,
}: {
  accountId: AccountId
  assetId: AssetId
}): Promise<ThorchainSaverPositionResponse | null> => {
  const address = fromAccountId(accountId).account
  const poolAssetId = assetIdToThorPoolAssetId({ assetId })
  const isGraphQLEnabled = selectFeatureFlag(store.getState(), 'GraphQLPoc')

  if (!poolAssetId) return null

  if (assetId === thorchainAssetId) {
    if (isGraphQLEnabled) {
      try {
        const runeProvider = await fetchRuneProviderGraphQL(address)
        if (!runeProvider) return null

        return {
          asset: 'THOR.RUNE',
          asset_address: runeProvider.runeAddress,
          last_add_height: runeProvider.lastDepositHeight,
          units: runeProvider.units,
          asset_deposit_value: bnOrZero(runeProvider.depositAmount)
            .minus(runeProvider.withdrawAmount)
            .plus(runeProvider.pnl)
            .toFixed(),
          asset_redeem_value: runeProvider.value,
          growth_pct: undefined,
        }
      } catch (error) {
        console.error(
          '[getThorchainSaversPosition] GraphQL runeProvider failed, falling back:',
          error,
        )
      }
    }

    const { data: runepoolInformation } = await axios.get<ThorchainRunepoolProviderResponseSuccess>(
      `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/rune_provider/${address}`,
    )

    return {
      asset: 'THOR.RUNE',
      asset_address: runepoolInformation.rune_address,
      last_add_height: runepoolInformation.last_deposit_height,
      units: runepoolInformation.units,
      asset_deposit_value: bnOrZero(runepoolInformation.deposit_amount)
        .minus(runepoolInformation.withdraw_amount)
        .plus(runepoolInformation.pnl)
        .toFixed(),
      asset_redeem_value: runepoolInformation.value,
      growth_pct: undefined,
    }
  }

  if (!isUtxoChainId(fromAssetId(assetId).chainId)) {
    if (isGraphQLEnabled) {
      const allSavers = await getAllThorchainSaversPositions(assetId)
      return allSavers.find(s => s.asset_address.toLowerCase() === address.toLowerCase()) ?? null
    }
    return (
      await axios.get<ThorchainSaverPositionResponse>(
        `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/pool/${poolAssetId}/saver/${address}`,
      )
    ).data
  }

  const allPositions = await getAllThorchainSaversPositions(assetId)
  if (!allPositions.length) return null

  const accountAddresses = await getAccountAddresses(accountId)
  return allPositions.find(({ asset_address }) => accountAddresses.includes(asset_address)) ?? null
}

export const getMaybeThorchainSaversDepositQuote = async ({
  asset,
  amountCryptoBaseUnit,
}: {
  asset: Asset
  amountCryptoBaseUnit: BigNumber.Value | null | undefined
}): Promise<Result<ThorchainSaversDepositQuoteResponseSuccess, string>> => {
  const poolId = assetIdToThorPoolAssetId({ assetId: asset.assetId })
  if (!poolId) return Err(`Invalid assetId for THORCHain savers: ${asset.assetId}`)

  const amountThorBaseUnit = toThorBaseUnit({
    valueCryptoBaseUnit: amountCryptoBaseUnit,
    asset,
  }).toString()

  const { data: quoteData } = await axios.get<ThorchainSaversDepositQuoteResponse>(
    `${
      getConfig().VITE_THORCHAIN_NODE_URL
    }/thorchain/quote/saver/deposit?asset=${poolId}&amount=${amountThorBaseUnit}&affiliate=${THORCHAIN_AFFILIATE_NAME}&affiliate_bps=${AFFILIATE_BPS}`,
  )

  if (!quoteData || 'error' in quoteData)
    return Err(`Error fetching THORChain savers quote: ${quoteData?.error}`)

  return Ok(quoteData)
}

export const getThorchainSaversWithdrawQuote = async ({
  asset,
  accountId,
  bps,
}: {
  asset: Asset
  accountId: AccountId
  bps: string
}): Promise<Result<ThorchainSaversWithdrawQuoteResponseSuccess, string>> => {
  const poolId = assetIdToThorPoolAssetId({ assetId: asset.assetId })
  if (!poolId) return Err(`Invalid assetId for THORCHain savers: ${asset.assetId}`)

  const accountAddresses = await getAccountAddresses(accountId)
  const allPositions = await getAllThorchainSaversPositions(asset.assetId)

  if (!allPositions.length)
    return Err(`Error fetching THORCHain savers positions for assetId: ${asset.assetId}`)

  const accountPosition = allPositions.find(({ asset_address }) =>
    accountAddresses.includes(asset_address),
  )

  if (!accountPosition) return Err('No THORChain savers position found')

  const { data: quoteData } = await axios.get<ThorchainSaversWithdrawQuoteResponse>(
    `${
      getConfig().VITE_THORCHAIN_NODE_URL
    }/thorchain/quote/saver/withdraw?asset=${poolId}&address=${
      accountPosition.asset_address
    }&withdraw_bps=${bps}`,
  )

  if (!quoteData || 'error' in quoteData)
    return Err(`Error fetching THORChain savers quote: ${quoteData?.error}`)

  return Ok(quoteData)
}

export const getMidgardPools = async (
  period?: MidgardPoolPeriod,
): Promise<MidgardPoolResponse[]> => {
  const isGraphQLEnabled = selectFeatureFlag(store.getState(), 'GraphQLPoc')

  if (isGraphQLEnabled) {
    try {
      const graphqlPools = await fetchMidgardPoolsGraphQL(period)
      return graphqlPools.map(pool => ({
        annualPercentageRate: pool.annualPercentageRate,
        asset: pool.asset,
        assetDepth: pool.assetDepth,
        assetPrice: pool.assetPrice,
        assetPriceUSD: pool.assetPriceUSD,
        liquidityUnits: pool.liquidityUnits,
        nativeDecimal: pool.nativeDecimal,
        poolAPY: pool.poolAPY,
        runeDepth: pool.runeDepth,
        saversAPR: pool.saversAPR,
        saversDepth: pool.saversDepth,
        saversUnits: pool.saversUnits,
        status: pool.status,
        synthSupply: pool.synthSupply,
        synthUnits: pool.synthUnits,
        units: pool.units,
        volume24h: pool.volume24h,
      }))
    } catch (error) {
      console.error('[getMidgardPools] GraphQL failed, falling back:', error)
    }
  }

  const params: MidgardPoolRequest = period ? { period } : {}
  const { data: poolsData } = await axios.get<MidgardPoolResponse[]>(
    `${getConfig().VITE_THORCHAIN_MIDGARD_URL}/pools`,
    { params },
  )
  return poolsData ?? []
}

export const isAboveDepositDustThreshold = ({
  valueCryptoBaseUnit,
  assetId,
}: {
  valueCryptoBaseUnit: BigNumber.Value | null | undefined
  assetId: AssetId
}) => bnOrZero(valueCryptoBaseUnit).gte(THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[assetId])

export const getWithdrawBps = ({
  withdrawAmountCryptoBaseUnit,
  stakedAmountCryptoBaseUnit,
  rewardsAmountCryptoBaseUnit,
}: {
  withdrawAmountCryptoBaseUnit: BigNumber.Value
  stakedAmountCryptoBaseUnit: BigNumber.Value
  rewardsAmountCryptoBaseUnit: BigNumber.Value
}) => {
  const stakedAmountCryptoBaseUnitIncludeRewards = bnOrZero(stakedAmountCryptoBaseUnit).plus(
    rewardsAmountCryptoBaseUnit,
  )
  const withdrawRatio = bnOrZero(withdrawAmountCryptoBaseUnit).div(
    stakedAmountCryptoBaseUnitIncludeRewards,
  )
  return withdrawRatio.times(BASE_BPS_POINTS).toFixed(0)
}

export const isSupportedThorchainSaversAssetId = (assetId: AssetId) =>
  SUPPORTED_THORCHAIN_SAVERS_ASSET_IDS.includes(assetId)

export const isSupportedThorchainSaversChainId = (chainId: ChainId) =>
  SUPPORTED_THORCHAIN_SAVERS_CHAIN_IDS.includes(chainId)

export const makeDaysToBreakEven = ({
  expectedAmountOutThorBaseUnit,
  amountCryptoBaseUnit,
  asset,
  apy,
}: {
  expectedAmountOutThorBaseUnit: string
  amountCryptoBaseUnit: BigNumber.Value
  asset: Asset
  apy: string
}) => {
  const amountCryptoThorBaseUnit = toThorBaseUnit({
    valueCryptoBaseUnit: amountCryptoBaseUnit,
    asset,
  })
  const depositFeeCryptoPrecision = bnOrZero(
    fromThorBaseUnit(amountCryptoThorBaseUnit.minus(expectedAmountOutThorBaseUnit)),
  )
  const dailyEarnAmount = bnOrZero(fromThorBaseUnit(expectedAmountOutThorBaseUnit))
    .times(apy)
    .div(365)
  const daysToBreakEvenOrZero = bnOrZero(1)
    .div(dailyEarnAmount.div(depositFeeCryptoPrecision))
    .toFixed()
  return BigNumber.max(daysToBreakEvenOrZero, 1).toFixed(0)
}
