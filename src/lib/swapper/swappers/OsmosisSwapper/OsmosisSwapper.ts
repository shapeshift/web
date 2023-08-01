import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId, osmosisChainId, toAccountId } from '@shapeshiftoss/caip'
import type { cosmos, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import { osmosis } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type {
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  Trade,
  TradeQuote,
  TradeTxs,
} from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType, SwapperName } from 'lib/swapper/api'
import {
  COSMOSHUB_TO_OSMOSIS_CHANNEL,
  OSMOSIS_TO_COSMOSHUB_CHANNEL,
} from 'lib/swapper/swappers/OsmosisSwapper/utils/constants'
import type { SymbolDenomMapping } from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'
import {
  buildTradeTx,
  getRateInfo,
  performIbcTransfer,
  symbolDenomMapping,
} from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'
import type {
  OsmosisSupportedChainId,
  OsmosisTradeResult,
} from 'lib/swapper/swappers/OsmosisSwapper/utils/types'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { store } from 'state/store'
import { selectSellAssetUsdRate } from 'state/zustand/swapperStore/amountSelectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'

import { filterAssetIdsBySellable } from './filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { pollForComplete, pollForCrossChainComplete } from './utils/poll'

export class OsmosisSwapper implements Swapper<ChainId> {
  readonly name = SwapperName.Osmosis

  async getTradeTxs(tradeResult: OsmosisTradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    const adapterManager = getChainAdapterManager()
    if (tradeResult.cosmosAddress) {
      const cosmosAdapter = adapterManager.get(cosmosChainId) as cosmos.ChainAdapter | undefined

      if (!cosmosAdapter)
        return Err(
          makeSwapErrorRight({
            message: 'OsmosisSwapper: couldnt get cosmos adapter',
            code: SwapErrorType.GET_TRADE_TXS_FAILED,
          }),
        )

      const cosmosTxHistory = await cosmosAdapter.getTxHistory({
        pubkey: tradeResult.cosmosAddress,
        pageSize: 1,
      })
      const currentCosmosTxid = cosmosTxHistory?.transactions[0].txid

      return Ok({
        sellTxid: tradeResult.tradeId,
        // This logic assumes there are the next cosmos tx will be the correct ibc transfer
        // a random incoming tx COULD cause this logic to fail but its unlikely
        // TODO find a better solution (may require unchained and parser additions)
        buyTxid: currentCosmosTxid !== tradeResult.previousCosmosTxid ? currentCosmosTxid : '',
      })
    } else {
      return Ok({
        sellTxid: tradeResult.previousCosmosTxid,
        buyTxid: tradeResult.tradeId,
      })
    }
  }

  filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): string[] {
    return filterBuyAssetsBySellAssetId(input)
  }

  filterAssetIdsBySellable(): AssetId[] {
    return filterAssetIdsBySellable()
  }

  async buildTrade(args: BuildTradeInput): Promise<Result<Trade<ChainId>, SwapErrorRight>> {
    const {
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      receiveAddress,
      accountNumber,
      receiveAccountNumber,
    } = args

    if (!sellAmountCryptoBaseUnit) {
      return Err(
        makeSwapErrorRight({
          message: 'sellAmountCryptoPrecision is required',
          code: SwapErrorType.BUILD_TRADE_FAILED,
        }),
      )
    }

    const adapterManager = getChainAdapterManager()

    const { REACT_APP_OSMOSIS_NODE_URL: osmoUrl } = getConfig()

    const maybeRateInfo = await getRateInfo(
      sellAsset.symbol,
      buyAsset.symbol,
      sellAmountCryptoBaseUnit,
      osmoUrl,
    )

    if (!maybeRateInfo.isOk()) return Err(maybeRateInfo.unwrapErr())
    const { buyAssetTradeFeeCryptoBaseUnit, rate, buyAmountCryptoBaseUnit } = maybeRateInfo.unwrap()

    //convert amount to base
    const sellAmountCryptoBase = String(bnOrZero(sellAmountCryptoBaseUnit).dp(0))

    const osmosisAdapter = adapterManager.get(osmosisChainId) as osmosis.ChainAdapter | undefined
    const cosmosAdapter = adapterManager.get(cosmosChainId) as cosmos.ChainAdapter | undefined

    if (!cosmosAdapter || !osmosisAdapter)
      return Err(
        makeSwapErrorRight({
          message: 'Failed to get Cosmos SDK adapters',
          code: SwapErrorType.BUILD_TRADE_FAILED,
        }),
      )

    if (!receiveAddress)
      return Err(
        makeSwapErrorRight({
          message: 'Receive address is required to build Osmosis trades',
          code: SwapErrorType.MISSING_INPUT,
        }),
      )

    const sellAssetIsOnOsmosisNetwork = sellAsset.chainId === osmosisChainId

    const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
    const cosmosFees = await cosmosAdapter.getFeeData(getFeeDataInput)
    const osmosisFees = await osmosisAdapter.getFeeData(getFeeDataInput)
    const initiatingTxFeeData = sellAssetIsOnOsmosisNetwork ? osmosisFees : cosmosFees

    const osmosisToCosmosProtocolFees = {
      [sellAsset.assetId]: {
        amountCryptoBaseUnit: osmosis.MIN_FEE,
        requiresBalance: true, // network fee for second hop, represented as a protocol fee here

        asset: sellAsset,
      },
      [buyAsset.assetId]: {
        amountCryptoBaseUnit: buyAssetTradeFeeCryptoBaseUnit,
        requiresBalance: false,
        asset: buyAsset,
      },
    }

    const cosmosToOsmosisProtocolFees = {
      [sellAsset.assetId]: {
        amountCryptoBaseUnit: osmosisFees.fast.txFee,
        requiresBalance: true, // network fee for second hop, represented as a protocol fee here
        asset: sellAsset,
      },
      [buyAsset.assetId]: {
        amountCryptoBaseUnit: buyAssetTradeFeeCryptoBaseUnit,
        requiresBalance: false,
        asset: buyAsset,
      },
    }

    return Ok({
      buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
      buyAsset,
      feeData: {
        networkFeeCryptoBaseUnit: initiatingTxFeeData.fast.txFee,
        protocolFees:
          // Note, the current implementation is a hack where we consider the whole swap as one hop
          // This is only there to make the fees correct in the UI, but this isn't a "protocol fee", it's a network fee for the second hop (the IBC transfer)
          sellAssetIsOnOsmosisNetwork ? osmosisToCosmosProtocolFees : cosmosToOsmosisProtocolFees,
      },
      rate,
      receiveAddress,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBase, // TODO(gomes): wat?
      sellAsset,
      accountNumber,
      receiveAccountNumber,
      sources: [{ name: SwapperName.Osmosis, proportion: '100' }],
    })
  }

  getTradeQuote(input: GetTradeQuoteInput): Promise<Result<TradeQuote<ChainId>, SwapErrorRight>> {
    const sellAssetUsdRate = selectSellAssetUsdRate(swapperStore.getState())
    return getTradeQuote(input, { sellAssetUsdRate })
  }

  async executeTrade({
    trade,
    wallet,
  }: ExecuteTradeInput<ChainId>): Promise<Result<OsmosisTradeResult, SwapErrorRight>> {
    const {
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      accountNumber,
      receiveAccountNumber,
      receiveAddress,
    } = trade

    if (receiveAccountNumber === undefined)
      return Err(
        makeSwapErrorRight({
          message: 'Receive account number not provided',
          code: SwapErrorType.RECEIVE_ACCOUNT_NUMBER_NOT_PROVIDED,
        }),
      )

    const buyAssetIsOnOsmosisNetwork = buyAsset.chainId === osmosisChainId
    const sellAssetIsOnOsmosisNetwork = sellAsset.chainId === osmosisChainId

    const sellAssetDenom = symbolDenomMapping[sellAsset.symbol as keyof SymbolDenomMapping]
    const buyAssetDenom = symbolDenomMapping[buyAsset.symbol as keyof SymbolDenomMapping]

    const adapterManager = getChainAdapterManager()
    const osmosisAdapter = adapterManager.get(osmosisChainId) as osmosis.ChainAdapter | undefined
    const cosmosAdapter = adapterManager.get(cosmosChainId) as cosmos.ChainAdapter | undefined

    const { REACT_APP_OSMOSIS_NODE_URL: osmoUrl, REACT_APP_COSMOS_NODE_URL: cosmosUrl } =
      getConfig()

    if (!cosmosAdapter || !osmosisAdapter) {
      return Err(
        makeSwapErrorRight({
          message: 'Failed to get adapters',
          code: SwapErrorType.EXECUTE_TRADE_FAILED,
        }),
      )
    }

    let sellAddress
    let cosmosIbcTradeId = ''

    if (sellAssetIsOnOsmosisNetwork) {
      sellAddress = await osmosisAdapter.getAddress({ wallet, accountNumber })

      if (!sellAddress)
        throw new SwapError('failed to get osmoAddress', {
          code: SwapErrorType.EXECUTE_TRADE_FAILED,
        })
    } else {
      /** If the sell asset is not on the Osmosis network, we need to bridge the
       * asset to the Osmosis network first in order to perform a swap on Osmosis DEX.
       */
      sellAddress = await cosmosAdapter.getAddress({ wallet, accountNumber })

      if (!sellAddress)
        return Err(
          makeSwapErrorRight({
            message: 'Failed to get address',
            code: SwapErrorType.EXECUTE_TRADE_FAILED,
          }),
        )

      const transfer = {
        sender: sellAddress,
        receiver: receiveAddress,
        amount: sellAmountCryptoBaseUnit,
      }

      const responseAccount = await cosmosAdapter.getAccount(sellAddress)
      const ibcAccountNumber = responseAccount.chainSpecific.accountNumber || '0'

      const sequence = responseAccount.chainSpecific.sequence || '0'

      const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
      const ibcFromCosmosFeeData = await cosmosAdapter.getFeeData(getFeeDataInput)

      const { tradeId } = await performIbcTransfer({
        input: transfer,
        adapter: cosmosAdapter,
        wallet,
        blockBaseUrl: osmoUrl,
        denom: 'uatom',
        sourceChannel: COSMOSHUB_TO_OSMOSIS_CHANNEL,
        feeAmount: ibcFromCosmosFeeData.fast.txFee,
        accountNumber,
        ibcAccountNumber,
        sequence,
        gas: ibcFromCosmosFeeData.fast.chainSpecific.gasLimit,
        feeDenom: 'uatom',
      })

      const initiatingChainAccountId = toAccountId({ chainId: cosmosChainId, account: sellAddress })
      const initiatingChainTxid = serializeTxIndex(initiatingChainAccountId, tradeId, sellAddress)

      cosmosIbcTradeId = tradeId

      // wait till confirmed
      const pollResult = await pollForCrossChainComplete({
        initiatingChainTxid,
        initiatingChainAccountId,
        getState: store.getState,
      })
      if (pollResult !== 'success')
        return Err(
          makeSwapErrorRight({
            message: 'ibc transfer failed',
            code: SwapErrorType.EXECUTE_TRADE_FAILED,
          }),
        )

      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    /** Execute the swap on Osmosis DEX */
    const osmoAddress = sellAssetIsOnOsmosisNetwork ? sellAddress : receiveAddress
    const cosmosAddress = sellAssetIsOnOsmosisNetwork ? receiveAddress : sellAddress

    /** At the current time, only OSMO<->ATOM swaps are supported, so this is fine.
     * In the future, as more Osmosis network assets are added, the buy asset should
     * be used as the fee asset automatically. See the whitelist of supported fee assets here:
     * https://github.com/osmosis-labs/osmosis/blob/04026675f75ca065fb89f965ab2d33c9840c965a/app/upgrades/v5/whitelist_feetokens.go
     */

    const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
    const initiatingTxFeeData = await (sellAssetIsOnOsmosisNetwork
      ? osmosisAdapter.getFeeData(getFeeDataInput)
      : cosmosAdapter.getFeeData(getFeeDataInput))

    // Swaps happen on the Osmosis chain, so network fees are always paid in OSMO
    // That is different from the network fees that happen while making an IBC transfer, which are occured in the transfer denom
    const osmosisFees = await osmosisAdapter.getFeeData(getFeeDataInput)
    const feeDenom = sellAssetIsOnOsmosisNetwork
      ? symbolDenomMapping['OSMO']
      : symbolDenomMapping['ATOM']
    const maybeRateInfo = await getRateInfo(
      sellAsset.symbol,
      buyAsset.symbol,
      sellAmountCryptoBaseUnit,
      osmoUrl,
    )

    if (!maybeRateInfo.isOk()) return Err(maybeRateInfo.unwrapErr())
    const { buyAmountCryptoBaseUnit } = maybeRateInfo.unwrap()

    // The actual amount that will end up on the IBC channel is the sell amount minus the fee for the IBC transfer Tx
    // We need to deduct the fees from the initial amount in case we're dealing with an IBC transfer + swap flow
    // or else, this will break for swaps to an Osmosis address that doesn't yet have ATOM
    const sellAmountAfterIbcTransferFeesCryptoBaseUnit = sellAssetIsOnOsmosisNetwork
      ? sellAmountCryptoBaseUnit
      : bnOrZero(sellAmountCryptoBaseUnit).minus(initiatingTxFeeData.fast.txFee).toString()
    const signTxInput = await buildTradeTx({
      osmoAddress,
      accountNumber: sellAssetIsOnOsmosisNetwork ? accountNumber : receiveAccountNumber,
      adapter: osmosisAdapter,
      buyAssetDenom,
      sellAssetDenom,
      sellAmount: sellAmountAfterIbcTransferFeesCryptoBaseUnit,
      gas: osmosisFees.fast.chainSpecific.gasLimit,
      feeAmount: osmosisFees.fast.txFee,
      feeDenom,
      wallet,
    })

    const signed = await osmosisAdapter.signTransaction(signTxInput)
    const tradeId = await osmosisAdapter.broadcastTransaction(signed)

    const destinationChainAccountId = toAccountId({ chainId: osmosisChainId, account: osmoAddress })
    const destinationChainTxid = serializeTxIndex(destinationChainAccountId, tradeId, osmoAddress)

    const pollResult = await pollForComplete({
      txid: destinationChainTxid,
      getState: store.getState,
    })
    if (pollResult !== 'success')
      return Err(
        makeSwapErrorRight({
          message: 'osmo swap failed',
          code: SwapErrorType.EXECUTE_TRADE_FAILED,
        }),
      )

    if (!buyAssetIsOnOsmosisNetwork) {
      /** If the buy asset is not on the Osmosis Network, we need to bridge the
       * asset from the Osmosis network to the buy asset network.
       */

      const transfer = {
        sender: sellAddress,
        receiver: receiveAddress,
        // TODO(gomes): That is too much of a deduction, and that's starting from "buyAmountCryptoBaseUnit" which is a rate/quote, not the actual amount that was IBC transfered
        // We should be polling for, and send the actual amount that was IBC transfered, not the amount that was quoted
        amount: bnOrZero(buyAmountCryptoBaseUnit).minus(initiatingTxFeeData.slow.txFee).toString(),
      }

      const ibcResponseAccount = await osmosisAdapter.getAccount(sellAddress)
      const ibcAccountNumber = ibcResponseAccount.chainSpecific.accountNumber
      const ibcSequence = ibcResponseAccount.chainSpecific.sequence || '0'

      // delay to ensure all nodes we interact with are up to date at this point
      // seeing intermittent bugs that suggest the balances and sequence numbers were sometimes off
      await new Promise(resolve => setTimeout(resolve, 5000))

      const cosmosTxHistory = await cosmosAdapter.getTxHistory({
        pubkey: cosmosAddress,
        pageSize: 1,
      })

      const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
      const ibcFromOsmosisFeeData = await osmosisAdapter.getFeeData(getFeeDataInput)

      const { tradeId } = await performIbcTransfer({
        input: transfer,
        adapter: osmosisAdapter,
        wallet,
        blockBaseUrl: cosmosUrl,
        denom: buyAssetDenom,
        sourceChannel: OSMOSIS_TO_COSMOSHUB_CHANNEL,
        feeAmount: osmosis.MIN_FEE,
        accountNumber,
        ibcAccountNumber,
        sequence: ibcSequence,
        gas: ibcFromOsmosisFeeData.fast.chainSpecific.gasLimit,
        feeDenom: 'uosmo',
      })

      const initiatingChainAccountId = toAccountId({
        chainId: osmosisChainId,
        account: sellAddress,
      })
      const initiatingChainTxid = serializeTxIndex(initiatingChainAccountId, tradeId, sellAddress)

      // wait till confirmed
      const pollResult = await pollForCrossChainComplete({
        initiatingChainAccountId,
        initiatingChainTxid,
        getState: store.getState,
      })

      if (pollResult !== 'success')
        return Err(
          makeSwapErrorRight({
            message: 'ibc transfer failed',
            code: SwapErrorType.EXECUTE_TRADE_FAILED,
          }),
        )

      return Ok({
        tradeId,
        previousCosmosTxid: cosmosTxHistory.transactions[0]?.txid,
        cosmosAddress,
      })
    }

    return Ok({ tradeId, previousCosmosTxid: sellAssetIsOnOsmosisNetwork ? '' : cosmosIbcTradeId })
  }
}
