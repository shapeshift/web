import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  bchChainId,
  cosmosChainId,
  fromAccountId,
  fromAssetId,
  rujiAssetId,
  tcyAssetId,
  thorchainChainId,
  tronChainId,
} from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { isGridPlus } from '@shapeshiftoss/hdwallet-gridplus'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { isTrezor } from '@shapeshiftoss/hdwallet-trezor'
import type { MidgardActionsResponse, ThornodeStatusResponse } from '@shapeshiftoss/swapper'
import { thorService } from '@shapeshiftoss/swapper'
import type {
  AccountMetadata,
  AccountMetadataById,
  Asset,
  KnownChainIds,
} from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import axios from 'axios'
import dayjs from 'dayjs'
import memoize from 'lodash/memoize'

import { getSupportedEvmChainIds } from '../evm'
import { assertGetUtxoChainAdapter, isUtxoAccountId, isUtxoChainId } from '../utxo'
import { THOR_PRECISION } from './constants'
import { getThorchainLendingPosition } from './lending'

import { getConfig } from '@/config'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import type { BigNumber, BN } from '@/lib/bignumber/bignumber'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { poll } from '@/lib/poll/poll'
import type { getThorchainLpPosition } from '@/pages/ThorChainLP/queries/queries'
import { getThorchainSaversPosition } from '@/state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

export const getThorchainTransactionStatus = async ({
  txHash,
  skipOutbound,
  expectedCompletionTime,
}: {
  txHash: string
  skipOutbound?: boolean
  expectedCompletionTime?: number
}) => {
  const now = dayjs().unix()
  if (expectedCompletionTime && now < expectedCompletionTime) {
    return TxStatus.Pending
  }

  const thorTxHash = txHash.replace(/^0x/, '')
  const { data: thorTxData, status } = await axios.get<ThornodeStatusResponse>(
    `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/tx/status/${thorTxHash}`,
    // We don't want to throw on 404s, we're parsing these ourselves
    { validateStatus: () => true },
  )

  if ('error' in thorTxData || status === 404) return TxStatus.Unknown

  // Tx hasn't been observed yet
  if (thorTxData.stages.inbound_observed?.completed === false) return TxStatus.Pending

  // Tx has been observed, but swap/outbound Tx hasn't been completed yet
  if (
    thorTxData.stages.inbound_finalised?.completed === false ||
    thorTxData.stages.swap_status?.pending === true ||
    (!skipOutbound && thorTxData.stages.outbound_signed?.completed === false)
  ) {
    return TxStatus.Pending
  }
  // When skipping outbound checks, if the swap is complete, we assume the transaction itself is confirmed
  if (skipOutbound && thorTxData.stages.swap_status?.pending === false) return TxStatus.Confirmed

  if (thorTxData.stages.swap_status?.pending) return TxStatus.Pending

  // Introspect midgard to detect failures/success states when enforcing outbound checks
  const midgardUrl = getConfig().VITE_THORCHAIN_MIDGARD_URL
  const maybeResult = await thorService.get<MidgardActionsResponse>(
    `${midgardUrl}/actions?txid=${thorTxHash}`,
  )

  // We shouldn't end up here unless midgard is down - if it is, we can't determine the status of the transaction
  if (maybeResult.isErr()) {
    return TxStatus.Unknown
  }
  const { data: result } = maybeResult.unwrap()

  // This may be failed refund or a refund - either way, the THOR Tx is effectively "failed" from a user standpoint
  // even though the inner swap may have succeeded
  if (result.actions.some(action => action.type === 'refund')) return TxStatus.Failed

  // All checks passed, but we still need to ensure there's an outbound Txid
  return result.actions.some(
    action =>
      action.type === 'withdraw' && action.status === 'success' && action.out.some(tx => tx.txID),
  ) ||
    // in the case of RUNE as outbound, there is no "withdraw" action, both are "swap" actions
    // note since these are internal to the THOR network, there is no Txid. The Txid *is* the Txid of e.g the loan Tx itself
    result.actions.every(action => action.type === 'swap' && action.status === 'success')
    ? TxStatus.Confirmed
    : TxStatus.Pending
}

