import { cosmosChainId, osmosisChainId } from '@shapeshiftoss/caip'
import type { cosmos, GetFeeDataInput, osmosis } from '@shapeshiftoss/chain-adapters'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { CosmosSignTx } from '@shapeshiftoss/hdwallet-core'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads'
import { getConfig } from 'config'
import { v4 as uuid } from 'uuid'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type {
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote2,
} from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import type { SymbolDenomMapping } from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'
import {
  buildApiTradeTx,
  buildPerformIbcTransferUnsignedTx,
  symbolDenomMapping,
} from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'

import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { atomOnOsmosisAssetId, COSMO_OSMO_CHANNEL } from './utils/constants'
import type { OsmosisSupportedChainId } from './utils/types'

const tradeQuoteMetadata: Map<string, { chainId: OsmosisSupportedChainId }> = new Map()

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
      tradeQuoteMetadata.set(id, {
        chainId: tradeQuote.steps[0].sellAsset.chainId as OsmosisSupportedChainId,
      })
      return { id, receiveAddress, affiliateBps, ...tradeQuote }
    })
  },

  getUnsignedTx: async ({
    from,
    tradeQuote,
    stepIndex,
  }: GetUnsignedTxArgs): Promise<CosmosSignTx> => {
    const { accountNumber, buyAsset, sellAsset, sellAmountBeforeFeesCryptoBaseUnit } =
      tradeQuote.steps[stepIndex]
    const { receiveAddress } = tradeQuote

    const sellAssetIsOnOsmosisNetwork = sellAsset.chainId === osmosisChainId

    const sellAssetDenom = symbolDenomMapping[sellAsset.symbol as keyof SymbolDenomMapping]
    const buyAssetDenom = symbolDenomMapping[buyAsset.symbol as keyof SymbolDenomMapping]

    const adapterManager = getChainAdapterManager()
    const osmosisAdapter = adapterManager.get(osmosisChainId) as osmosis.ChainAdapter | undefined
    const cosmosAdapter = adapterManager.get(cosmosChainId) as cosmos.ChainAdapter | undefined

    const { REACT_APP_OSMOSIS_NODE_URL: osmoUrl } = getConfig()

    if (!cosmosAdapter || !osmosisAdapter) throw new Error('Failed to get adapters')

    let sellAddress

    if (sellAssetIsOnOsmosisNetwork) {
      sellAddress = from

      if (!sellAddress)
        throw new SwapError('failed to get osmoAddress', {
          code: SwapErrorType.EXECUTE_TRADE_FAILED,
        })
    } else {
      /** If the sell asset is not on the Osmosis network, we need to bridge the
       * asset to the Osmosis network first in order to perform a swap on Osmosis DEX.
       */
      sellAddress = from

      if (!sellAddress) throw new Error('Failed to get address')

      const transfer = {
        sender: sellAddress,
        receiver: receiveAddress,
        amount: sellAmountBeforeFeesCryptoBaseUnit,
      }

      const responseAccount = await cosmosAdapter.getAccount(sellAddress)
      const ibcAccountNumber = parseInt(responseAccount.chainSpecific.accountNumber || '0')

      const sequence = responseAccount.chainSpecific.sequence || '0'

      const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
      const ibcFromCosmosFeeData = await cosmosAdapter.getFeeData(getFeeDataInput)

      const unsignedTx = await buildPerformIbcTransferUnsignedTx({
        input: transfer,
        adapter: cosmosAdapter,
        blockBaseUrl: osmoUrl,
        denom: 'uatom',
        sourceChannel: COSMO_OSMO_CHANNEL,
        feeAmount: ibcFromCosmosFeeData.fast.txFee,
        accountNumber,
        ibcAccountNumber,
        sequence,
        gas: ibcFromCosmosFeeData.fast.chainSpecific.gasLimit,
        feeDenom: 'uatom',
      })

      return unsignedTx
    }

    // TODO(gomes): uncomment me when actually implementing multi-hop
    // const osmoAddress = sellAssetIsOnOsmosisNetwork ? sellAddress : receiveAddress
    // const cosmosAddress = sellAssetIsOnOsmosisNetwork ? receiveAddress : sellAddress

    /** At the current time, only OSMO<->ATOM swaps are supported, so this is fine.
     * In the future, as more Osmosis network assets are added, the buy asset should
     * be used as the fee asset automatically. See the whitelist of supported fee assets here:
     * https://github.com/osmosis-labs/osmosis/blob/04026675f75ca065fb89f965ab2d33c9840c965a/app/upgrades/v5/whitelist_feetokens.go
     */

    const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
    const swapFeeData = await (sellAssetIsOnOsmosisNetwork
      ? osmosisAdapter.getFeeData(getFeeDataInput)
      : cosmosAdapter.getFeeData(getFeeDataInput))

    const feeDenom = sellAssetIsOnOsmosisNetwork
      ? 'uosmo'
      : atomOnOsmosisAssetId.split('/')[1].replace(/:/g, '/')

    // The actual amount that will end up on the IBC channel is the sell amount minus the fee for the IBC transfer Tx
    // We need to deduct the fees from the initial amount in case we're dealing with an IBC transfer + swap flow
    // or else, this will break for swaps to an Osmosis address that doesn't yet have ATOM
    const sellAmountAfterFeesCryptoBaseUnit = sellAssetIsOnOsmosisNetwork
      ? sellAmountBeforeFeesCryptoBaseUnit
      : bnOrZero(sellAmountBeforeFeesCryptoBaseUnit).minus(swapFeeData.fast.txFee).toString()

    // TODO(gomes): this is temporary while we plumb things through, this won't work for cross-account trades
    // We shouldn't have a notion of an accountNumber once we hit the new Osmosis swapper endpoints
    // or rather we should have it both on the sell and buy side?

    const receiveAccountNumber = accountNumber

    const osmoAddress = sellAssetIsOnOsmosisNetwork ? sellAddress : receiveAddress

    const txToSign = await buildApiTradeTx({
      osmoAddress,
      accountNumber: sellAssetIsOnOsmosisNetwork ? accountNumber : receiveAccountNumber,
      adapter: osmosisAdapter,
      buyAssetDenom,
      sellAssetDenom,
      sellAmount: sellAmountAfterFeesCryptoBaseUnit,
      gas: swapFeeData.fast.chainSpecific.gasLimit,
      feeAmount: swapFeeData.fast.txFee,
      feeDenom,
    })

    return txToSign
  },

  checkTradeStatus: async ({
    txHash,
  }): Promise<{ status: TxStatus; buyTxHash: string | undefined; message: string | undefined }> => {
    // TODO(gomes): implement me
  },
}
