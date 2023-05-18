import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { cosmosAssetId, cosmosChainId, osmosisAssetId, osmosisChainId } from '@shapeshiftoss/caip'
import type { cosmos } from '@shapeshiftoss/chain-adapters'
import { osmosis } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type {
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetTradeQuoteInput,
  MinMaxOutput,
  SwapErrorRight,
  Swapper,
  Trade,
  TradeQuote,
  TradeTxs,
} from 'lib/swapper/api'
import {
  makeSwapErrorRight,
  SwapError,
  SwapErrorType,
  SwapperName,
  SwapperType,
} from 'lib/swapper/api'
import {
  atomOnOsmosisAssetId,
  COSMO_OSMO_CHANNEL,
  DEFAULT_SOURCE,
  MAX_SWAPPER_SELL,
  OSMO_COSMO_CHANNEL,
} from 'lib/swapper/swappers/OsmosisSwapper/utils/constants'
import type { SymbolDenomMapping } from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'
import {
  buildTradeTx,
  getRateInfo,
  performIbcTransfer,
  pollForAtomChannelBalance,
  pollForComplete,
  symbolDenomMapping,
} from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'
import type {
  OsmosisTradeResult,
  OsmoSwapperDeps,
} from 'lib/swapper/swappers/OsmosisSwapper/utils/types'
import { selectSellAssetUsdRate } from 'state/zustand/swapperStore/amountSelectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export type OsmosisSupportedChainId = KnownChainIds.CosmosMainnet | KnownChainIds.OsmosisMainnet

export type OsmosisSupportedChainAdapter = cosmos.ChainAdapter | osmosis.ChainAdapter

export class OsmosisSwapper implements Swapper<ChainId> {
  readonly name = SwapperName.Osmosis
  supportedAssetIds: string[]
  deps: OsmoSwapperDeps

  getType() {
    return SwapperType.Osmosis
  }

  constructor(deps: OsmoSwapperDeps) {
    this.deps = deps
    this.supportedAssetIds = [cosmosAssetId, osmosisAssetId, atomOnOsmosisAssetId]
  }

