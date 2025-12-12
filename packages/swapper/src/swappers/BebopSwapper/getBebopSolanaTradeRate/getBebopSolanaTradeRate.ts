import type { ChainId } from '@shapeshiftoss/caip'
import type { solana } from '@shapeshiftoss/chain-adapters'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
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
  GetTradeRateInput,
  SingleHopTradeRateSteps,
  SwapErrorRight,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { fetchBebopSolanaPrice } from '../utils/fetchFromBebop'
import { calculateRate, isSolanaChainId } from '../utils/helpers/helpers'

const SOLANA_RANDOM_ADDRESS = '11111111111111111111111111111112'

export async function getBebopSolanaTradeRate(
  input: GetTradeRateInput,
  assertGetSolanaChainAdapter: (chainId: ChainId) => solana.ChainAdapter,
  _assetsById: AssetsByIdPartial,
  apiKey: string,
): Promise<Result<TradeRate, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    receiveAddress,
    affiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sendAddress,
  } = input

  if (!isSolanaChainId(sellAsset.chainId) || !isSolanaChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: 'Both assets must be on Solana',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Bebop)

  console.log('[Bebop Solana Rate] Fetching rate quote for:', JSON.stringify({
    sellAsset: sellAsset.symbol,
    buyAsset: buyAsset.symbol,
    sellAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sendAddress,
    receiveAddress,
  }))

  const maybeBebopPriceResponse = await fetchBebopSolanaPrice({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    apiKey,
  })

  if (maybeBebopPriceResponse.isErr()) {
    console.log('[Bebop Solana Rate] Error fetching price:', JSON.stringify({
      error: maybeBebopPriceResponse.unwrapErr(),
    }))
    return Err(maybeBebopPriceResponse.unwrapErr())
  }

  const bebopPriceResponse = maybeBebopPriceResponse.unwrap()

  console.log('[Bebop Solana Rate] Price response received:', JSON.stringify({
    quoteId: bebopPriceResponse.quoteId,
    status: bebopPriceResponse.status,
    gasFee: bebopPriceResponse.gasFee,
    hasSolanaTx: !!bebopPriceResponse.solana_tx,
  }))

  const sellTokenAddress = Object.keys(bebopPriceResponse.sellTokens)[0]
  const buyTokenAddress = Object.keys(bebopPriceResponse.buyTokens)[0]
  const sellTokenData = bebopPriceResponse.sellTokens[sellTokenAddress]
  const buyTokenData = bebopPriceResponse.buyTokens[buyTokenAddress]

  const rate = calculateRate({
    buyAmount: buyTokenData.amount,
    sellAmount: sellTokenData.amount,
    buyAsset,
    sellAsset,
  })

  const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

  const getFeeData = async () => {
    try {
      const txBytes = Buffer.from(bebopPriceResponse.solana_tx, 'base64')
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

      const from = sendAddress ?? SOLANA_RANDOM_ADDRESS

      const { fast } = await adapter.getFeeData({
        to: '',
        value: '0',
        chainSpecific: {
          from,
          addressLookupTableAccounts: addressLookupTableAccountKeys,
          instructions,
        },
      })

      return {
        networkFeeCryptoBaseUnit: fast.txFee,
        chainSpecific: {
          computeUnits: fast.chainSpecific.computeUnits,
          priorityFee: fast.chainSpecific.priorityFee,
        },
      }
    } catch (error) {
      console.warn('[Bebop Solana Rate] Failed to calculate fees, using fallback:', error)
      return {
        networkFeeCryptoBaseUnit: '0',
        chainSpecific: {
          computeUnits: '200000',
          priorityFee: '0',
        },
      }
    }
  }

  const feeData = await getFeeData()

  console.log('[Bebop Solana Rate] Calculated fee data:', JSON.stringify({
    networkFeeCryptoBaseUnit: feeData.networkFeeCryptoBaseUnit,
    computeUnits: feeData.chainSpecific.computeUnits,
    priorityFee: feeData.chainSpecific.priorityFee,
  }))

  console.log('[Bebop Solana Rate] Returning trade rate:', JSON.stringify({
    networkFeeCryptoBaseUnit: feeData.networkFeeCryptoBaseUnit,
    rate,
    buyAmount: buyTokenData.amount,
    sellAmount: sellTokenData.amount,
  }))

  return Ok({
    id: uuid(),
    quoteOrRate: 'rate' as const,
    accountNumber: undefined,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    rate,
    swapperName: SwapperName.Bebop,
    priceImpactPercentageDecimal: bebopPriceResponse.priceImpact?.toString(),
    steps: [
      {
        estimatedExecutionTimeMs: undefined,
        allowanceContract: '0x0',
        buyAsset,
        sellAsset,
        accountNumber: undefined,
        rate,
        feeData: {
          protocolFees: {},
          networkFeeCryptoBaseUnit: feeData.networkFeeCryptoBaseUnit,
          chainSpecific: feeData.chainSpecific,
        },
        buyAmountBeforeFeesCryptoBaseUnit: buyTokenData.amountBeforeFee || buyTokenData.amount,
        buyAmountAfterFeesCryptoBaseUnit: buyTokenData.amount,
        sellAmountIncludingProtocolFeesCryptoBaseUnit: sellTokenData.amount,
        source: SwapperName.Bebop,
      },
    ] as SingleHopTradeRateSteps,
  })
}
