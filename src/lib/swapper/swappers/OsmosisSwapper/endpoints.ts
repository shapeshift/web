import { cosmosChainId, fromAccountId, osmosisChainId } from '@shapeshiftoss/caip'
import type { cosmos, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import { osmosis } from '@shapeshiftoss/chain-adapters'
import type { CosmosSignTx } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { getConfig } from 'config'
import { v4 as uuid } from 'uuid'
import type {
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote2,
} from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { SymbolDenomMapping } from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'
import {
  buildPerformIbcTransferUnsignedTx,
  buildSwapExactAmountInTx,
  symbolDenomMapping,
} from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { createDefaultStatusResponse } from 'lib/utils/evm'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'

import { getTradeQuote } from './getTradeQuote/getMultiHopTradeQuote'
import {
  COSMOSHUB_TO_OSMOSIS_CHANNEL,
  OSMOSIS_TO_COSMOSHUB_CHANNEL,
  SUPPORTED_ASSET_IDS,
} from './utils/constants'
import { pollForComplete, pollForCrossChainComplete } from './utils/poll'
import type { OsmosisSupportedChainId } from './utils/types'

const tradeQuoteMetadata: Map<string, TradeQuote2> = new Map()

export const osmosisApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const { receiveAccountNumber, receiveAddress, affiliateBps, sellAsset, buyAsset } = input

    if (!SUPPORTED_ASSET_IDS.includes(sellAsset.assetId)) {
      return Err(
        makeSwapErrorRight({
          message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
          code: SwapErrorType.UNSUPPORTED_PAIR,
        }),
      )
    }

    if (!SUPPORTED_ASSET_IDS.includes(buyAsset.assetId)) {
      return Err(
        makeSwapErrorRight({
          message: `asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
          code: SwapErrorType.UNSUPPORTED_PAIR,
        }),
      )
    }

    const tradeQuoteResult = await getTradeQuote(input)

    return tradeQuoteResult.map(tradeQuote => {
      const id = uuid()
      const quote = { id, receiveAddress, receiveAccountNumber, affiliateBps, ...tradeQuote }
      tradeQuoteMetadata.set(id, quote)
      return quote
    })
  },

  getUnsignedTx: async ({
    from,
    tradeQuote,
    stepIndex,
  }: GetUnsignedTxArgs): Promise<CosmosSignTx> => {
    if (!from) throw new Error('from address is required')

    const {
      accountNumber,
      buyAsset: stepBuyAsset,
      sellAsset: stepSellAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: stepSellAmountBeforeFeesCryptoBaseUnit,
    } = tradeQuote.steps[stepIndex]
    const quoteSellAsset = tradeQuote.steps[0].sellAsset
    const { receiveAddress, receiveAccountNumber } = tradeQuote

    // What we call an "Osmosis" swap is a stretch - it's really an IBC transfer and a swap-exact-amount-in
    // Thus, an "Osmosis" swap step can be one of these two
    const isIbcTransferStep = stepBuyAsset.chainId !== stepSellAsset.chainId

    const stepSellAssetIsOnOsmosisNetwork = stepSellAsset.chainId === osmosisChainId

    const stepSellAssetDenom = symbolDenomMapping[stepSellAsset.symbol as keyof SymbolDenomMapping]
    const stepBuyAssetDenom = symbolDenomMapping[stepBuyAsset.symbol as keyof SymbolDenomMapping]
    const nativeAssetDenom = stepSellAssetIsOnOsmosisNetwork ? 'uosmo' : 'uatom'

    const osmosisAdapter = assertGetCosmosSdkChainAdapter(osmosisChainId) as osmosis.ChainAdapter
    const cosmosAdapter = assertGetCosmosSdkChainAdapter(cosmosChainId) as cosmos.ChainAdapter
    const stepSellAssetAdapter = assertGetCosmosSdkChainAdapter(stepSellAsset.chainId) as
      | cosmos.ChainAdapter
      | osmosis.ChainAdapter

    const { REACT_APP_OSMOSIS_NODE_URL: osmoUrl, REACT_APP_COSMOS_NODE_URL: cosmosUrl } =
      getConfig()

    if (isIbcTransferStep) {
      /** If the sell asset is not on the Osmosis network, we need to bridge the
       * asset to the Osmosis network first in order to perform a swap on Osmosis DEX.
       */

      const transfer = {
        sender: from,
        receiver: receiveAddress,
        amount: stepSellAmountBeforeFeesCryptoBaseUnit,
      }

      const responseAccount = await stepSellAssetAdapter.getAccount(from)
      const ibcAccountNumber = responseAccount.chainSpecific.accountNumber || '0'

      const sequence = responseAccount.chainSpecific.sequence || '0'

      const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
      const sellAssetFeeData = await stepSellAssetAdapter.getFeeData(getFeeDataInput)

      const unsignedTx = await buildPerformIbcTransferUnsignedTx({
        input: transfer,
        adapter: stepSellAssetAdapter,
        // Used to get blockheight of the *destination* chain for the IBC transfer
        blockBaseUrl: stepSellAsset.chainId === cosmosChainId ? osmoUrl : cosmosUrl,
        // Transfer ATOM on Osmosis if IBC transferring from Osmosis to Cosmos, else IBC transfer ATOM to ATOM on Osmosis
        denom:
          stepSellAsset.chainId === cosmosChainId ? nativeAssetDenom : symbolDenomMapping['ATOM'],
        sourceChannel: stepSellAssetIsOnOsmosisNetwork
          ? OSMOSIS_TO_COSMOSHUB_CHANNEL
          : COSMOSHUB_TO_OSMOSIS_CHANNEL,
        feeAmount: stepSellAssetIsOnOsmosisNetwork ? sellAssetFeeData.fast.txFee : osmosis.MIN_FEE,
        accountNumber,
        ibcAccountNumber,
        sequence,
        gas: sellAssetFeeData.fast.chainSpecific.gasLimit,
        feeDenom: nativeAssetDenom,
      })

      return unsignedTx
    }

    /** At the current time, only OSMO<->ATOM swaps are supported, so this is fine.
     * In the future, as more Osmosis network assets are added, the buy asset should
     * be used as the fee asset automatically. See the whitelist of supported fee assets here:
     * https://github.com/osmosis-labs/osmosis/blob/04026675f75ca065fb89f965ab2d33c9840c965a/app/upgrades/v5/whitelist_feetokens.go
     */

    const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
    const stepFeeData = await (stepSellAssetIsOnOsmosisNetwork
      ? osmosisAdapter.getFeeData(getFeeDataInput)
      : cosmosAdapter.getFeeData(getFeeDataInput))

    const quoteSellAssetIsOnOsmosisNetwork = quoteSellAsset.chainId === osmosisChainId
    const feeDenom = quoteSellAssetIsOnOsmosisNetwork
      ? symbolDenomMapping['OSMO']
      : symbolDenomMapping['ATOM']

    const osmoAddress = quoteSellAssetIsOnOsmosisNetwork ? from : receiveAddress

    if (!quoteSellAssetIsOnOsmosisNetwork && receiveAccountNumber === undefined)
      throw new Error('receiveAccountNumber is required for ATOM -> OSMO')

    const txToSign = await buildSwapExactAmountInTx({
      osmoAddress,
      accountNumber: quoteSellAssetIsOnOsmosisNetwork ? accountNumber : receiveAccountNumber!,
      adapter: osmosisAdapter,
      buyAssetDenom: stepBuyAssetDenom,
      sellAssetDenom: stepSellAssetDenom,
      sellAmount: stepSellAmountBeforeFeesCryptoBaseUnit,
      gas: stepFeeData.fast.chainSpecific.gasLimit,
      feeAmount: stepFeeData.fast.txFee,
      feeDenom,
    })

    return txToSign
  },

  checkTradeStatus: async ({
    txHash,
    quoteId,
    stepIndex,
    quoteSellAssetAccountId,
    quoteBuyAssetAccountId,
    getState,
  }): Promise<{ status: TxStatus; buyTxHash: string | undefined; message: string | undefined }> => {
    try {
      const quote = tradeQuoteMetadata.get(quoteId)
      const step = quote?.steps[stepIndex]
      if (!step) throw new Error('Step not found')
      const isAtomOsmoQuote =
        quote.steps[0].sellAsset.chainId === cosmosChainId &&
        quote.steps[1].buyAsset.chainId === osmosisChainId
      const isIbcTransferStep = step.buyAsset.chainId !== step.sellAsset.chainId
      if (!(quoteSellAssetAccountId && quoteBuyAssetAccountId))
        throw new Error('quote AccountIds required to check osmosis trade status')
      if (isIbcTransferStep) {
        // IBC transfer is initiated from Osmosis chain on OSMO -> ATOM, and Cosmos on ATOM -> OSMO
        const stepSellAssetAccountId = quoteSellAssetAccountId
        const initiatingChainTxid = serializeTxIndex(
          stepSellAssetAccountId,
          txHash,
          fromAccountId(stepSellAssetAccountId).account,
        )
        const pollResult = await pollForCrossChainComplete({
          initiatingChainTxid,
          initiatingChainAccountId: stepSellAssetAccountId,
          getState,
        })
        const status = pollResult === 'success' ? TxStatus.Confirmed : TxStatus.Failed

        return {
          status,
          buyTxHash: txHash,
          message: undefined,
        }
      } else {
        const stepSellAssetAccountId = isAtomOsmoQuote
          ? quoteBuyAssetAccountId
          : quoteSellAssetAccountId

        const txid = serializeTxIndex(
          stepSellAssetAccountId,
          txHash,
          fromAccountId(stepSellAssetAccountId).account,
        )

        const pollResult = await pollForComplete({
          txid,
          getState,
        })

        const status = pollResult === 'success' ? TxStatus.Confirmed : TxStatus.Failed

        return {
          status,
          buyTxHash: txHash,
          message: undefined,
        }
      }
    } catch (e) {
      console.error(e)
      return createDefaultStatusResponse(txHash)
    }
  },
}
