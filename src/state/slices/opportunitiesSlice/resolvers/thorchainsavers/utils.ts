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
import { assetIdToPoolAssetId } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import { getConfig } from 'config'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import { fromThorBaseUnit, getAccountAddresses, toThorBaseUnit } from 'lib/utils/thorchain'
import { BASE_BPS_POINTS, THORCHAIN_AFFILIATE_NAME } from 'lib/utils/thorchain/constants'
import { isUtxoChainId } from 'lib/utils/utxo'

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

// BPS are needed as part of the memo, but 0bps won't incur any fees, only used for tracking purposes for now
const AFFILIATE_BPS = 0

const usdcEthereumAssetId: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const usdcAvalancheAssetId: AssetId =
  'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e'
const usdtEthereumAssetId: AssetId = 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7'

// The minimum amount to be sent both for deposit and withdraws
// else it will be considered a dust attack and gifted to the network
export const THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT = {
  [btcAssetId]: '30000',
  [bchAssetId]: '10000',
  [ltcAssetId]: '10000',
  [dogeAssetId]: '100000000',
  [ethAssetId]: '10000000000',
  [avalancheAssetId]: '10000000000',
  [bscAssetId]: '10000000000',
  [cosmosAssetId]: '1', // the inbound address dust_threshold is '0', but LP withdrawls fail without a dust value
  [thorchainAssetId]: '1', // partial LP withdrawls fail without a dust value
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

const SUPPORTED_THORCHAIN_SAVERS_CHAIN_IDS = SUPPORTED_THORCHAIN_SAVERS_ASSET_IDS.map(
  assetId => fromAssetId(assetId).chainId,
)

export const getAllThorchainSaversPositions = async (
  assetId: AssetId,
): Promise<ThorchainSaverPositionResponse[]> => {
  const poolId = assetIdToPoolAssetId({ assetId })

  if (!poolId) return []

  const { data: opportunitiesData } = await queryClient.fetchQuery({
    queryKey: ['thorchainSaversPositions', poolId],
    queryFn: () =>
      axios.get<ThorchainSaverPositionResponse[]>(
        `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolId}/savers`,
      ),
    staleTime: 60_000,
  })

  if (!opportunitiesData) return []

  return opportunitiesData
}

export const getThorchainSaversPosition = async ({
  accountId,
  assetId,
}: {
  accountId: AccountId
  assetId: AssetId
}): Promise<ThorchainSaverPositionResponse | null> => {
  const address = fromAccountId(accountId).account
  const poolAssetId = assetIdToPoolAssetId({ assetId })

  const accountPosition = await (async () => {
    if (assetId === thorchainAssetId) {
      const { data: runepoolInformation } = await queryClient.fetchQuery({
        queryKey: ['thorchainRunepoolOpportunity', accountId],
        queryFn: () =>
          axios.get<ThorchainRunepoolProviderResponseSuccess>(
            `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/rune_provider/${address}`,
          ),
      })

      const runepoolOpportunity: ThorchainSaverPositionResponse = {
        asset: 'THOR.RUNE',
        asset_address: runepoolInformation.rune_address,
        last_add_height: runepoolInformation.last_deposit_height,
        units: runepoolInformation.units,
        asset_deposit_value: bnOrZero(runepoolInformation.deposit_amount)
          .minus(runepoolInformation.withdraw_amount)
          .toFixed(),
        asset_redeem_value: runepoolInformation.value,
        growth_pct: undefined,
      }

      return runepoolOpportunity
    }

    if (!isUtxoChainId(fromAssetId(assetId).chainId))
      return (
        await axios.get<ThorchainSaverPositionResponse>(
          `${
            getConfig().REACT_APP_THORCHAIN_NODE_URL
          }/lcd/thorchain/pool/${poolAssetId}/saver/${address}`,
        )
      ).data

    const lendingPositionsResponse = await getAllThorchainSaversPositions(assetId)

    const allPositions = lendingPositionsResponse
    if (!allPositions.length) {
      throw new Error(`No lending positions found for asset ID: ${assetId}`)
    }

    if (!allPositions.length)
      throw new Error(`Error fetching THORCHain savers positions for assetId: ${assetId}`)

    // Returns either
    // - A tuple made of a single address for EVM and Cosmos chains since the address *is* the account
    // - An array of many addresses for UTXOs, since an xpub can derive many many addresses
    const accountAddresses = await getAccountAddresses(accountId)

    const accountPosition = allPositions.find(
      ({ asset_address }) =>
        asset_address === accountAddresses.find(accountAddress => accountAddress === asset_address),
    )

    if (!accountPosition) {
      return null
    }

    return accountPosition
  })()

  return accountPosition || null
}

export const getMaybeThorchainSaversDepositQuote = async ({
  asset,
  amountCryptoBaseUnit,
}: {
  asset: Asset
  amountCryptoBaseUnit: BigNumber.Value | null | undefined
}): Promise<Result<ThorchainSaversDepositQuoteResponseSuccess, string>> => {
  const poolId = assetIdToPoolAssetId({ assetId: asset.assetId })

  if (!poolId) return Err(`Invalid assetId for THORCHain savers: ${asset.assetId}`)

  const amountThorBaseUnit = toThorBaseUnit({
    valueCryptoBaseUnit: amountCryptoBaseUnit,
    asset,
  }).toString()

  const { data: quoteData } = await axios.get<ThorchainSaversDepositQuoteResponse>(
    `${
      getConfig().REACT_APP_THORCHAIN_NODE_URL
    }/lcd/thorchain/quote/saver/deposit?asset=${poolId}&amount=${amountThorBaseUnit}&affiliate=${THORCHAIN_AFFILIATE_NAME}&affiliate_bps=${AFFILIATE_BPS}`,
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
  const poolId = assetIdToPoolAssetId({ assetId: asset.assetId })

  if (!poolId) return Err(`Invalid assetId for THORCHain savers: ${asset.assetId}`)

  const accountAddresses = await getAccountAddresses(accountId)

  const allPositions = await getAllThorchainSaversPositions(asset.assetId)

  if (!allPositions.length)
    return Err(`Error fetching THORCHain savers positions for assetId: ${asset.assetId}`)

  const accountPosition = allPositions.find(
    ({ asset_address }) =>
      asset_address === accountAddresses.find(accountAddress => accountAddress === asset_address),
  )

  if (!accountPosition) return Err('No THORChain savers position found')

  const { asset_address } = accountPosition

  const { data: quoteData } = await axios.get<ThorchainSaversWithdrawQuoteResponse>(
    `${
      getConfig().REACT_APP_THORCHAIN_NODE_URL
    }/lcd/thorchain/quote/saver/withdraw?asset=${poolId}&address=${asset_address}&withdraw_bps=${bps}`,
  )

  if (!quoteData || 'error' in quoteData)
    return Err(`Error fetching THORChain savers quote: ${quoteData?.error}`)

  return Ok(quoteData)
}

export const getMidgardPools = async (
  period?: MidgardPoolPeriod,
): Promise<MidgardPoolResponse[]> => {
  const maybePeriodQueryParameter: MidgardPoolRequest = period ? { period } : {}
  const { data: poolsData } = await axios.get<MidgardPoolResponse[]>(
    `${getConfig().REACT_APP_MIDGARD_URL}/pools`,
    { params: maybePeriodQueryParameter },
  )

  if (!poolsData) return []

  return poolsData
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

  const withdrawBps = withdrawRatio.times(BASE_BPS_POINTS).toFixed(0)

  return withdrawBps
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
  // The total downside that goes into a savers deposit, from THOR docs;
  // "the minimum amount of the target asset the user can expect to deposit after fees"
  // https://daemon.thorchain.shapeshift.com/lcd/thorchain/doc
  const depositFeeCryptoPrecision = bnOrZero(
    fromThorBaseUnit(amountCryptoThorBaseUnit.minus(expectedAmountOutThorBaseUnit)),
  )
  // Daily upside
  const dailyEarnAmount = bnOrZero(fromThorBaseUnit(expectedAmountOutThorBaseUnit))
    .times(apy)
    .div(365)

  const daysToBreakEvenOrZero = bnOrZero(1)
    .div(dailyEarnAmount.div(depositFeeCryptoPrecision))
    .toFixed()
  // If daysToBreakEvenOrZero is a fraction of 1, the daily upside is effectively higher than the fees
  // meaning the user will break even in a timeframe between the first rewards accrual (e.g next THOR block after deposit is confirmed)
  // and ~ a day after deposit
  const daysToBreakEven = BigNumber.max(daysToBreakEvenOrZero, 1).toFixed(0)
  return daysToBreakEven
}
