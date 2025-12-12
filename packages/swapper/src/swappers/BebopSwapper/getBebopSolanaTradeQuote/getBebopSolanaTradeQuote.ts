import type { ChainId } from '@shapeshiftoss/caip'
import type { solana } from '@shapeshiftoss/chain-adapters'
import type { AssetsByIdPartial, KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import {
  AddressLookupTableAccount,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  CommonTradeQuoteInput,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { fetchBebopSolanaQuote } from '../utils/fetchFromBebop'
import { calculateRate, isSolanaChainId } from '../utils/helpers/helpers'

export async function getBebopSolanaTradeQuote(
  input: CommonTradeQuoteInput & { chainId: KnownChainIds.SolanaMainnet },
  assertGetSolanaChainAdapter: (chainId: ChainId) => solana.ChainAdapter,
  _assetsById: AssetsByIdPartial,
  apiKey: string,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    sendAddress,
    receiveAddress,
    affiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  if (!isSolanaChainId(sellAsset.chainId) || !isSolanaChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: 'Both assets must be on Solana',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (!sendAddress || !receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'sendAddress and receiveAddress are required for Solana',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Bebop)

  const maybeBebopQuoteResponse = await fetchBebopSolanaQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    takerAddress: sendAddress,
    receiverAddress: receiveAddress,
    slippageTolerancePercentageDecimal,
    affiliateBps,
    apiKey,
  })

  if (maybeBebopQuoteResponse.isErr()) return Err(maybeBebopQuoteResponse.unwrapErr())
  const bebopQuoteResponse = maybeBebopQuoteResponse.unwrap()

  const sellTokenAddress = Object.keys(bebopQuoteResponse.sellTokens)[0]
  const buyTokenAddress = Object.keys(bebopQuoteResponse.buyTokens)[0]
  const sellTokenData = bebopQuoteResponse.sellTokens[sellTokenAddress]
  const buyTokenData = bebopQuoteResponse.buyTokens[buyTokenAddress]

  const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

  const txBytes = Buffer.from(bebopQuoteResponse.solana_tx, 'base64')
  const versionedTransaction = VersionedTransaction.deserialize(txBytes)

  const addressLookupTableAccountKeys = versionedTransaction.message.addressTableLookups.map(
    lookup => lookup.accountKey.toString(),
  )

  const addressLookupTableAccountsInfos = await adapter.getAddressLookupTableAccounts(
    addressLookupTableAccountKeys,
  )

  const addressLookupTableAccounts = addressLookupTableAccountsInfos.map(
    info =>
      new AddressLookupTableAccount({
        key: new PublicKey(info.key),
        state: AddressLookupTableAccount.deserialize(new Uint8Array(info.data)),
      }),
  )

  const instructions = TransactionMessage.decompile(versionedTransaction.message, {
    addressLookupTableAccounts,
  }).instructions

  const feeDataInput = {
    to: '',
    value: '0',
    chainSpecific: {
      from: sendAddress,
      addressLookupTableAccounts: addressLookupTableAccountKeys,
      instructions,
    },
  }

  const { fast } = await adapter.getFeeData(feeDataInput)

  console.log('[Bebop Solana] Fee data received:', JSON.stringify({
    txFee: fast.txFee,
    chainSpecific: fast.chainSpecific,
  }))

  const networkFeeCryptoBaseUnit = fast.txFee

  const rate = calculateRate({
    buyAmount: buyTokenData.amount,
    sellAmount: sellTokenData.amount,
    buyAsset,
    sellAsset,
  })

  const tradeQuote = {
    id: uuid(),
    quoteOrRate: 'quote' as const,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    rate,
    swapperName: SwapperName.Bebop,
    priceImpactPercentageDecimal: bebopQuoteResponse.priceImpact?.toString(),
    steps: [
      {
        estimatedExecutionTimeMs: undefined,
        allowanceContract: '0x0',
        buyAsset,
        sellAsset,
        accountNumber,
        rate,
        feeData: {
          protocolFees: {},
          networkFeeCryptoBaseUnit,
          chainSpecific: {
            computeUnits: fast.chainSpecific.computeUnits,
            priorityFee: fast.chainSpecific.priorityFee,
          },
        },
        buyAmountBeforeFeesCryptoBaseUnit: buyTokenData.amountBeforeFee || buyTokenData.amount,
        buyAmountAfterFeesCryptoBaseUnit: buyTokenData.amount,
        sellAmountIncludingProtocolFeesCryptoBaseUnit: sellTokenData.amount,
        source: SwapperName.Bebop,
        solanaTransactionMetadata: {
          addressLookupTableAddresses: addressLookupTableAccountKeys,
          instructions,
        },
      },
    ] as SingleHopTradeQuoteSteps,
  }

  const step = tradeQuote.steps[0]
  const solanaChainSpecific = step.feeData.chainSpecific as { computeUnits: string; priorityFee: string } | undefined

  console.log('[Bebop Solana] Returning trade quote:', JSON.stringify({
    id: tradeQuote.id,
    networkFeeCryptoBaseUnit: step.feeData.networkFeeCryptoBaseUnit,
    computeUnits: solanaChainSpecific?.computeUnits,
    priorityFee: solanaChainSpecific?.priorityFee,
    buyAmount: step.buyAmountAfterFeesCryptoBaseUnit,
    sellAmount: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
  }))

  return Ok(tradeQuote)
}
