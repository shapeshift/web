import { Asset } from '@shapeshiftoss/asset-service'
import {
  AssetId,
  ChainId,
  cosmosAssetId,
  cosmosChainId,
  osmosisAssetId,
  osmosisChainId
} from '@shapeshiftoss/caip'
import { cosmos, osmosis } from '@shapeshiftoss/chain-adapters'

import {
  ApprovalNeededOutput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetTradeQuoteInput,
  MinMaxOutput,
  SwapError,
  SwapErrorTypes,
  Swapper,
  SwapperType,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs
} from '../../api'
import { bn, bnOrZero } from '../utils/bignumber'
import {
  COSMO_OSMO_CHANNEL,
  DEFAULT_SOURCE,
  MAX_SWAPPER_SELL,
  OSMO_COSMO_CHANNEL
} from './utils/constants'
import {
  buildTradeTx,
  getRateInfo,
  performIbcTransfer,
  pollForAtomChannelBalance,
  pollForComplete,
  SymbolDenomMapping,
  symbolDenomMapping
} from './utils/helpers'
import { OsmoSwapperDeps } from './utils/types'

export class OsmosisSwapper implements Swapper<ChainId> {
  readonly name = 'Osmosis'
  supportedAssetIds: string[]
  deps: OsmoSwapperDeps

  getType() {
    return SwapperType.Osmosis
  }

  constructor(deps: OsmoSwapperDeps) {
    this.deps = deps
    this.supportedAssetIds = [cosmosAssetId, osmosisAssetId]
  }

  async getTradeTxs(tradeResult: TradeResult): Promise<TradeTxs> {
    return {
      sellTxid: tradeResult.tradeId,
      buyTxid: tradeResult.tradeId
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
      this.deps.osmoUrl
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
      maximum
    }
  }

  async approvalNeeded(): Promise<ApprovalNeededOutput> {
    return { approvalNeeded: false }
  }

  async approveInfinite(): Promise<string> {
    throw new SwapError('OsmosisSwapper: approveInfinite unimplemented', {
      code: SwapErrorTypes.RESPONSE_ERROR
    })
  }

  async approveAmount(): Promise<string> {
    throw new SwapError('Osmosis: approveAmount unimplemented', {
      code: SwapErrorTypes.RESPONSE_ERROR
    })
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): string[] {
    const { assetIds = [], sellAssetId } = args
    if (!this.supportedAssetIds.includes(sellAssetId)) return []

    return assetIds.filter(
      (assetId) => this.supportedAssetIds.includes(assetId) && assetId !== sellAssetId
    )
  }

  filterAssetIdsBySellable(): AssetId[] {
    return this.supportedAssetIds
  }

  async buildTrade(args: BuildTradeInput): Promise<Trade<ChainId>> {
    const { sellAsset, buyAsset, sellAmount, receiveAddress } = args

    if (!sellAmount) {
      throw new SwapError('sellAmount is required', {
        code: SwapErrorTypes.BUILD_TRADE_FAILED
      })
    }

    const { tradeFee, rate, buyAmount } = await getRateInfo(
      sellAsset.symbol,
      buyAsset.symbol,
      sellAmount !== '0' ? sellAmount : '1',
      this.deps.osmoUrl
    )

    //convert amount to base
    const amountBaseSell = String(bnOrZero(sellAmount).dp(0))

    const osmosisAdapter = this.deps.adapterManager.get(osmosisChainId) as
      | osmosis.ChainAdapter
      | undefined

    if (!osmosisAdapter)
      throw new SwapError('Failed to get Osmosis adapter', {
        code: SwapErrorTypes.BUILD_TRADE_FAILED
      })

    const feeData = await osmosisAdapter.getFeeData({})
    const fee = feeData.fast.txFee

    return {
      buyAmount,
      buyAsset,
      feeData: { fee, tradeFee },
      rate,
      receiveAddress,
      sellAmount: amountBaseSell,
      sellAsset,
      sellAssetAccountNumber: 0,
      sources: [{ name: 'Osmosis', proportion: '100' }]
    }
  }

  async getTradeQuote(input: GetTradeQuoteInput): Promise<TradeQuote<ChainId>> {
    const { sellAsset, buyAsset, sellAmount } = input
    if (!sellAmount) {
      throw new SwapError('sellAmount is required', {
        code: SwapErrorTypes.RESPONSE_ERROR
      })
    }
    const { tradeFee, rate, buyAmount } = await getRateInfo(
      sellAsset.symbol,
      buyAsset.symbol,
      sellAmount !== '0' ? sellAmount : '1',
      this.deps.osmoUrl
    )

    const { minimum, maximum } = await this.getMinMax(input)

    const osmosisAdapter = this.deps.adapterManager.get(osmosisChainId) as
      | osmosis.ChainAdapter
      | undefined

    if (!osmosisAdapter)
      throw new SwapError('Failed to get Osmosis adapter', {
        code: SwapErrorTypes.TRADE_QUOTE_FAILED
      })

    const feeData = await osmosisAdapter.getFeeData({})
    const fee = feeData.fast.txFee

    return {
      buyAsset,
      feeData: { fee, tradeFee },
      maximum,
      minimum,
      sellAssetAccountNumber: 0,
      rate,
      sellAsset,
      sellAmount,
      buyAmount,
      sources: DEFAULT_SOURCE,
      allowanceContract: ''
    }
  }

