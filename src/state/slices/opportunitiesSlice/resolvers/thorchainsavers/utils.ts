import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import {
  adapters,
  avalancheAssetId,
  bchAssetId,
  binanceAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  fromAccountId,
  ltcAssetId,
} from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import axios from 'axios'
import { getConfig } from 'config'
import memoize from 'lodash/memoize'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BigNumber, BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'

import type {
  MidgardPoolResponse,
  ThorchainSaverPositionResponse,
  ThorchainSaversDepositQuoteResponse,
  ThorchainSaversDepositQuoteResponseSuccess,
  ThorchainSaversWithdrawQuoteResponse,
  ThorchainSaversWithdrawQuoteResponseSuccess,
} from './types'

export const THOR_PRECISION = '8'
const BASE_BPS_POINTS = '10000'

// The minimum amount to be sent both for deposit and withdraws
// else it will be considered a dust attack and gifted to the network
export const THORCHAIN_SAVERS_DUST_THRESHOLDS = {
  [btcAssetId]: '10000',
  [bchAssetId]: '10000',
  [ltcAssetId]: '10000',
  [dogeAssetId]: '100000000',
  [ethAssetId]: '0',
  [avalancheAssetId]: '0',
  [cosmosAssetId]: '0',
  [binanceAssetId]: '0',
}

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
  const poolId = adapters.assetIdToPoolAssetId({ assetId })

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
}): Promise<ThorchainSaverPositionResponse> => {
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
    throw new Error(`No THORCHain savers position in ${assetId} pool for accountId ${accountId}`)
  }

  return accountPosition
}

export const getThorchainSaversDepositQuote = async ({
  asset,
  amountCryptoBaseUnit,
}: {
  asset: Asset
  amountCryptoBaseUnit: BigNumber.Value | null | undefined
}): Promise<ThorchainSaversDepositQuoteResponseSuccess> => {
  const poolId = adapters.assetIdToPoolAssetId({ assetId: asset.assetId })

  if (!poolId) throw new Error(`Invalid assetId for THORCHain savers: ${asset.assetId}`)

  const amountThorBaseUnit = toThorBaseUnit({
    valueCryptoBaseUnit: amountCryptoBaseUnit,
    asset,
  }).toString()

  const { data: quoteData } = await axios.get<ThorchainSaversDepositQuoteResponse>(
    `${
      getConfig().REACT_APP_THORCHAIN_NODE_URL
    }/lcd/thorchain/quote/saver/deposit?asset=${poolId}&amount=${amountThorBaseUnit}`,
  )

  if (!quoteData || 'error' in quoteData)
    throw new Error(`Error fetching THORChain savers quote: ${quoteData?.error}`)

  return quoteData
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
  const poolId = adapters.assetIdToPoolAssetId({ assetId: asset.assetId })

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
  rewardsamountCryptoBaseUnit,
}: {
  withdrawAmountCryptoBaseUnit: BigNumber.Value
  stakedAmountCryptoBaseUnit: BigNumber.Value
  rewardsamountCryptoBaseUnit: BigNumber.Value
}) => {
  const stakedAmountCryptoBaseUnitIncludeRewards = bnOrZero(stakedAmountCryptoBaseUnit).plus(
    rewardsamountCryptoBaseUnit,
  )

  const withdrawRatio = bnOrZero(withdrawAmountCryptoBaseUnit).div(
    stakedAmountCryptoBaseUnitIncludeRewards,
  )

  const withdrawBps = withdrawRatio.times(BASE_BPS_POINTS).toFixed(0)

  return withdrawBps
}
