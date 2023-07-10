import { cosmosChainId, osmosisChainId } from '@shapeshiftoss/caip'
import type { cosmos, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import { osmosis } from '@shapeshiftoss/chain-adapters'
import type { CosmosSignTx } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads'
import axios from 'axios'
import { getConfig } from 'config'
import { v4 as uuid } from 'uuid'
import type {
  GetCosmosSdkTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote2,
} from 'lib/swapper/api'
import type { SymbolDenomMapping } from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'
import {
  buildPerformIbcTransferUnsignedTx,
  buildSwapExactAmountInTx,
  symbolDenomMapping,
} from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { createDefaultStatusResponse } from 'lib/utils/evm'

import { getTradeQuote } from './getTradeQuote/getMultiHopTradeQuote'
import { COSMOSHUB_TO_OSMOSIS_CHANNEL, OSMOSIS_TO_COSMOSHUB_CHANNEL } from './utils/constants'
import type { OsmosisSupportedChainId } from './utils/types'

const tradeQuoteMetadata: Map<string, GetCosmosSdkTradeQuoteInput> = new Map()

export const osmosisApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    { sellAssetUsdRate }: { sellAssetUsdRate: string },
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const tradeQuoteResult = await getTradeQuote(input, { sellAssetUsdRate })

    return tradeQuoteResult.map(tradeQuote => {
      const { receiveAddress, affiliateBps } = input
      const id = uuid()
      // TODO(gomes): getTradeQuote() is currently a hack, which represents the swap as a single trade, and needs to be revamped
      // This effectively means that getUnsignedTx() won't be able to be implemented for all steps, but only the first for now
      // i.e either the IBC transfer or swap-exact-amount-in
      tradeQuoteMetadata.set(id, input as GetCosmosSdkTradeQuoteInput)
      return { id, receiveAddress, affiliateBps, ...tradeQuote }
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
      sellAmountBeforeFeesCryptoBaseUnit: stepSellAmountBeforeFeesCryptoBaseUnit,
    } = tradeQuote.steps[stepIndex]
    const input = tradeQuoteMetadata.get(tradeQuote.id)
    if (!input) throw new Error('tradeQuoteMetadata is missing')
    const { sellAsset: inputSellAsset } = input
    const { receiveAddress } = tradeQuote

    // What we call an "Osmosis" swap is a stretch - it's really an IBC transfer and a swap-exact-amount-in
    // Thus, an "Osmosis" swap step can be one of these two
    const isIbcTransfer = stepBuyAsset.chainId !== stepSellAsset.chainId

    const stepSellAssetIsOnOsmosisNetwork = stepSellAsset.chainId === osmosisChainId

    const sellAssetDenom = symbolDenomMapping[stepSellAsset.symbol as keyof SymbolDenomMapping]
    const buyAssetDenom = symbolDenomMapping[stepBuyAsset.symbol as keyof SymbolDenomMapping]
    const nativeAssetDenom = stepSellAssetIsOnOsmosisNetwork ? 'uosmo' : 'uatom'

    const osmosisAdapter = assertGetCosmosSdkChainAdapter(osmosisChainId) as osmosis.ChainAdapter
    const cosmosAdapter = assertGetCosmosSdkChainAdapter(cosmosChainId) as cosmos.ChainAdapter
    const sellAssetAdapter = assertGetCosmosSdkChainAdapter(stepSellAsset.chainId) as
      | cosmos.ChainAdapter
      | osmosis.ChainAdapter

    const { REACT_APP_OSMOSIS_NODE_URL: osmoUrl, REACT_APP_COSMOS_NODE_URL: cosmosUrl } =
      getConfig()

    if (isIbcTransfer) {
      /** If the sell asset is not on the Osmosis network, we need to bridge the
       * asset to the Osmosis network first in order to perform a swap on Osmosis DEX.
       */

      const transfer = {
        sender: from,
        receiver: receiveAddress,
        amount: stepSellAmountBeforeFeesCryptoBaseUnit,
      }

      const responseAccount = await sellAssetAdapter.getAccount(from)
      const ibcAccountNumber = responseAccount.chainSpecific.accountNumber || '0'

      const sequence = responseAccount.chainSpecific.sequence || '0'

      const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
      const sellAssetFeeData = await sellAssetAdapter.getFeeData(getFeeDataInput)

      const unsignedTx = await buildPerformIbcTransferUnsignedTx({
        input: transfer,
        adapter: sellAssetAdapter,
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
    const swapFeeData = await (stepSellAssetIsOnOsmosisNetwork
      ? osmosisAdapter.getFeeData(getFeeDataInput)
      : cosmosAdapter.getFeeData(getFeeDataInput))

    const inputSellAssetIsOnOsmosisNetwork = inputSellAsset.chainId === osmosisChainId
    const feeDenom = inputSellAssetIsOnOsmosisNetwork
      ? symbolDenomMapping['OSMO']
      : symbolDenomMapping['ATOM']

    // TODO(gomes): this is temporary while we plumb things through, this won't work for cross-account trades
    // We shouldn't have a notion of an accountNumber once we hit the new Osmosis swapper endpoints
    // or rather we should have it both on the sell and buy side?

    const receiveAccountNumber = accountNumber

    const osmoAddress = stepSellAssetIsOnOsmosisNetwork ? from : receiveAddress

    const txToSign = await buildSwapExactAmountInTx({
      osmoAddress,
      accountNumber: stepSellAssetIsOnOsmosisNetwork ? accountNumber : receiveAccountNumber,
      adapter: osmosisAdapter,
      buyAssetDenom,
      sellAssetDenom,
      sellAmount: stepSellAmountBeforeFeesCryptoBaseUnit,
      gas: swapFeeData.fast.chainSpecific.gasLimit,
      feeAmount: swapFeeData.fast.txFee,
      feeDenom,
    })

    return txToSign
  },

  checkTradeStatus: async ({
    txHash,
    chainId,
  }): Promise<{ status: TxStatus; buyTxHash: string | undefined; message: string | undefined }> => {
    try {
      const { REACT_APP_OSMOSIS_NODE_URL: osmoUrl, REACT_APP_COSMOS_NODE_URL: cosmosUrl } =
        getConfig()
      assertGetCosmosSdkChainAdapter(chainId)

      const status = await (async () => {
        const baseUrl = chainId === osmosisChainId ? osmoUrl : cosmosUrl
        const txResponse = await axios.get(`${baseUrl}/lcd/txs/${txHash}`)

        if (!txResponse?.data) return TxStatus.Pending

        if (!txResponse?.data?.codespace && !!txResponse?.data?.gas_used) return TxStatus.Confirmed
        if (txResponse?.data?.codespace) return TxStatus.Failed

        return TxStatus.Pending
      })()

      return {
        status,
        buyTxHash: txHash,
        message: undefined,
      }
    } catch (e) {
      console.error(e)
      return createDefaultStatusResponse(txHash)
    }
  },
}