  async getTradeTxs(tradeResult: OsmosisTradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    if (tradeResult.cosmosAddress) {
      const cosmosAdapter = this.deps.adapterManager.get(cosmosChainId) as
        | cosmos.ChainAdapter
        | undefined

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

  getMinMax(): Result<MinMaxOutput, SwapErrorRight> {
    const sellAssetUsdRate = selectSellAssetUsdRate(swapperStore.getState())
    const minimumAmountCryptoHuman = bn(1).dividedBy(bnOrZero(sellAssetUsdRate)).toString()
    const maximumAmountCryptoHuman = MAX_SWAPPER_SELL

    return Ok({
      minimumAmountCryptoHuman,
      maximumAmountCryptoHuman,
    })
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): string[] {
    const { assetIds = [], sellAssetId } = args
    if (!this.supportedAssetIds.includes(sellAssetId)) return []

    return assetIds.filter(
      assetId => this.supportedAssetIds.includes(assetId) && assetId !== sellAssetId,
    )
  }

  filterAssetIdsBySellable(): AssetId[] {
    return this.supportedAssetIds
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

    const maybeRateInfo = await getRateInfo(
      sellAsset.symbol,
      buyAsset.symbol,
      sellAmountCryptoBaseUnit !== '0' ? sellAmountCryptoBaseUnit : '1',
      this.deps.osmoUrl,
    )

    if (!maybeRateInfo.isOk()) return Err(maybeRateInfo.unwrapErr())
    const { buyAssetTradeFeeCyptoBaseUnit, rate, buyAmountCryptoBaseUnit } = maybeRateInfo.unwrap()

    //convert amount to base
    const sellAmountCryptoBase = String(bnOrZero(sellAmountCryptoBaseUnit).dp(0))

    const osmosisAdapter = this.deps.adapterManager.get(osmosisChainId) as
      | osmosis.ChainAdapter
      | undefined

    if (!osmosisAdapter)
      return Err(
        makeSwapErrorRight({
          message: 'Failed to get Osmosis adapter',
          code: SwapErrorType.BUILD_TRADE_FAILED,
        }),
      )

    const feeData = await osmosisAdapter.getFeeData({})
    const fee = feeData.fast.txFee

    if (!receiveAddress)
      return Err(
        makeSwapErrorRight({
          message: 'Receive address is required to build Osmosis trades',
          code: SwapErrorType.MISSING_INPUT,
        }),
      )

    return Ok({
      buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
      buyAsset,
      feeData: {
        networkFeeCryptoBaseUnit: fee,
        protocolFees: {
          [buyAsset.assetId]: {
            amountCryptoBaseUnit: buyAssetTradeFeeCyptoBaseUnit,
            requiresBalance: true,
            asset: buyAsset,
          },
        },
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

  async getTradeQuote(
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote<ChainId>, SwapErrorRight>> {
    const {
      accountNumber,
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    } = input
    if (!sellAmountCryptoBaseUnit) {
      return Err(
        makeSwapErrorRight({
          message: 'sellAmount is required',
          code: SwapErrorType.RESPONSE_ERROR,
        }),
      )
    }

    const maybeRateInfo = await getRateInfo(
      sellAsset.symbol,
      buyAsset.symbol,
      sellAmountCryptoBaseUnit !== '0' ? sellAmountCryptoBaseUnit : '1',
      this.deps.osmoUrl,
    )

    if (maybeRateInfo.isErr()) return Err(maybeRateInfo.unwrapErr())
    const { buyAssetTradeFeeCyptoBaseUnit, rate, buyAmountCryptoBaseUnit } = maybeRateInfo.unwrap()

    const maybeMinMax = this.getMinMax()
    if (maybeMinMax.isErr()) return Err(maybeMinMax.unwrapErr())
    const { minimumAmountCryptoHuman, maximumAmountCryptoHuman } = maybeMinMax.unwrap()

    const osmosisAdapter = this.deps.adapterManager.get(osmosisChainId) as
      | osmosis.ChainAdapter
      | undefined

    if (!osmosisAdapter)
      return Err(
        makeSwapErrorRight({
          message: 'Failed to get Osmosis adapter',
          code: SwapErrorType.TRADE_QUOTE_FAILED,
        }),
      )

    const feeData = await osmosisAdapter.getFeeData({})
    const fee = feeData.fast.txFee

    return Ok({
      buyAsset,
      feeData: {
        networkFeeCryptoBaseUnit: fee,
        protocolFees: {
          [buyAsset.assetId]: {
            amountCryptoBaseUnit: buyAssetTradeFeeCyptoBaseUnit,
            requiresBalance: true,
            asset: buyAsset,
          },
        },
      },
      maximumCryptoHuman: maximumAmountCryptoHuman,
      minimumCryptoHuman: minimumAmountCryptoHuman, // TODO(gomes): shorthand?
      accountNumber,
      rate,
      sellAsset,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
      sources: DEFAULT_SOURCE,
      allowanceContract: '',
    })
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
    let ibcSellAmount

    const osmosisAdapter = this.deps.adapterManager.get(osmosisChainId) as
      | osmosis.ChainAdapter
      | undefined

    const cosmosAdapter = this.deps.adapterManager.get(cosmosChainId) as
      | cosmos.ChainAdapter
      | undefined

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
      const ibcAccountNumber = parseInt(responseAccount.chainSpecific.accountNumber || '0')

      const sequence = responseAccount.chainSpecific.sequence || '0'

      const ibcFromCosmosFeeData = await cosmosAdapter.getFeeData({})

      const { tradeId } = await performIbcTransfer(
        transfer,
        cosmosAdapter,
        wallet,
        this.deps.osmoUrl,
        'uatom',
        COSMO_OSMO_CHANNEL,
        ibcFromCosmosFeeData.fast.txFee,
        accountNumber,
        ibcAccountNumber,
        sequence,
        ibcFromCosmosFeeData.fast.chainSpecific.gasLimit,
        'uatom',
      )

      cosmosIbcTradeId = tradeId

      // wait till confirmed
      const pollResult = await pollForComplete(tradeId, this.deps.cosmosUrl)
      if (pollResult !== 'success')
        return Err(
          makeSwapErrorRight({
            message: 'ibc transfer failed',
            code: SwapErrorType.EXECUTE_TRADE_FAILED,
          }),
        )

      ibcSellAmount = await pollForAtomChannelBalance(receiveAddress, this.deps.osmoUrl)

      // delay to ensure all nodes we interact with are up to date at this point
      // seeing intermittent bugs that suggest the balances and sequence numbers were sometimes off
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
    const swapFeeData = await (sellAssetIsOnOsmosisNetwork
      ? osmosisAdapter.getFeeData({})
      : cosmosAdapter.getFeeData({}))

    const feeDenom = sellAssetIsOnOsmosisNetwork
      ? 'uosmo'
      : atomOnOsmosisAssetId.split('/')[1].replace(/:/g, '/')

    const signTxInput = await buildTradeTx({
      osmoAddress,
      accountNumber: sellAssetIsOnOsmosisNetwork ? accountNumber : receiveAccountNumber,
      adapter: osmosisAdapter,
      buyAssetDenom,
      sellAssetDenom,
      sellAmount: ibcSellAmount ?? sellAmountCryptoBaseUnit,
      gas: swapFeeData.fast.chainSpecific.gasLimit,
      feeAmount: swapFeeData.fast.txFee,
      feeDenom,
      wallet,
    })

    const signed = await osmosisAdapter.signTransaction(signTxInput)
    const tradeId = await osmosisAdapter.broadcastTransaction(signed)

    const pollResult = await pollForComplete(tradeId, this.deps.osmoUrl)
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

      const amount = await pollForAtomChannelBalance(sellAddress, this.deps.osmoUrl)
      const transfer = {
        sender: sellAddress,
        receiver: receiveAddress,
        amount,
      }

      const ibcResponseAccount = await osmosisAdapter.getAccount(sellAddress)
      const ibcAccountNumber = Number(ibcResponseAccount.chainSpecific.accountNumber)
      const ibcSequence = ibcResponseAccount.chainSpecific.sequence || '0'

      // delay to ensure all nodes we interact with are up to date at this point
      // seeing intermittent bugs that suggest the balances and sequence numbers were sometimes off
      await new Promise(resolve => setTimeout(resolve, 5000))

      const cosmosTxHistory = await cosmosAdapter.getTxHistory({
        pubkey: cosmosAddress,
        pageSize: 1,
      })

      const ibcFromOsmosisFeeData = await osmosisAdapter.getFeeData({})

      await performIbcTransfer(
        transfer,
        osmosisAdapter,
        wallet,
        this.deps.cosmosUrl,
        buyAssetDenom,
        OSMO_COSMO_CHANNEL,
        osmosis.MIN_FEE,
        accountNumber,
        ibcAccountNumber,
        ibcSequence,
        ibcFromOsmosisFeeData.fast.chainSpecific.gasLimit,
        'uosmo',
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
