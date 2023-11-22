import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId, bchChainId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { QueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import memoize from 'lodash/memoize'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import type { BigNumber, BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { poll } from 'lib/poll/poll'
import type { ThornodeStatusResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import type { getThorchainSaversPosition } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { isUtxoAccountId, isUtxoChainId } from 'state/slices/portfolioSlice/utils'

import { THOR_PRECISION } from './constants'
import type { getThorchainLendingPosition } from './lending'

const getThorchainTransactionStatus = async (txHash: string, skipOutbound?: boolean) => {
  const thorTxHash = txHash.replace(/^0x/, '')
  const { data: thorTxData, status } = await axios.get<ThornodeStatusResponse>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/tx/status/${thorTxHash}`,
    // We don't want to throw on 404s, we're parsing these ourselves
    { validateStatus: () => true },
  )

  if ('error' in thorTxData || status === 404) return TxStatus.Unknown
  // Tx has been observed, but swap/outbound Tx hasn't been completed yet
  if (
    // Despite the Tx being observed, things may be slow to be picked on the THOR node side of things i.e for swaps to/from BTC
    thorTxData.stages.inbound_finalised?.completed === false ||
    thorTxData.stages.swap_status?.pending === true ||
    (!skipOutbound && thorTxData.stages.outbound_signed?.completed === false)
  )
    return TxStatus.Pending
  if (thorTxData.stages.swap_status?.pending === false) return TxStatus.Confirmed

  // We shouldn't end up here, but just in case
  return TxStatus.Unknown
}

export const waitForThorchainUpdate = ({
  txHash,
  queryClient,
  skipOutbound,
}: {
  txHash: string
  queryClient?: QueryClient
  skipOutbound?: boolean
}) =>
  poll({
    fn: () => {
      // Invalidate some react-queries everytime we poll - since status detection is currently suboptimal
      queryClient?.invalidateQueries({ queryKey: ['thorchainLendingPosition'], exact: false })
      return getThorchainTransactionStatus(txHash, skipOutbound)
    },
    validate: status => Boolean(status && status === TxStatus.Confirmed),
    interval: 60000,
    maxAttempts: 20,
  })

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

export const getThorchainFromAddress = async ({
  accountId,
  assetId,
  getPosition,
  accountMetadata,
  wallet,
}: {
  accountId: AccountId
  assetId: AssetId
  getPosition: typeof getThorchainLendingPosition | typeof getThorchainSaversPosition
  accountMetadata: AccountMetadata
  wallet: HDWallet
}): Promise<string> => {
  const { chainId } = fromAssetId(assetId)
  if (!isUtxoChainId(chainId)) return Promise.resolve(fromAccountId(accountId).account)

  try {
    const position = await getPosition({
      accountId,
      assetId,
    })
    if (!position) throw new Error(`No position found for assetId: ${assetId}`)
    const address: string = (() => {
      // THORChain lending position
      if ('owner' in position) return position.owner
      // THORChain savers position
      if ('asset_address' in position) return position.asset_address
      // For type completeness - if we have a response, we *should* either have an `owner` or `asset_address` property
      return ''
    })()
    return chainId === bchChainId ? `bitcoincash:${address}` : address
  } catch {
    const accountType = accountMetadata?.accountType
    const bip44Params = accountMetadata?.bip44Params

    const chainAdapter = getChainAdapterManager().get(chainId)!

    const firstReceiveAddress = await chainAdapter.getAddress({
      wallet,
      accountNumber: bip44Params.accountNumber,
      accountType,
      index: 0,
    })
    return firstReceiveAddress
  }
}

const getAccountAddressesWithBalances = async (
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
