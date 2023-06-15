import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  bchAssetId,
  binanceAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  fromAccountId,
  fromAssetId,
  ltcAssetId,
} from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import { getConfig } from 'config'
import memoize from 'lodash/memoize'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import type { BN } from 'lib/bignumber/bignumber'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { setTimeoutAsync } from 'lib/utils'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'

import type {
  MidgardPoolResponse,
  ThorchainSaverPositionResponse,
  ThorchainSaversDepositQuoteResponse,
  ThorchainSaversDepositQuoteResponseSuccess,
  ThorchainSaversWithdrawQuoteResponse,
  ThorchainSaversWithdrawQuoteResponseSuccess,
} from './types'

const THOR_PRECISION = '8'
export const BASE_BPS_POINTS = '10000'
const SAVERS_UPDATE_TIME = 25000 // The time it takes for savers to be updated (currently ~15s + some 10s buffer)

export const THORCHAIN_AFFILIATE_NAME = 'ss'
// BPS are needed as part of the memo, but 0bps won't incur any fees, only used for tracking purposes for now
const AFFILIATE_BPS = 0

// The minimum amount to be sent both for deposit and withdraws
// else it will be considered a dust attack and gifted to the network
export const THORCHAIN_SAVERS_DUST_THRESHOLDS = {
  [btcAssetId]: '30000',
  [bchAssetId]: '10000',
  [ltcAssetId]: '10000',
  [dogeAssetId]: '100000000',
  [ethAssetId]: '0',
  [avalancheAssetId]: '0',
  [cosmosAssetId]: '0',
  [binanceAssetId]: '0',
}

const SUPPORTED_THORCHAIN_SAVERS_ASSET_IDS = [
  cosmosAssetId,
  avalancheAssetId,
  ethAssetId,
  btcAssetId,
  bchAssetId,
  ltcAssetId,
  dogeAssetId,
]

const SUPPORTED_THORCHAIN_SAVERS_CHAIN_IDS = SUPPORTED_THORCHAIN_SAVERS_ASSET_IDS.map(
  assetId => fromAssetId(assetId).chainId,
)

export const getAccountAddressesWithBalances = async (
  accountId: AccountId,
): Promise<{ address: string; balance: string }[]> => {
  if (isUtxoAccountId(accountId)) {
    const { chainId, account: pubkey } = fromAccountId(accountId)
    const chainAdapters = getChainAdapterManager()
    const adapter = chainAdapters.get(chainId) as unknown as UtxoBaseAdapter<UtxoChainId>
    if (!adapter) throw new Error(`no adapter for ${chainId} not available`)

    const {
      chainSpecific: { addresses },
    } = await adapter.getAccount(pubkey)

    if (!addresses) return []

    return addresses.map(({ pubkey, balance }) => {
      const address = pubkey.startsWith('bitcoincash') ? pubkey.replace('bitcoincash:', '') : pubkey

      return { address, balance }
    })
  }

  // We don't need balances for chain others than UTXOs
  return [{ address: fromAccountId(accountId).account, balance: '' }]
}

// Memoized on accountId, see lodash docs:
// "By default, the first argument provided to the memoized function is used as the map cache key."
export const getAccountAddresses = memoize(
  async (accountId: AccountId): Promise<string[]> =>
    (await getAccountAddressesWithBalances(accountId)).map(({ address }) => address),
)

export const getThorchainPools = async (): Promise<ThornodePoolResponse[]> => {
  const { data: opportunitiesData } = await axios.get<ThornodePoolResponse[]>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pools`,
  )

  if (!opportunitiesData) return []

  return opportunitiesData
}

export const getAllThorchainSaversPositions = async (
  assetId: AssetId,
): Promise<ThorchainSaverPositionResponse[]> => {
  const poolId = assetIdToPoolAssetId({ assetId })

  if (!poolId) return []

  const { data: opportunitiesData } = await axios.get<ThorchainSaverPositionResponse[]>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolId}/savers`,
  )

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
  const allPositions = await getAllThorchainSaversPositions(assetId)

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

  return Ok({
    ...quoteData,
    memo: `${quoteData.memo}::${THORCHAIN_AFFILIATE_NAME}:${AFFILIATE_BPS}`,
  })
}

