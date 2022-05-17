import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { QuoteFeeData, SwapperManager, Trade, TradeQuote, ZrxSwapper } from '@shapeshiftoss/swapper'
import { Asset, ExecQuoteOutput, SupportedChainIds, SwapperType } from '@shapeshiftoss/types'
import debounce from 'lodash/debounce'
import { useCallback, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { BuildQuoteTxOutput, TradeAmountInputField, TradeAsset } from 'components/Trade/types'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getWeb3Instance } from 'lib/web3-instance'
import {
  selectAssetIds,
  selectFeeAssetById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { calculateAmounts } from './calculateAmounts'

const debounceTime = 1000

type GetQuoteInput = {
  amount: string
  sellAsset: Asset
  buyAsset: Asset
  feeAsset: Asset
  action: TradeAmountInputField
  forceQuote?: boolean
}

export enum TRADE_ERRORS {
  TITLE = 'trade.errors.title',
  NOT_ENOUGH_ETH = 'trade.errors.notEnoughEth',
  AMOUNT_TO_SMALL = 'trade.errors.amountToSmall',
  NEGATIVE_MAX = 'trade.errors.negativeMax',
  INVALID_MAX = 'trade.errors.invalidMax',
  INSUFFICIENT_FUNDS = 'trade.errors.insufficientFunds',
  INSUFFICIENT_FUNDS_FOR_LIMIT = 'trade.errors.insufficientFundsForLimit',
  INSUFFICIENT_FUNDS_FOR_AMOUNT = 'trade.errors.insufficientFundsForAmount',
  TRANSACTION_REJECTED = 'trade.errors.transactionRejected',
  BROADCAST_FAILED = 'trade.errors.broadcastFailed',
  NO_LIQUIDITY = 'trade.errors.noLiquidityError',
  BALANCE_TO_LOW = 'trade.errors.balanceToLow',
  DEX_TRADE_FAILED = 'trade.errors.dexTradeFailed',
  QUOTE_FAILED = 'trade.errors.quoteFailed',
  OVER_SLIP_SCORE = 'trade.errors.overSlipScore',
  FAILED_QUOTE_EXECUTED = 'trade.errors.failedQuoteExecuted',
  SELL_ASSET_REQUIRED = 'trade.errors.sellAssetRequired',
  SELL_AMOUNT_REQUIRED = 'trade.errors.sellAmountRequired',
  DEPOSIT_ADDRESS_REQUIRED = 'trade.errors.depositAddressRequired',
  SELL_ASSET_NETWORK_AND_SYMBOL_REQUIRED = 'trade.errors.sellAssetNetworkAndSymbolRequired',
  SIGNING_FAILED = 'trade.errors.signing.failed',
  SIGNING_REQUIRED = 'trade.errors.signing.required',
  HDWALLET_INVALID_CONFIG = 'trade.errors.hdwalletInvalidConfig',
}

export const useSwapper = () => {
  const { setValue } = useFormContext()
  const translate = useTranslate()
  const [quote, sellTradeAsset, trade] = useWatch({
    name: ['quote', 'sellAsset', 'trade'],
  }) as [
    TradeQuote<SupportedChainIds> & Trade<SupportedChainIds>,
    TradeAsset,
    Trade<SupportedChainIds>,
  ]
  const adapterManager = useChainAdapters()
  const [swapperManager] = useState<SwapperManager>(() => {
    const manager = new SwapperManager()
    const web3 = getWeb3Instance()
    manager.addSwapper(SwapperType.Zrx, new ZrxSwapper({ web3, adapterManager }))
    return manager
  })

  const filterAssetsByIds = (assets: Asset[], assetIds: string[]) => {
    const assetIdMap = Object.fromEntries(assetIds.map(assetId => [assetId, true]))
    return assets.filter(asset => assetIdMap[asset.assetId])
  }

  const assetIds = useSelector(selectAssetIds)
  const getSupportedSellableAssets = useCallback(
    (assets: Asset[]) => {
      const sellableAssetIds = swapperManager.getSupportedSellableAssetIds({ assetIds })
      return filterAssetsByIds(assets, sellableAssetIds)
    },
    [assetIds, swapperManager],
  )

  const getSupportedBuyAssetsFromSellAsset = useCallback(
    (assets: Asset[]): Asset[] => {
      const assetIds = assets.map(asset => asset.assetId)
      const supportedBuyAssetIds = swapperManager.getSupportedBuyAssetIdsFromSellId({
        assetIds,
        sellAssetId: sellTradeAsset?.asset.assetId,
      })
      return filterAssetsByIds(assets, supportedBuyAssetIds)
    },
    [swapperManager, sellTradeAsset],
  )

  const getDefaultPair = useCallback(() => {
    // eth & fox
    return ['eip155:1/slip44:60', 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d']
  }, [])

  const sellAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByAssetId(state, { assetId: sellTradeAsset?.asset.assetId }),
  )

  const feeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAsset?.asset.assetId ?? 'eip155:1/slip44:60'),
  )

  const getSendMaxAmount = async ({
    sellAsset,
    buyAsset,
    feeAsset,
  }: {
    wallet: HDWallet
    sellAsset: Asset
    buyAsset: Asset
    feeAsset: Asset
  }) => {
    const swapper = swapperManager.getSwapper(SwapperType.Zrx)
    const maximumQuote = await swapper.getTradeQuote({
      sellAsset,
      buyAsset,
      sellAmount: sellAssetBalance,
      sendMax: true,
      sellAssetAccountId: '0',
    })

    // Only subtract fee if sell asset is the fee asset
    const isFeeAsset = feeAsset.assetId === sellAsset.assetId
    // Pad fee because estimations can be wrong
    const feePadded = bnOrZero(maximumQuote?.feeData?.fee)
    // sell asset balance minus expected fee = maxTradeAmount
    // only subtract if sell asset is fee asset
    const maxAmount = fromBaseUnit(
      bnOrZero(sellAssetBalance)
        .minus(isFeeAsset ? feePadded : 0)
        .toString(),
      sellAsset.precision,
    )

    setValue('sellAsset.amount', maxAmount)
    return maxAmount
  }

  const updateTrade = async ({
    wallet,
    sellAsset,
    buyAsset,
    amount,
  }: {
    wallet: HDWallet
    sellAsset: Asset
    buyAsset: Asset
    amount: string
  }): Promise<BuildQuoteTxOutput> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: buyAsset.assetId,
      sellAssetId: sellAsset.assetId,
    })

    const { minimum } = await swapper.getMinMax({
      sellAsset,
      buyAsset,
    })
    const minSellAmount = toBaseUnit(minimum, sellAsset.precision)

    if (bnOrZero(amount).lt(minSellAmount)) {
      return {
        success: false,
        statusReason: translate(TRADE_ERRORS.AMOUNT_TO_SMALL, { minLimit: minimum }),
      }
    }

    const result = await swapper?.buildTrade({
      sellAmount: amount,
      sellAsset,
      buyAsset,
      sellAssetAccountId: '0', // TODO: remove hard coded accountId when multiple accounts are implemented
      buyAssetAccountId: '0', // TODO: remove hard coded accountId when multiple accounts are implemented
      wallet,
      sendMax: true,
    })
    if (result?.success) {
      setFees(result, sellAsset)
      setValue('trade', result)
      return result
    } else {
      return {
        success: false,
        statusReason: translate(TRADE_ERRORS.QUOTE_FAILED),
      }
    }
  }

  const executeQuote = async ({
    wallet,
  }: {
    wallet: HDWallet
  }): Promise<ExecQuoteOutput | undefined> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: trade.buyAsset.assetId,
      sellAssetId: trade.sellAsset.assetId,
    })
    return swapper.executeTrade({ trade, wallet })
  }

  const updateQuoteDebounced = useRef(
    debounce(async ({ amount, sellAsset, buyAsset, action }) => {
      try {
        const swapper = await swapperManager.getBestSwapper({
          buyAssetId: buyAsset.assetId,
          sellAssetId: sellAsset.assetId,
        })

        const { sellAmount, buyAmount, sellAssetUsdRate, feeAssetUsdRate, fiatSellAmount } =
          await calculateAmounts({
            buyAsset,
            sellAsset,
            feeAsset,
            swapper,
            action,
            amount,
          })

        const tradeQuote = await swapper.getTradeQuote({
          sellAsset,
          buyAsset,
          sellAmount,
          sendMax: false,
          sellAssetAccountId: '0',
        })

        setFees(tradeQuote, sellAsset)

        setValue('quote', tradeQuote)
        setValue('sellAssetFiatRate', sellAssetUsdRate)
        setValue('feeAssetFiatRate', feeAssetUsdRate)

        // Update trade input form fields to new calculated amount
        setValue('fiatSellAmount', fiatSellAmount) // Fiat input field amount
        setValue('buyAsset.amount', fromBaseUnit(buyAmount, buyAsset.precision)) // Buy asset input field amount
        setValue('sellAsset.amount', fromBaseUnit(sellAmount, sellAsset.precision)) // Sell asset input field amount
      } catch (e) {
        console.error(e)
      }
    }, debounceTime),
  )

  const updateQuote = async ({
    amount,
    sellAsset,
    buyAsset,
    feeAsset,
    action,
    forceQuote,
  }: GetQuoteInput) => {
    if (!forceQuote && bnOrZero(amount).isZero()) return
    setValue('quote', undefined)
    await updateQuoteDebounced.current({
      amount,
      feeAsset,
      sellAsset,
      action,
      buyAsset,
    })
  }

  const setFees = async (
    trade: Trade<SupportedChainIds> | TradeQuote<SupportedChainIds>,
    sellAsset: Asset,
  ) => {
    const feePrecision = feeAsset.precision
    const feeBN = bnOrZero(trade?.feeData?.fee).dividedBy(bn(10).exponentiatedBy(feePrecision))
    const fee = feeBN.toString()

    switch (sellAsset.chainId) {
      case 'eip155:1':
        {
          const ethResult = trade as TradeQuote<'eip155:1'>
          const approvalFee = ethResult?.feeData?.chainSpecific?.approvalFee
            ? bn(ethResult.feeData.chainSpecific.approvalFee)
                .dividedBy(bn(10).exponentiatedBy(18))
                .toString()
            : '0'
          const totalFee = feeBN.plus(approvalFee).toString()
          const gasPrice = bnOrZero(ethResult?.feeData?.chainSpecific.gasPrice).toString()
          const estimatedGas = bnOrZero(ethResult?.feeData?.chainSpecific.estimatedGas).toString()

          const fees: QuoteFeeData<'eip155:1'> = {
            fee,
            chainSpecific: {
              approvalFee,
              gasPrice,
              estimatedGas,
              totalFee,
            },
          }
          setValue('fees', fees)
        }
        break
      default:
        throw new Error('Unsupported chain ' + sellAsset.chain)
    }
  }

  const checkApprovalNeeded = async (wallet: HDWallet | NativeHDWallet): Promise<boolean> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: quote.buyAsset.assetId,
      sellAssetId: quote.sellAsset.assetId,
    })
    const { approvalNeeded } = await swapper.approvalNeeded({ quote, wallet })
    return approvalNeeded
  }

  const approveInfinite = async (wallet: HDWallet | NativeHDWallet): Promise<string> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: quote.buyAsset.assetId,
      sellAssetId: quote.sellAsset.assetId,
    })
    const txid = await swapper.approveInfinite({ quote, wallet })
    return txid
  }

  const reset = () => {
    setValue('buyAsset.amount', '')
    setValue('sellAsset.amount', '')
    setValue('fiatSellAmount', '')
  }

  return {
    swapperManager,
    updateQuote,
    updateTrade,
    executeQuote,
    getSupportedBuyAssetsFromSellAsset,
    getSupportedSellableAssets,
    getDefaultPair,
    checkApprovalNeeded,
    approveInfinite,
    getSendMaxAmount,
    reset,
    feeAsset,
  }
}
