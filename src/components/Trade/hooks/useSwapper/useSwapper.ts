import { SwapperManager, ZrxSwapper } from '@shapeshiftoss/swapper'
import { Asset, ChainTypes, GetQuoteInput, Quote, SwapperType } from '@shapeshiftoss/types'
import debounce from 'lodash/debounce'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { TradeAsset, TradeState } from 'components/Trade/Trade'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { web3Instance } from 'lib/web3-instance'

const debounceTime = 1000

export enum TradeActions {
  BUY = 'BUY',
  SELL = 'SELL',
  FIAT = 'FIAT'
}

type GetQuoteAmount = Pick<GetQuoteInput, 'buyAmount' | 'sellAmount'> & { fiatAmount?: string }

type GetQuote = {
  amount: GetQuoteAmount
  sellAsset: Asset
  buyAsset: Asset
  onFinish: (quote: Quote) => void
  isFiat?: boolean
}

export enum TRADE_ERRORS {
  NOT_ENOUGH_ETH = 'trade.errors.notEnoughEth',
  AMOUNT_TO_SMALL = 'trade.errors.amountToSmall',
  NEGATIVE_MAX = 'trade.errors.negativeMax',
  INVALID_MAX = 'trade.errors.invalidMax',
  INSUFFICIENT_FUNDS = 'trade.errors.insufficientFunds',
  INSUFFICIENT_FUNDS_FOR_LIMIT = 'trade.errors.insufficientFundsForLimit',
  INSUFFICIENT_FUNDS_FOR_AMOUNT = 'trade.errors.insufficientFundsForAmount',
  NO_LIQUIDITY = 'trade.errors.noLiquidityError',
  BALANCE_TO_LOW = 'trade.errors.balanceToLow',
  DEX_TRADE_FAILED = 'trade.errors.dexTradeFailed',
  QUOTE_FAILED = 'trade.errors.quoteFailed',
  OVER_SLIP_SCORE = 'trade.errors.overSlipScore'
}