export const getThorchainSaversWithdrawQuote = async ({
  asset,
  accountId,
  bps,
}: {
  asset: Asset
  accountId: AccountId
  bps: string
}): Promise<ThorchainSaversWithdrawQuoteResponseSuccess> => {
  const poolId = assetIdToPoolAssetId({ assetId: asset.assetId })

  if (!poolId) throw new Error(`Invalid assetId for THORCHain savers: ${asset.assetId}`)

  const accountAddresses = await getAccountAddresses(accountId)

  const allPositions = await getAllThorchainSaversPositions(asset.assetId)

  if (!allPositions.length)
    throw new Error(`Error fetching THORCHain savers positions for assetId: ${asset.assetId}`)

  const accountPosition = allPositions.find(
    ({ asset_address }) =>
      asset_address === accountAddresses.find(accountAddress => accountAddress === asset_address),
  )

  if (!accountPosition) throw new Error('No THORChain savers position found')

  const { asset_address } = accountPosition

  const { data: quoteData } = await axios.get<ThorchainSaversWithdrawQuoteResponse>(
    `${
      getConfig().REACT_APP_THORCHAIN_NODE_URL
    }/lcd/thorchain/quote/saver/withdraw?asset=${poolId}&address=${asset_address}&withdraw_bps=${bps}`,
  )

  if (!quoteData || 'error' in quoteData)
    throw new Error(`Error fetching THORChain savers quote: ${quoteData?.error}`)

  return quoteData
}

export const getMidgardPools = async (): Promise<MidgardPoolResponse[]> => {
  const { data: poolsData } = await axios.get<MidgardPoolResponse[]>(
    `${getConfig().REACT_APP_MIDGARD_URL}/pools`,
  )

  if (!poolsData) return []

  return poolsData
}

export const fromThorBaseUnit = (valueThorBaseUnit: BigNumber.Value | null | undefined): BN =>
  bnOrZero(valueThorBaseUnit).div(bn(10).pow(THOR_PRECISION)) // to crypto precision from THOR 8 dp base unit

export const toThorBaseUnit = ({
  valueCryptoBaseUnit,
  asset,
}: {
  valueCryptoBaseUnit: BigNumber.Value | null | undefined
  asset: Asset
}): BN => {
  if (!asset?.precision) return bn(0)

  return bnOrZero(valueCryptoBaseUnit)
    .div(bn(10).pow(asset?.precision)) // to crypto precision from THOR 8 dp base unit
    .times(bn(10).pow(THOR_PRECISION))
    .decimalPlaces(0) // THORChain expects ints, not floats
}

export const isAboveDepositDustThreshold = ({
  valueCryptoBaseUnit,
  assetId,
}: {
  valueCryptoBaseUnit: BigNumber.Value | null | undefined
  assetId: AssetId
}) => bnOrZero(valueCryptoBaseUnit).gte(THORCHAIN_SAVERS_DUST_THRESHOLDS[assetId])

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

export const waitForSaversUpdate = () => setTimeoutAsync(SAVERS_UPDATE_TIME)

export const makeDaysToBreakEven = ({
  expectedAmountOutThorBaseUnit,
  amountCryptoBaseUnit,
  asset,
  apy,
}: {
  expectedAmountOutThorBaseUnit: string
  amountCryptoBaseUnit: BigNumber
  asset: Asset
  apy: string
}) => {
  const amountCryptoThorBaseUnit = toThorBaseUnit({
    valueCryptoBaseUnit: amountCryptoBaseUnit,
    asset,
  })
  // The total downside that goes into a savers deposit, from THOR docs;
  // "the minimum amount of the target asset the user can expect to deposit after fees"
  // https://thornode.ninerealms.com/thorchain/doc/
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
