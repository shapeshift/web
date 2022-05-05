import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { SwapperManager, Trade, TradeQuote, ZrxSwapper } from '@shapeshiftoss/swapper'
import {
  Asset,
  chainAdapters,
  ChainTypes,
  ExecQuoteOutput,
  Quote,
  SwapperType,
} from '@shapeshiftoss/types'
import debounce from 'lodash/debounce'
import { useCallback, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { BuildQuoteTxOutput, TradeAsset } from 'components/Trade/Trade'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useIsComponentMounted } from 'hooks/useIsComponentMounted/useIsComponentMounted'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getWeb3Instance } from 'lib/web3-instance'
import { selectAssetIds, selectPortfolioCryptoBalanceByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const debounceTime = 1000

export enum TradeAmountInputField {
  BUY = 'BUY',
  SELL = 'SELL',
  FIAT = 'FIAT',
}

type GetQuoteInput = {
  amount: string
  action?: TradeAmountInputField
}

interface GetQuoteFromSwapper<C extends ChainTypes> extends GetQuoteInput {
  sellAsset: Asset
  buyAsset: Asset
  buyAssetUsdRate: BigNumber
  sellAssetUsdRate: BigNumber
  onFinish: (quote: TradeQuote<C>) => void
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
  const { setValue, clearErrors, getValues } = useFormContext()
  const translate = useTranslate()
  const isComponentMounted = useIsComponentMounted()
  const [quote, sellAsset] = useWatch({
    name: ['quote', 'sellAsset'],
  }) as [TradeQuote<ChainTypes> & Trade<ChainTypes>, TradeAsset]
  const adapterManager = useChainAdapters()
  const [swapperManager] = useState<SwapperManager>(() => {
    const manager = new SwapperManager()
    const web3 = getWeb3Instance()
    manager.addSwapper(SwapperType.Zrx, new ZrxSwapper({ web3, adapterManager }))
    return manager
  })

  const [debounceObj, setDebounceObj] = useState<{ cancel: () => void }>()

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
        sellAssetId: sellAsset?.currency?.assetId,
      })
      return filterAssetsByIds(assets, supportedBuyAssetIds)
    },
    [swapperManager, sellAsset],
  )

  const getDefaultPair = useCallback(() => {
    // eth & fox
    return ['eip155:1/slip44:60', 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d']
  }, [])

  const sellAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByAssetId(state, { assetId: sellAsset?.currency?.assetId }),
  )

  const getSendMaxAmount = async ({
    sellAsset,
    buyAsset,
    feeAsset,
  }: {
    wallet: HDWallet
    sellAsset: TradeAsset
    buyAsset: TradeAsset
    feeAsset: Asset
  }) => {
    const swapper = swapperManager.getSwapper(SwapperType.Zrx)
    const maximumQuote = await swapper.getTradeQuote({
      sellAsset: sellAsset.currency,
      buyAsset: buyAsset.currency,
      sellAmount: sellAssetBalance,
      sendMax: true,
      sellAssetAccountId: '0',
    })

    // Only subtract fee if sell asset is the see asset
    const isFeeAsset = feeAsset.assetId === sellAsset.currency.assetId
    // Pad fee because estimations can be wrong
    const feePadded = bnOrZero(maximumQuote?.feeData?.fee)
    // sell asset balance minus expected fee = maxTradeAmount
    // only subtract if sell asset is fee asset
    const maxAmount = fromBaseUnit(
      bnOrZero(sellAssetBalance)
        .minus(isFeeAsset ? feePadded : 0)
        .toString(),
      sellAsset.currency.precision,
    )

    setValue('sellAsset.amount', maxAmount)
    setValue('action', TradeAmountInputField.SELL)
    return maxAmount
  }

  const buildQuoteTx = async ({
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
    const sellAmount = toBaseUnit(amount, sellAsset.precision)
    const minSellAmount = toBaseUnit(minimum, sellAsset.precision)

    if (bnOrZero(sellAmount).lt(minSellAmount)) {
      return {
        success: false,
        sellAsset,
        statusReason: translate(TRADE_ERRORS.AMOUNT_TO_SMALL, { minLimit: minimum }),
      }
    }

    const result = await swapper?.buildTrade({
      sellAmount,
      sellAsset,
      buyAsset,
      sellAssetAccountId: '0', // TODO: remove hard coded accountId when multiple accounts are implemented
      buyAssetAccountId: '0', // TODO: remove hard coded accountId when multiple accounts are implemented
      wallet,
      sendMax: true,
    })

    if (result?.success) {
      setFees(result, sellAsset)
      setValue('quote', result)
      return result
    } else {
      // TODO: (ryankk) Post bounty, these need to be revisited so the error messages can be more accurate.
      switch (result.statusReason) {
        case 'Gas estimation failed':
          return {
            success: false,
            sellAsset,
            buyAsset,
            statusReason: translate(TRADE_ERRORS.INSUFFICIENT_FUNDS),
          }
        case 'Insufficient funds for transaction':
          return {
            success: false,
            sellAsset,
            buyAsset,
            statusReason: translate(TRADE_ERRORS.INSUFFICIENT_FUNDS_FOR_AMOUNT, {
              symbol: sellAsset.symbol,
            }),
          }
        default:
          return {
            success: false,
            sellAsset,
            buyAsset,
            statusReason: translate(TRADE_ERRORS.QUOTE_FAILED),
          }
      }
    }
  }

  const executeQuote = async ({
    wallet,
  }: {
    wallet: HDWallet
  }): Promise<ExecQuoteOutput | undefined> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: quote.buyAsset.assetId,
      sellAssetId: quote.sellAsset.assetId,
    })

    const result = await swapper.executeTrade({ trade: quote, wallet })
    return result
  }

  const getQuoteFromSwapper = async <C extends ChainTypes>({
    amount: sellAmount,
    sellAsset,
    buyAsset,
    sellAssetUsdRate,
    buyAssetUsdRate,
    action,
    onFinish,
  }: GetQuoteFromSwapper<C>) => {
    if (debounceObj?.cancel) debounceObj.cancel()
    clearErrors()
    const quoteDebounce = debounce(async () => {
      if (isComponentMounted.current) {
        try {
          const swapper = await swapperManager.getBestSwapper({
            buyAssetId: buyAsset.assetId,
            sellAssetId: sellAsset.assetId,
          })

          const quoteInput = {
            sellAsset,
            buyAsset,
            sellAmount,
          }

          const { trade } = getValues()
          let minMax = trade

          if (
            !quote ||
            (quote?.sellAsset?.symbol !== sellAsset.symbol &&
              quote?.buyAsset?.symbol !== buyAsset.symbol)
          ) {
            minMax = await swapper.getMinMax(quoteInput)
            const minMaxTrade = { ...minMax, ...trade }
            minMax && setValue('trade', minMaxTrade)
          }

          const newQuote = await swapper.getTradeQuote({
            ...quoteInput,
            ...minMax,
          })
          if (!(newQuote && newQuote.success)) throw newQuote

          setFees(newQuote, sellAsset)
          setValue('quote', newQuote)
          setValue('sellAsset.fiatRate', sellAssetUsdRate.toString())
          setValue('buyAsset.fiatRate', buyAssetUsdRate.toString())
          if (action) onFinish(newQuote)
        } catch (e) {
          console.error(e)
        }
      }
    }, debounceTime)
    quoteDebounce()
    setDebounceObj({ ...quoteDebounce })
  }

  const getQuote = async ({
    amount,
    sellAsset,
    buyAsset,
    feeAsset,
    action,
  }: GetQuoteInput & { sellAsset: TradeAsset; buyAsset: TradeAsset; feeAsset: Asset }) => {
    console.log('getQuote action', action)
    if (!buyAsset?.currency || !sellAsset?.currency) return

    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: buyAsset.currency.assetId,
      sellAssetId: sellAsset.currency.assetId,
    })

    const sellAssetUsdRate = bnOrZero(
      await swapper.getUsdRate({
        symbol: sellAsset.currency.symbol,
        tokenId: sellAsset.currency.tokenId,
      }),
    )
    const buyAssetUsdRate = bnOrZero(
      await swapper.getUsdRate({
        symbol: buyAsset.currency.symbol,
        tokenId: buyAsset.currency.tokenId,
      }),
    )

    let sellAssetAmount
    if (action === TradeAmountInputField.SELL) sellAssetAmount = amount
    if (action === TradeAmountInputField.BUY) {
      const assetPriceRatio = buyAssetUsdRate.dividedBy(sellAssetUsdRate)
      sellAssetAmount = assetPriceRatio.times(amount)
    }
    if (action === TradeAmountInputField.FIAT) {
      console.log('is fiat2!!,', amount, sellAssetUsdRate.toString())
      sellAssetAmount = bnOrZero(amount).dividedBy(sellAssetUsdRate)
    }

    const formattedAmount = toBaseUnit(sellAssetAmount, sellAsset.currency.precision)

    const feeAssetPrecision = feeAsset.precision

    const onFinish = (quote: TradeQuote<ChainTypes> & { action: TradeAmountInputField }) => {
      console.log('onFinish')
      if (isComponentMounted.current) {
        const { sellAsset, buyAsset, fiatAmount } = getValues()

        if (!(quote.buyAmount && quote.sellAmount)) return

        const buyAmount = fromBaseUnit(quote.buyAmount, buyAsset.currency.precision)
        const sellAmount = fromBaseUnit(quote.sellAmount, sellAsset.currency.precision)
        const newFiatAmount = bn(buyAmount).times(bnOrZero(buyAsset.fiatRate)).toFixed(2)
        const estimatedGasFee = fromBaseUnit(quote?.feeData?.fee || 0, feeAssetPrecision)

        console.log('buyAmount', buyAmount)
        console.log('sellAmount', sellAmount)
        console.log('fiatAmount', fiatAmount)
        console.log('newFiatAmount', newFiatAmount)

        setValue('buyAsset.amount', buyAmount)
        setValue('sellAsset.amount', sellAmount)
        setValue('fiatAmount', action === TradeAmountInputField.FIAT ? fiatAmount : newFiatAmount)
        setValue('action', undefined)
        setValue('estimatedGasFees', estimatedGasFee)
      }
    }

    await getQuoteFromSwapper<typeof sellAsset.currency.chain>({
      amount: formattedAmount,
      sellAsset: sellAsset.currency,
      buyAsset: buyAsset.currency,
      action,
      buyAssetUsdRate,
      sellAssetUsdRate,
      onFinish,
    })
  }

  const getFiatRate = async ({
    symbol,
    tokenId,
  }: {
    symbol: string
    tokenId?: string
  }): Promise<string> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: quote.buyAsset.assetId,
      sellAssetId: quote.sellAsset.assetId,
    })
    return swapper?.getUsdRate({
      symbol,
      tokenId,
    })
  }

  const setFees = async (result: Trade<ChainTypes> | TradeQuote<ChainTypes>, sellAsset: Asset) => {
    const feePrecision = sellAsset.chain === ChainTypes.Ethereum ? 18 : sellAsset.precision
    const feeBN = bnOrZero(result?.feeData?.fee).dividedBy(bn(10).exponentiatedBy(feePrecision))
    const fee = feeBN.toString()

    switch (sellAsset.chain) {
      case ChainTypes.Ethereum:
        {
          const ethResult = result as Quote<ChainTypes.Ethereum>
          const approvalFee = ethResult?.feeData?.chainSpecific?.approvalFee
            ? bn(ethResult.feeData.chainSpecific.approvalFee)
                .dividedBy(bn(10).exponentiatedBy(18))
                .toString()
            : '0'
          const totalFee = feeBN.plus(approvalFee).toString()
          const gasPrice = bnOrZero(ethResult?.feeData?.chainSpecific.gasPrice).toString()
          const estimatedGas = bnOrZero(ethResult?.feeData?.chainSpecific.estimatedGas).toString()

          const fees: chainAdapters.QuoteFeeData<ChainTypes.Ethereum> = {
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
    setValue('fiatAmount', '')
    setValue('action', undefined)
  }

  return {
    swapperManager,
    getQuote,
    buildQuoteTx,
    executeQuote,
    getSupportedBuyAssetsFromSellAsset,
    getSupportedSellableAssets,
    getDefaultPair,
    checkApprovalNeeded,
    approveInfinite,
    getFiatRate,
    getSendMaxAmount,
    reset,
  }
}