  async executeTrade({ trade, wallet }: ExecuteTradeInput<ChainId>): Promise<TradeResult> {
    const { sellAsset, buyAsset, sellAmount, sellAssetAccountNumber, receiveAddress } = trade

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
        code: SwapErrorTypes.EXECUTE_TRADE_FAILED
      })
    }

    let sellAddress
    const feeData = await osmosisAdapter.getFeeData({})
    const gas = feeData.fast.chainSpecific.gasLimit

    if (!isFromOsmo) {
      const sellBip44Params = cosmosAdapter.buildBIP44Params({
        accountNumber: Number(sellAssetAccountNumber)
      })

      sellAddress = await cosmosAdapter.getAddress({ wallet, bip44Params: sellBip44Params })

      if (!sellAddress)
        throw new SwapError('Failed to get address', {
          code: SwapErrorTypes.EXECUTE_TRADE_FAILED
        })

      const transfer = {
        sender: sellAddress,
        receiver: receiveAddress,
        amount: sellAmount
      }

      const responseAccount = await cosmosAdapter.getAccount(sellAddress)
      const accountNumber = responseAccount.chainSpecific.accountNumber || '0'
      const sequence = responseAccount.chainSpecific.sequence || '0'

      const { tradeId } = await performIbcTransfer(
        transfer,
        cosmosAdapter,
        wallet,
        this.deps.osmoUrl,
        'uatom',
        COSMO_OSMO_CHANNEL,
        '0',
        accountNumber,
        sequence,
        gas
      )

      // wait till confirmed
      const pollResult = await pollForComplete(tradeId, this.deps.cosmosUrl)
      if (pollResult !== 'success')
        throw new SwapError('ibc transfer failed', {
          code: SwapErrorTypes.EXECUTE_TRADE_FAILED
        })

      ibcSellAmount = await pollForAtomChannelBalance(receiveAddress, this.deps.osmoUrl)
      // delay to ensure all nodes we interact with are up to date at this point
      // seeing intermittent bugs that suggest the balances and sequence numbers were sometimes off
      await new Promise((resolve) => setTimeout(resolve, 3000))
    } else {
      const sellBip44Params = osmosisAdapter.buildBIP44Params({
        accountNumber: Number(sellAssetAccountNumber)
      })
      sellAddress = await osmosisAdapter.getAddress({ wallet, bip44Params: sellBip44Params })

      if (!sellAddress)
        throw new SwapError('failed to get osmoAddress', {
          code: SwapErrorTypes.EXECUTE_TRADE_FAILED
        })
    }

    const osmoAddress = isFromOsmo ? sellAddress : receiveAddress
    const signTxInput = await buildTradeTx({
      osmoAddress,
      adapter: osmosisAdapter,
      buyAssetDenom,
      sellAssetDenom,
      sellAmount: ibcSellAmount ?? sellAmount,
      gas,
      wallet
    })

    const signed = await osmosisAdapter.signTransaction(signTxInput)
    const tradeId = await osmosisAdapter.broadcastTransaction(signed)

    if (isFromOsmo) {
      const pollResult = await pollForComplete(tradeId, this.deps.osmoUrl)
      if (pollResult !== 'success')
        throw new SwapError('osmo swap failed', {
          code: SwapErrorTypes.EXECUTE_TRADE_FAILED
        })

      const amount = await pollForAtomChannelBalance(sellAddress, this.deps.osmoUrl)
      const transfer = {
        sender: sellAddress,
        receiver: receiveAddress,
        amount
      }

      const ibcResponseAccount = await osmosisAdapter.getAccount(sellAddress)
      const ibcAccountNumber = ibcResponseAccount.chainSpecific.accountNumber || '0'
      const ibcSequence = ibcResponseAccount.chainSpecific.sequence || '0'

      // delay to ensure all nodes we interact with are up to date at this point
      // seeing intermittent bugs that suggest the balances and sequence numbers were sometimes off
      await new Promise((resolve) => setTimeout(resolve, 3000))
      await performIbcTransfer(
        transfer,
        osmosisAdapter,
        wallet,
        this.deps.cosmosUrl,
        buyAssetDenom,
        OSMO_COSMO_CHANNEL,
        '0',
        ibcAccountNumber,
        ibcSequence,
        gas
      )
    }

    return { tradeId: tradeId || 'error' }
  }
}
