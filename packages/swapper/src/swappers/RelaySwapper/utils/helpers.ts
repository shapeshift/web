import type { ChainId } from '@shapeshiftoss/caip'
import { btcChainId, solanaChainId, tronChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { chainIdToRelayChainId as relayChainMapImplementation } from '../constant'
import { getRelayDefaultUserAddress } from './getRelayDefaultUserAddress'
import type {
  RelayExactOutputTradeQuoteInput,
  RelayExactOutputTradeRateInput,
  RelayQuoteItem,
  RelaySolanaInstruction,
  RelayTradeQuoteInput,
  RelayTradeRateInput,
} from './types'
import { isRelayQuoteEvmItemData, isRelayQuoteTronItemData } from './types'

const isSupportedRelayChainId = (chainId: ChainId): boolean =>
  isEvmChainId(chainId) ||
  chainId === btcChainId ||
  chainId === solanaChainId ||
  chainId === tronChainId

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
  relayChainMap,
}: {
  sellAsset: Asset
  buyAsset: Asset
  relayChainMap: typeof relayChainMapImplementation
}): Result<{ sellRelayChainId: number; buyRelayChainId: number }, SwapErrorRight> => {
  if (!isSupportedRelayChainId(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  if (!isSupportedRelayChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const sellRelayChainId = relayChainMap[sellAsset.chainId]
  const buyRelayChainId = relayChainMap[buyAsset.chainId]

  if (sellRelayChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  if (buyRelayChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  return Ok({ sellRelayChainId, buyRelayChainId })
}

// BTC swaps must use the default user address for the fetch — a real address may not hold enough in a
// single UTXO (the swap is funded from multiple UTXOs), so relay's estimation would fail. Rates default
// every unset address; quotes carry the real ones (guarded upstream) so the `?? default` is inert there,
// except refundTo which keeps the real send address even for BTC quotes.
export const resolveRelayAddresses = ({
  input,
  sellChainId,
  buyChainId,
}: {
  input:
    | RelayTradeQuoteInput
    | RelayTradeRateInput
    | RelayExactOutputTradeQuoteInput
    | RelayExactOutputTradeRateInput
  sellChainId: ChainId
  buyChainId: ChainId
}): { sendAddress: string; recipient: string; refundTo: string } => {
  const sendAddress =
    sellChainId === btcChainId
      ? getRelayDefaultUserAddress(sellChainId)
      : input.sendAddress ?? getRelayDefaultUserAddress(sellChainId)

  const recipient = input.receiveAddress ?? getRelayDefaultUserAddress(buyChainId)

  const refundTo = input.sendAddress ?? getRelayDefaultUserAddress(sellChainId)

  return { sendAddress, recipient, refundTo }
}

// The spender to approve: EVM routes approve the router (data.to); Tron approves the token contract;
// UTXO/Solana need no allowance. Derived from the provider route, not the built transactionData.
export const getRelayAllowanceContract = (data: RelayQuoteItem['data']): string => {
  if (!data) return ''
  if (isRelayQuoteEvmItemData(data)) return data.to ?? ''
  if (isRelayQuoteTronItemData(data)) return data.parameter?.contract_address ?? ''
  return ''
}

export const convertRelaySolanaInstruction = (
  instruction: RelaySolanaInstruction,
): TransactionInstruction => ({
  ...instruction,
  keys: instruction.keys.map(account => ({
    ...account,
    pubkey: new PublicKey(account.pubkey),
  })),
  data: Buffer.from(instruction.data, 'hex'),
  programId: new PublicKey(instruction.programId),
})