export const waitForThorchainUpdate = ({
  txId,
  skipOutbound,
  expectedCompletionTime,
}: {
  txId: string
  skipOutbound?: boolean
  expectedCompletionTime?: number
}) => {
  // When skipping outbound, Txs completion state (i.e internal swap complete) is pretty fast to be reflected
  // When outbounds are enforced, Txs can take a long, very long time to have their outbound signed (1+, and sometimes many hours)
  // so we poll with half the frequency and double the total attempts
  const interval = skipOutbound ? 60_000 : 120_000
  // 60 attempts over an hour when skipping outbound checks,
  // 120 attempts over 4 hours when enforcing it
  const maxAttempts = skipOutbound ? 60 : 120
  return poll({
    fn: () => getThorchainTransactionStatus({ txHash: txId, skipOutbound, expectedCompletionTime }),
    validate: status => [TxStatus.Confirmed, TxStatus.Failed].includes(status),
    interval,
    maxAttempts,
  })
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

export const getThorchainFromAddress = async ({
  accountId,
  assetId,
  opportunityId,
  getPosition,
  accountMetadata,
  wallet,
}: {
  accountId: AccountId
  assetId: AssetId
  opportunityId?: string
  getPosition:
    | typeof getThorchainLendingPosition
    | typeof getThorchainSaversPosition
    | typeof getThorchainLpPosition
  accountMetadata: AccountMetadata
  wallet: HDWallet
}): Promise<string> => {
  const { chainId } = fromAssetId(assetId)
  if (!isUtxoChainId(chainId)) return Promise.resolve(fromAccountId(accountId).account)

  try {
    const position = await getPosition({
      accountId,
      assetId,
      opportunityId,
    })
    if (!position) throw new Error(`No position found for assetId: ${assetId}`)
    const address: string = (() => {
      // THORChain lending position
      if ('owner' in position) return position.owner
      // THORChain savers position
      if ('asset_address' in position) return position.asset_address
      // THORChain LP position. Note we accesss assetAddress, never runeAddress, because of the !isUtxoChainId check above
      if ('assetAddress' in position) return position.assetAddress
      // For type completeness - if we have a response, we *should* either have an `owner` or `asset_address` property
      return ''
    })()
    return chainId === bchChainId ? `bitcoincash:${address}` : address
  } catch {
    // Re-throw if no meta, we obviously can't get an address without it
    if (!accountMetadata) throw new Error('No account metadata found')
    const accountType = accountMetadata.accountType
    const bip44Params = accountMetadata.bip44Params

    const chainAdapter = getChainAdapterManager().get(chainId)

    // And re-throw if no adapter found. "Shouldn't happen but" yadi yadi yada you know the drill
    if (!chainAdapter) throw new Error(`No chain adapter found for chainId: ${chainId}`)

    const skipDeviceDerivation =
      (isLedger(wallet) || isGridPlus(wallet) || isTrezor(wallet)) && accountId
    const firstReceiveAddress = await chainAdapter.getAddress({
      wallet,
      accountNumber: bip44Params.accountNumber,
      accountType,
      addressIndex: 0,
      pubKey: skipDeviceDerivation ? fromAccountId(accountId).account : undefined,
    })
    return firstReceiveAddress
  }
}

// Gets all unique UTXO addresses for a given accountId across all THORFi
export const getThorfiUtxoFromAddresses = async ({
  accountId,
  assetId,
  wallet,
  accountMetadata,
}: {
  accountId: AccountId
  assetId: AssetId
  wallet: HDWallet
  accountMetadata: AccountMetadataById[AccountId]
}): Promise<string[]> => {
  const { chainId } = fromAccountId(accountId)

  if (!isUtxoChainId(chainId)) throw new Error(`ChainId ${chainId} is not a UTXO chain`)

  try {
    const [saverPosition, lendingPosition] = await Promise.all([
      getThorchainSaversPosition({ accountId, assetId }),
      getThorchainLendingPosition({ accountId, assetId }),
    ])

    if (!saverPosition && !lendingPosition)
      throw new Error(`No position found for assetId: ${assetId}, defaulting to 0 account_index`)

    // Unique addies set, to avoid view-layer dupes since addies are most likely the same over savers and lending
    const addresses = new Set<string>()

    if (saverPosition?.asset_address) {
      addresses.add(saverPosition.asset_address)
    }

    if (lendingPosition?.owner) {
      addresses.add(lendingPosition.owner)
    }

    return Array.from(addresses)
  } catch {
    const chainAdapter = getChainAdapterManager().get(chainId)

    if (!accountMetadata) throw new Error('No account metadata found')
    if (!chainAdapter) throw new Error(`No chain adapter found for chainId: ${chainId}`)

    const { accountType, bip44Params } = accountMetadata

    const skipDeviceDerivation =
      (isLedger(wallet) || isGridPlus(wallet) || isTrezor(wallet)) && accountId
    const firstReceiveAddress = await chainAdapter.getAddress({
      wallet,
      accountNumber: bip44Params.accountNumber,
      accountType,
      addressIndex: 0,
      pubKey: skipDeviceDerivation ? fromAccountId(accountId).account : undefined,
    })

    return [firstReceiveAddress]
  }
}

// Memoized on accountId, see lodash docs:
// "By default, the first argument provided to the memoized function is used as the map cache key."
export const getAccountAddresses = memoize(async (accountId: AccountId): Promise<string[]> => {
  if (isUtxoAccountId(accountId)) {
    const { chainId, account: pubkey } = fromAccountId(accountId)
    const adapter = assertGetUtxoChainAdapter(chainId)

    const {
      chainSpecific: { addresses },
    } = await adapter.getAccount(pubkey)

    if (!addresses) return []

    return addresses.map(({ pubkey }) => {
      const address = pubkey.startsWith('bitcoincash') ? pubkey.replace('bitcoincash:', '') : pubkey
      return address
    })
  }

  return [fromAccountId(accountId).account]
})

// A THOR Tx can either be:
// - a RUNE MsgDeposit message type
// - an EVM custom Tx, i.e., a Tx with calldata
// - a regular send with a memo (for ATOM and UTXOs)
export const getThorchainTransactionType = (chainId: ChainId) => {
  const isRuneTx = chainId === thorchainChainId
  if (isRuneTx) return 'MsgDeposit'

  const supportedEvmChainIds = getSupportedEvmChainIds()
  if (supportedEvmChainIds.includes(chainId as KnownChainIds)) {
    return 'EvmCustomTx'
  }
  if (isUtxoChainId(chainId) || chainId === cosmosChainId || chainId === tronChainId) {
    return 'Send'
  }

  throw new Error(`Unsupported ChainId ${chainId}`)
}

export function getThorchainMsgDepositCoin(memo: string, assetId?: AssetId) {
  const [action] = memo.split(':')

  if (!action) return 'THOR.RUNE'

  switch (action.toLowerCase()) {
    case 'add':
    case 'a':
    case '+': {
      if (assetId === tcyAssetId) return 'THOR.TCY'
      if (assetId === rujiAssetId) return 'THOR.RUJI'
      return 'THOR.RUNE'
    }
    case 'tcy+':
      return 'THOR.TCY'
    default:
      return 'THOR.RUNE'
  }
}
