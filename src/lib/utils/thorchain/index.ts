import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  bchChainId,
  cosmosChainId,
  fromAccountId,
  fromAssetId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type {
  MidgardActionsResponse,
  ThornodeStatusResponse,
} from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/types'
import { thorService } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/utils/thorService'
import type { AccountMetadata, Asset, KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import axios from 'axios'
import { getConfig } from 'config'
import dayjs from 'dayjs'
import memoize from 'lodash/memoize'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BigNumber, BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { poll } from 'lib/poll/poll'
import type { getThorchainLpPosition } from 'pages/ThorChainLP/queries/queries'
import type { getThorchainSaversPosition } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

import { getSupportedEvmChainIds } from '../evm'
import { assertGetUtxoChainAdapter, isUtxoAccountId, isUtxoChainId } from '../utxo'
import { THOR_PRECISION } from './constants'
import type { getThorchainLendingPosition } from './lending'

const getThorchainTransactionStatus = async ({
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
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/tx/status/${thorTxHash}`,
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
  const midgardUrl = getConfig().REACT_APP_MIDGARD_URL
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
  // TODO(gomes): getThorchainLp maybe, or maybe not?
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
    const accountType = accountMetadata?.accountType
    const bip44Params = accountMetadata?.bip44Params

    const chainAdapter = getChainAdapterManager().get(chainId)!

    const firstReceiveAddress = await chainAdapter.getAddress({
      wallet,
      accountNumber: bip44Params.accountNumber,
      accountType,
      index: 0,
      ...(isLedger(wallet)
        ? { pubKey: fromAccountId(accountId).account }
        : { checkLedgerAppOpenIfLedgerConnected: () => Promise.resolve() }),
    })
    return firstReceiveAddress
  }
}

const getAccountAddressesWithBalances = async (
  accountId: AccountId,
): Promise<{ address: string; balance: string }[]> => {
  if (isUtxoAccountId(accountId)) {
    const { chainId, account: pubkey } = fromAccountId(accountId)
    const adapter = assertGetUtxoChainAdapter(chainId)

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
  if (isUtxoChainId(chainId) || chainId === cosmosChainId) {
    return 'Send'
  }

  throw new Error(`Unsupported ChainId ${chainId}`)
}