export const useSwapper = () => {
  const { setValue, setError, clearErrors } = useFormContext()
  const [quote, trade, action] = useWatch({ name: ['quote', 'trade', 'action'] })
  const actionRef = useRef(action)
  const adapterManager = useChainAdapters()
  const [swapperManager] = useState<SwapperManager>(() => {
    const manager = new SwapperManager()
    manager.addSwapper(SwapperType.Zrx, new ZrxSwapper({ web3: web3Instance, adapterManager }))
    return manager
  })
  const [bestSwapperType, setBestSwapperType] = useState(SwapperType.Zrx)
  const [debounceObj, setDebounceObj] = useState<{ cancel: () => void }>()

  useEffect(() => {
    actionRef.current = action
  }, [action])

  const getDefaultPair = useCallback(() => {
    const swapper = swapperManager.getSwapper(bestSwapperType)
    return swapper.getDefaultPair()
  }, [swapperManager, bestSwapperType])

  const getQuoteFromSwapper = async ({ amount, sellAsset, buyAsset, onFinish }: GetQuote) => {
    if (debounceObj?.cancel) debounceObj.cancel()
    clearErrors()
    const quoteDebounce = debounce(async () => {
      try {
        const swapper = swapperManager.getSwapper(bestSwapperType)
        let convertedAmount = amount
        const isFiat = Object.keys(amount)[0].includes('fiat')
        if (isFiat) {
          const rate = await swapper.getUsdRate({
            symbol: sellAsset.symbol,
            tokenId: sellAsset.tokenId
          })
          const fiatAmount = Object.values(amount)[0]
          convertedAmount = {
            sellAmount: toBaseUnit(
              bn(fiatAmount).div(rate).toString(),
              sellAsset.precision
            ).toString()
          }
        }
        const quoteInput = {
          sellAsset: sellAsset,
          buyAsset: buyAsset,
          ...convertedAmount
        }
        let minMax = trade
        if (
          quote?.sellAsset?.symbol !== sellAsset.symbol &&
          quote?.buyAsset?.symbol !== buyAsset.symbol
        ) {
          minMax = await swapper.getMinMax(quoteInput)
          minMax && setValue('trade', minMax)
        }

        const newQuote = await swapper.getQuote({ ...quoteInput, ...minMax })
        if (!newQuote?.success) throw new Error('getQuote - quote not successful')

        const sellAssetUsdRate = await swapper.getUsdRate({
          symbol: sellAsset.symbol,
          tokenId: sellAsset.tokenId
        })
        let buyAssetUsdRate
        if (newQuote?.rate) {
          buyAssetUsdRate = bn(sellAssetUsdRate).dividedBy(newQuote?.rate).toString()
        } else {
          buyAssetUsdRate = await swapper.getUsdRate({
            symbol: buyAsset.symbol,
            tokenId: buyAsset.tokenId
          })
        }
        const sellAssetFiatRate = bn(sellAssetUsdRate).times(1).toString() // TODO: Implement fiatPerUsd here
        const buyAssetFiatRate = bn(buyAssetUsdRate).times(1).toString() // TODO: Implement fiatPerUsd here

        setFees(newQuote, sellAsset)
        setValue('quote', newQuote)
        setValue('sellAsset.fiatRate', sellAssetFiatRate)
        setValue('buyAsset.fiatRate', buyAssetFiatRate)
        if (actionRef.current) onFinish(newQuote)
      } catch (err: any) {
        const message = err?.response?.data?.validationErrors?.[0]?.reason
        if (message) setError('getQuote', { message: TRADE_ERRORS.NO_LIQUIDITY })
        else setError('getQuote', { message: TRADE_ERRORS.QUOTE_FAILED })
      }
    }, debounceTime)
    quoteDebounce()
    setDebounceObj({ ...quoteDebounce })
  }

  const getQuote = async (
    newAmount: GetQuoteAmount,
    sellAsset: TradeAsset,
    buyAsset: TradeAsset
  ) => {
    if (!buyAsset?.currency || !sellAsset?.currency) return
    const key = Object.keys(newAmount)[0]
    const value = Object.values(newAmount)[0]
    const isSellAmount = key === 'sellAmount' && value !== '0'
    const isBuyAmount = key === 'buyAmount'
    const isFiatAmount = key === 'fiatAmount'

    let amount = newAmount
    const precision = isSellAmount
      ? sellAsset.currency.precision
      : isBuyAmount && buyAsset.currency.precision
    if (precision) {
      amount = { [key]: toBaseUnit(value || '0', precision) }
    }

    await getQuoteFromSwapper({
      amount,
      sellAsset: sellAsset.currency,
      buyAsset: buyAsset.currency,
      onFinish: quote => {
        const buyAmount = fromBaseUnit(quote.buyAmount || '0', buyAsset.currency.precision)
        const sellAmount = fromBaseUnit(quote.sellAmount || '0', sellAsset.currency.precision)
        const fiatAmount = bn(buyAmount)
          .times(buyAsset.fiatRate || 0)
          .toFixed(2)
        if (actionRef.current === TradeActions.SELL && isSellAmount) {
          setValue('buyAsset.amount', buyAmount)
          setValue('fiatAmount', fiatAmount)
          setValue('action', undefined)
        } else if (actionRef.current === TradeActions.BUY && isBuyAmount) {
          setValue('sellAsset.amount', sellAmount)
          setValue('fiatAmount', fiatAmount)
          setValue('action', undefined)
        } else if (actionRef.current === TradeActions.FIAT && isFiatAmount) {
          setValue(
            'buyAsset.amount',
            fromBaseUnit(quote.buyAmount || '0', buyAsset.currency.precision)
          )
          setValue(
            'sellAsset.amount',
            fromBaseUnit(quote.sellAmount || '0', sellAsset.currency.precision)
          )
          setValue('action', undefined)
        }
      }
    })
  }

  const setFees = async (result: Quote | undefined, sellAsset: Asset): Promise<any> => {
    let fees = {} as any
    const sellFeePrecision = sellAsset.chain === ChainTypes.Ethereum ? 18 : sellAsset.precision
    const sellAssetMinerFee = bn(result?.feeData?.fee || 0).dividedBy(
      bn(10).exponentiatedBy(sellFeePrecision)
    )
    const buyAssetMinerFee = bn(result?.feeData?.receiveNetworkFee || 0)
    const approvalFee = result?.feeData?.approvalFee
      ? bn(result.feeData.approvalFee).dividedBy(bn(10).exponentiatedBy(18))
      : bn(0)
    fees = {
      // TODO: use new fee structure
      buyAssetMinerFee,
      fee: sellAssetMinerFee,
      approvalFee,
      totalFee: sellAssetMinerFee.plus(approvalFee),
      gasPrice: bn(result?.feeData?.gasPrice || 0),
      estimatedGas: bn(result?.feeData?.estimatedGas || 0)
    }
    setValue('fees', fees)
  }

  const getBestSwapper = useCallback(
    async ({ sellAsset, buyAsset }: Pick<TradeState, 'sellAsset' | 'buyAsset'>) => {
      if (!sellAsset.currency || !buyAsset.currency) return
      const input = {
        sellAsset: sellAsset.currency,
        buyAsset: buyAsset.currency
      }
      const bestSwapper = await swapperManager.getBestSwapper(input)
      setBestSwapperType(bestSwapper)
    },
    [swapperManager, setBestSwapperType]
  )

  const reset = () => {
    setValue('buyAsset.amount', '')
    setValue('sellAsset.amount', '')
    setValue('fiatAmount', '')
    setValue('action', undefined)
  }

  return {
    swapperManager,
    getQuote,
    getBestSwapper,
    getDefaultPair,
    reset
  }
}
