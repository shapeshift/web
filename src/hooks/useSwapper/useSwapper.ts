import { SwapperManager, ZrxSwapper } from '@shapeshiftoss/swapper'
import { Asset, GetQuoteInput, Quote, SwapperType } from '@shapeshiftoss/types'
import { debounce } from 'lodash'
import { useState } from 'react'
import { TradeAsset, TradeState } from 'components/Trade/Trade'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { web3Instance } from 'lib/web3-instance'

const debounceTime = 1000

export enum FetchActions {
  BUY = 'BUY',
  SELL = 'SELL',
  FIAT = 'FIAT'
}

type UseSwapper = {
  quote?: Quote
  setValue: any
}

export const useSwapper = ({ quote: previousQuote, setValue }: UseSwapper) => {
  const adapterManager = useChainAdapters()
  const [swapperManager] = useState<SwapperManager>(() => {
    const manager = new SwapperManager()
    manager.addSwapper(SwapperType.Zrx, new ZrxSwapper({ web3: web3Instance, adapterManager }))
    return manager
  })
  const [bestSwapperType, setBestSwapperType] = useState(SwapperType.Zrx)
  const [debounceObj, setDebounceObj] = useState<any>()

  const getDefaultPair = () => {
    const swapper = swapperManager.getSwapper(bestSwapperType)
    return swapper.getDefaultPair()
  }

  const getQuote = async (
    amount: Pick<GetQuoteInput, 'buyAmount' | 'sellAmount'>,
    sellAsset: Asset,
    buyAsset: Asset,
    onFinish: (quote: Quote) => void
  ) => {
    if (debounceObj?.cancel) debounceObj.cancel()
    const quoteDebounce = debounce(async () => {
      try {
        if (!swapperManager) throw new Error('getQuote - Swapper needs to be initialized')
        if (!sellAsset || !buyAsset)
          throw new Error('getQuote - needs buyAsset and sellAsset to get quote')
        const swapper = swapperManager.getSwapper(bestSwapperType)
        const quoteInput = {
          sellAsset: sellAsset,
          buyAsset: buyAsset,
          ...amount
        }
        let minMax = {}
        if (
          previousQuote?.sellAsset?.symbol !== sellAsset.symbol &&
          previousQuote?.buyAsset?.symbol !== buyAsset.symbol
        ) {
          minMax = await swapper.getMinMax(quoteInput)
        }
        const quote = await swapper.getQuote({ ...quoteInput, ...minMax })
        if (!quote?.success) throw new Error('getQuote - quote not successful')
        const sellAssetUsdRate = await swapper.getUsdRate({
          symbol: sellAsset.symbol,
          tokenId: sellAsset.tokenId
        })
        let buyAssetUsdRate
        if (quote?.rate) {
          buyAssetUsdRate = bn(sellAssetUsdRate).dividedBy(quote?.rate).toString()
        } else {
          buyAssetUsdRate = await swapper.getUsdRate({
            symbol: buyAsset.symbol,
            tokenId: buyAsset.tokenId
          })
        }
        const sellAssetFiatRate = bn(sellAssetUsdRate).times(1) // TODO: Implement fiatPerUsd here
        const buyAssetFiatRate = bn(buyAssetUsdRate).times(1) // TODO: Implement fiatPerUsd here

        setValue('quote', quote)
        setValue('sellAsset.fiatRate', sellAssetFiatRate)
        setValue('buyAsset.fiatRate', buyAssetFiatRate)
        onFinish(quote)
      } catch (e) {
        console.log('error', e)
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
    buyAsset: TradeAsset
  ) => {
    if (!buyAsset?.currency || !sellAsset?.currency) return
    const key = Object.keys(amount)[0]
    const value = Object.values(amount)[0]
    const isSellQuote = key === 'sellAmount'
    const precision = isSellQuote ? sellAsset.currency.precision : buyAsset.currency.precision
    getQuote(
      { [key]: toBaseUnit(value || '0', precision) },
      sellAsset.currency,
      buyAsset.currency,
      quote => {
        const buyAmount = fromBaseUnit(quote.buyAmount || '0', buyAsset.currency.precision)
        const sellAmount = fromBaseUnit(quote.sellAmount || '0', sellAsset.currency.precision)
        const fiatAmount = bn(sellAmount)
          .times(sellAsset.fiatRate || 0)
          .toFixed(2)
        isSellQuote
          ? setValue('buyAsset.amount', buyAmount)
          : setValue('sellAsset.amount', sellAmount)

        fiatAmount && setValue('fiatAmount', fiatAmount)
      }
    )
  }

  const getFiatQuote = async (fiatAmount: string, sellAsset: TradeAsset, buyAsset: TradeAsset) => {
    const rate = previousQuote?.rate
    if (!fiatAmount || !rate) return
    const sellAmount = toBaseUnit(bn(fiatAmount).div(rate).toString(), sellAsset.currency.precision)
    getQuote({ sellAmount }, sellAsset.currency, buyAsset.currency, quote => {
      setValue('buyAsset.amount', fromBaseUnit(quote.buyAmount || '0', buyAsset.currency.precision))
      setValue(
        'sellAsset.amount',
        fromBaseUnit(quote.sellAmount || '0', sellAsset.currency.precision)
      )
    })
  }

  const getBestSwapper = async ({ sellAsset, buyAsset }: TradeState) => {
    if (!sellAsset.currency || !buyAsset.currency || !swapperManager) return
    const input = {
      sellAsset: sellAsset.currency,
      buyAsset: buyAsset.currency
    }
    const bestSwapper = await swapperManager.getBestSwapper(input)
    setBestSwapperType(bestSwapper)
  }

  return {
    swapperManager,
    getCryptoQuote,
    getFiatQuote,
    getBestSwapper,
    getDefaultPair,
    debounceObj
  }
}
