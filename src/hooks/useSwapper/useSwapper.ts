import { SwapperManager, ZrxSwapper } from '@shapeshiftoss/swapper'
import { Asset, GetQuoteInput, Quote, SwapperType } from '@shapeshiftoss/types'
import { debounce } from 'lodash'
import { useState } from 'react'
import { useFormContext, UseFormSetValue, useWatch } from 'react-hook-form'
import { MinMax, TradeAsset, TradeState } from 'components/Trade/Trade'
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

type GetQuote = {
  amount: Pick<GetQuoteInput, 'buyAmount' | 'sellAmount'>
  sellAsset: Asset
  buyAsset: Asset
  onFinish: (quote: Quote) => void
  action?: TradeActions
}

export const useSwapper = () => {
  const { setValue } = useFormContext()
  const [quote, trade] = useWatch({ name: ['quote', 'trade'] })
  const adapterManager = useChainAdapters()
  const [swapperManager] = useState<SwapperManager>(() => {
    const manager = new SwapperManager()
    manager.addSwapper(SwapperType.Zrx, new ZrxSwapper({ web3: web3Instance, adapterManager }))
    return manager
  })
  const [bestSwapperType, setBestSwapperType] = useState(SwapperType.Zrx)
  const [debounceObj, setDebounceObj] = useState<{ cancel: () => void }>()

  const getDefaultPair = () => {
    const swapper = swapperManager.getSwapper(bestSwapperType)
    return swapper.getDefaultPair()
  }

  const getQuote = async ({ amount, sellAsset, buyAsset, onFinish, action }: GetQuote) => {
    if (debounceObj?.cancel) debounceObj.cancel()
    const quoteDebounce = debounce(async () => {
      try {
        if (!sellAsset || !buyAsset)
          throw new Error('getQuote - needs buyAsset and sellAsset to get quote')
        const swapper = swapperManager.getSwapper(bestSwapperType)
        const quoteInput = {
          sellAsset: sellAsset,
          buyAsset: buyAsset,
          ...amount
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

        setValue('quote', newQuote)
        setValue('sellAsset.fiatRate', sellAssetFiatRate)
        setValue('buyAsset.fiatRate', buyAssetFiatRate)

        if (action) onFinish(newQuote)
        else {
          setValue('sellAsset.amount', '')
          setValue('buyAsset.amount', '')
          setValue('fiatAmount', '')
        }
      } catch (e) {
        console.error('error', e)
      } finally {
        setValue('action', undefined)
      }
    }, debounceTime)
    quoteDebounce()
    setDebounceObj({ ...quoteDebounce })
  }

  const getCryptoQuote = async (
    amount: Pick<GetQuoteInput, 'buyAmount' | 'sellAmount'>,
    sellAsset: TradeAsset,
    buyAsset: TradeAsset,
    action?: TradeActions
  ) => {
    if (!buyAsset?.currency || !sellAsset?.currency) return
    const key = Object.keys(amount)[0]
    const value = Object.values(amount)[0]
    const isSellQuote = key === 'sellAmount'
    const precision = isSellQuote ? sellAsset.currency.precision : buyAsset.currency.precision
    getQuote({
      action,
      amount: { [key]: toBaseUnit(value || '0', precision) },
      sellAsset: sellAsset.currency,
      buyAsset: buyAsset.currency,
      onFinish: quote => {
        const buyAmount = fromBaseUnit(quote.buyAmount || '0', buyAsset.currency.precision)
        const sellAmount = fromBaseUnit(quote.sellAmount || '0', sellAsset.currency.precision)
        const fiatAmount = bn(buyAmount)
          .times(buyAsset.fiatRate || 0)
          .toFixed(2)
        isSellQuote
          ? setValue('buyAsset.amount', buyAmount)
          : setValue('sellAsset.amount', sellAmount)

        fiatAmount && setValue('fiatAmount', fiatAmount)
      }
    })
  }

  const getFiatQuote = async (
    fiatAmount: string,
    sellAsset: TradeAsset,
    buyAsset: TradeAsset,
    action?: TradeActions
  ) => {
    const rate = previousQuote?.rate
    if (!rate) return
    const sellAmount = toBaseUnit(bn(fiatAmount).div(rate).toString(), sellAsset.currency.precision)
    getQuote({
      action,
      amount: { sellAmount },
      sellAsset: sellAsset.currency,
      buyAsset: buyAsset.currency,
      onFinish: quote => {
        setValue(
          'buyAsset.amount',
          fromBaseUnit(quote.buyAmount || '0', buyAsset.currency.precision)
        )
        setValue(
          'sellAsset.amount',
          fromBaseUnit(quote.sellAmount || '0', sellAsset.currency.precision)
        )
      }
    })
  }

  const getBestSwapper = async ({
    sellAsset,
    buyAsset
  }: Pick<TradeState, 'sellAsset' | 'buyAsset'>) => {
    if (!sellAsset.currency || !buyAsset.currency || !swapperManager) return
    const input = {
      sellAsset: sellAsset.currency,
      buyAsset: buyAsset.currency
    }
    const bestSwapper = await swapperManager.getBestSwapper(input)
    setBestSwapperType(bestSwapper)
  }

  const reset = () => {
    setValue('buyAsset.amount', '')
    setValue('sellAsset.amount', '')
    setValue('fiatAmount', '')
  }

  return {
    swapperManager,
    getCryptoQuote,
    getFiatQuote,
    getBestSwapper,
    getDefaultPair,
    reset
  }
}
