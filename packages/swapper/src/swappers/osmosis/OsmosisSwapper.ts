import { Asset } from '@shapeshiftoss/asset-service'
import {
  AssetId,
  ChainId,
  cosmosAssetId,
  cosmosChainId,
  osmosisAssetId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import { cosmos, osmosis } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import {
  ApprovalNeededOutput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetTradeQuoteInput,
  MinMaxOutput,
  SwapError,
  SwapErrorType,
  Swapper,
  SwapperName,
  SwapperType,
  Trade,
  TradeQuote,
  TradeTxs,
} from '../../api'
import { bn, bnOrZero } from '../utils/bignumber'
import {
  COSMO_OSMO_CHANNEL,
  DEFAULT_SOURCE,
  MAX_SWAPPER_SELL,
  OSMO_COSMO_CHANNEL,
} from './utils/constants'
import {
  buildTradeTx,
  getRateInfo,
  performIbcTransfer,
  pollForAtomChannelBalance,
  pollForComplete,
  SymbolDenomMapping,
  symbolDenomMapping,
} from './utils/helpers'
import { OsmosisTradeResult, OsmoSwapperDeps } from './utils/types'

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
    this.supportedAssetIds = [cosmosAssetId, osmosisAssetId]
  }

  async getTradeTxs(tradeResult: OsmosisTradeResult): Promise<TradeTxs> {
    if (tradeResult.cosmosAddress) {
      const cosmosAdapter = this.deps.adapterManager.get(cosmosChainId) as
        | cosmos.ChainAdapter
        | undefined

      if (!cosmosAdapter)
        throw new SwapError('OsmosisSwapper: couldnt get cosmos adapter', {
          code: SwapErrorType.GET_TRADE_TXS_FAILED,
        })

      const cosmosTxHistory = await cosmosAdapter.getTxHistory({
        pubkey: tradeResult.cosmosAddress,
        pageSize: 1,
      })
      const currentCosmosTxid = cosmosTxHistory?.transactions[0].txid

      return {
        sellTxid: tradeResult.tradeId,
        // This logic assumes there are the next cosmos tx will be the correct ibc transfer
        // a random incoming tx COULD cause this logic to fail but its unlikely
        // TODO find a better solution (may require unchained and parser additions)
        buyTxid: currentCosmosTxid !== tradeResult.previousCosmosTxid ? currentCosmosTxid : '',
      }
    } else {
      return {
        sellTxid: tradeResult.previousCosmosTxid,
        buyTxid: tradeResult.tradeId,
      }
    }
  }

  async getUsdRate(input: Pick<Asset, 'symbol' | 'assetId'>): Promise<string> {
    const { symbol } = input

    const sellAssetSymbol = symbol
    const buyAssetSymbol = 'USDC'
    const sellAmount = '1'
    const { rate: osmoRate } = await getRateInfo(
      'OSMO',
      buyAssetSymbol,
      sellAmount,
      this.deps.osmoUrl,
    )

    if (sellAssetSymbol !== 'OSMO') {
      const { rate } = await getRateInfo(sellAssetSymbol, 'OSMO', sellAmount, this.deps.osmoUrl)
      return bnOrZero(rate).times(osmoRate).toString()
    }

    return osmoRate
  }

  async getMinMax(input: { sellAsset: Asset }): Promise<MinMaxOutput> {
    const { sellAsset } = input
    const usdRate = await this.getUsdRate({ ...sellAsset })
    const minimum = bn(1).dividedBy(bnOrZero(usdRate)).toString()
    const maximum = MAX_SWAPPER_SELL

    return {
      minimum,
      maximum,
    }
  }

  async approvalNeeded(): Promise<ApprovalNeededOutput> {
    return { approvalNeeded: false }
  }

  async approveInfinite(): Promise<string> {
    throw new SwapError('OsmosisSwapper: approveInfinite unimplemented', {
      code: SwapErrorType.RESPONSE_ERROR,
    })
  }

  async approveAmount(): Promise<string> {
    throw new SwapError('Osmosis: approveAmount unimplemented', {
      code: SwapErrorType.RESPONSE_ERROR,
    })
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): string[] {
    const { assetIds = [], sellAssetId } = args
    if (!this.supportedAssetIds.includes(sellAssetId)) return []

    return assetIds.filter(
      (assetId) => this.supportedAssetIds.includes(assetId) && assetId !== sellAssetId,
    )
  }

  filterAssetIdsBySellable(): AssetId[] {
    return this.supportedAssetIds
  }

  async buildTrade(args: BuildTradeInput): Promise<Trade<ChainId>> {
    const {
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      receiveAddress,
      accountNumber,
      receiveAccountNumber,
    } = args

    if (!sellAmountCryptoBaseUnit) {
      throw new SwapError('sellAmountCryptoPrecision is required', {
        code: SwapErrorType.BUILD_TRADE_FAILED,
      })
    }

    const { buyAssetTradeFeeUsd, rate, buyAmountCryptoBaseUnit } = await getRateInfo(
      sellAsset.symbol,
      buyAsset.symbol,
      sellAmountCryptoBaseUnit !== '0' ? sellAmountCryptoBaseUnit : '1',
      this.deps.osmoUrl,
    )

    //convert amount to base
    const sellAmountCryptoBase = String(bnOrZero(sellAmountCryptoBaseUnit).dp(0))

    const osmosisAdapter = this.deps.adapterManager.get(osmosisChainId) as
      | osmosis.ChainAdapter
      | undefined

    if (!osmosisAdapter)
      throw new SwapError('Failed to get Osmosis adapter', {
        code: SwapErrorType.BUILD_TRADE_FAILED,
      })

    const feeData = await osmosisAdapter.getFeeData({})
    const fee = feeData.fast.txFee

    return {
      buyAmountCryptoBaseUnit,
      buyAsset,
      feeData: {
        networkFeeCryptoBaseUnit: fee,
        sellAssetTradeFeeUsd: '0',
        buyAssetTradeFeeUsd,
      },
      rate,
      receiveAddress,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBase, // TODO(gomes): wat?
      sellAsset,
      accountNumber,
      receiveAccountNumber,
      sources: [{ name: SwapperName.Osmosis, proportion: '100' }],
    }
  }

  async getTradeQuote(input: GetTradeQuoteInput): Promise<TradeQuote<ChainId>> {
    const {
      accountNumber,
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    } = input
    if (!sellAmountCryptoBaseUnit) {
      throw new SwapError('sellAmount is required', {
        code: SwapErrorType.RESPONSE_ERROR,
      })
    }
    const { buyAssetTradeFeeUsd, rate, buyAmountCryptoBaseUnit } = await getRateInfo(
      sellAsset.symbol,
      buyAsset.symbol,
      sellAmountCryptoBaseUnit !== '0' ? sellAmountCryptoBaseUnit : '1',
      this.deps.osmoUrl,
    )

    const { minimum, maximum } = await this.getMinMax(input)

    const osmosisAdapter = this.deps.adapterManager.get(osmosisChainId) as
      | osmosis.ChainAdapter
      | undefined

    if (!osmosisAdapter)
      throw new SwapError('Failed to get Osmosis adapter', {
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      })

    const feeData = await osmosisAdapter.getFeeData({})
    const fee = feeData.fast.txFee

    return {
      buyAsset,
      feeData: {
        networkFeeCryptoBaseUnit: fee,
        sellAssetTradeFeeUsd: '0',
        buyAssetTradeFeeUsd,
      },
      maximum,
      minimumCryptoHuman: minimum, // TODO(gomes): shorthand?
      accountNumber,
      rate,
      sellAsset,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      sources: DEFAULT_SOURCE,
      allowanceContract: '',
    }
  }

  async executeTrade({ trade, wallet }: ExecuteTradeInput<ChainId>): Promise<OsmosisTradeResult> {
    const {
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      accountNumber,
      receiveAccountNumber,
      receiveAddress,
    } = trade

    if (receiveAccountNumber === undefined)
      throw new SwapError('Receive account number not provided', {
        code: SwapErrorType.RECEIVE_ACCOUNT_NUMBER_NOT_PROVIDED,
      })

    const isFromOsmo = sellAsset.assetId === osmosisAssetId
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
      throw new SwapError('Failed to get adapters', {
        code: SwapErrorType.EXECUTE_TRADE_FAILED,
      })
    }

    const feeData = await osmosisAdapter.getFeeData({})
    const gas = feeData.fast.chainSpecific.gasLimit

    let sellAddress
    let cosmosIbcTradeId = ''

    if (!isFromOsmo) {
      sellAddress = await cosmosAdapter.getAddress({ wallet, accountNumber })

      if (!sellAddress)
        throw new SwapError('Failed to get address', {
          code: SwapErrorType.EXECUTE_TRADE_FAILED,
        })

      const transfer = {
        sender: sellAddress,
        receiver: receiveAddress,
        amount: sellAmountCryptoBaseUnit,
      }

      const responseAccount = await cosmosAdapter.getAccount(sellAddress)
      const ibcAccountNumber = parseInt(responseAccount.chainSpecific.accountNumber || '0')

      const sequence = responseAccount.chainSpecific.sequence || '0'

      const { tradeId } = await performIbcTransfer(
        transfer,
        cosmosAdapter,
        wallet,
        this.deps.osmoUrl,
        'uatom',
        COSMO_OSMO_CHANNEL,
        feeData.fast.txFee,
        accountNumber,
        ibcAccountNumber,
        sequence,
        gas,
        'uatom',
      )

      cosmosIbcTradeId = tradeId

      // wait till confirmed
      const pollResult = await pollForComplete(tradeId, this.deps.cosmosUrl)
      if (pollResult !== 'success')
        throw new SwapError('ibc transfer failed', {
          code: SwapErrorType.EXECUTE_TRADE_FAILED,
        })

      ibcSellAmount = await pollForAtomChannelBalance(receiveAddress, this.deps.osmoUrl)

      // delay to ensure all nodes we interact with are up to date at this point
      // seeing intermittent bugs that suggest the balances and sequence numbers were sometimes off
      await new Promise((resolve) => setTimeout(resolve, 5000))
    } else {
      sellAddress = await osmosisAdapter.getAddress({ wallet, accountNumber })

      if (!sellAddress)
        throw new SwapError('failed to get osmoAddress', {
          code: SwapErrorType.EXECUTE_TRADE_FAILED,
        })
    }

    const osmoAddress = isFromOsmo ? sellAddress : receiveAddress
    const cosmosAddress = isFromOsmo ? receiveAddress : sellAddress
    const signTxInput = await buildTradeTx({
      osmoAddress,
      accountNumber: isFromOsmo ? accountNumber : receiveAccountNumber,
      adapter: osmosisAdapter,
      buyAssetDenom,
      sellAssetDenom,
      sellAmount: ibcSellAmount ?? sellAmountCryptoBaseUnit,
      gas,
      wallet,
    })

    const signed = await osmosisAdapter.signTransaction(signTxInput)
    const tradeId = await osmosisAdapter.broadcastTransaction(signed)

    if (isFromOsmo) {
      const pollResult = await pollForComplete(tradeId, this.deps.osmoUrl)
      if (pollResult !== 'success')
        throw new SwapError('osmo swap failed', {
          code: SwapErrorType.EXECUTE_TRADE_FAILED,
        })

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
      await new Promise((resolve) => setTimeout(resolve, 5000))

      const cosmosTxHistory = await cosmosAdapter.getTxHistory({
        pubkey: cosmosAddress,
        pageSize: 1,
      })

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
        gas,
        'uosmo',
      )
      return { tradeId, previousCosmosTxid: cosmosTxHistory.transactions[0]?.txid, cosmosAddress }
    }

    return { tradeId, previousCosmosTxid: cosmosIbcTradeId }
  }
}
