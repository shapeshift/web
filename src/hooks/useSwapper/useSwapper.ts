import { SwapperManager, ZrxSwapper } from '@shapeshiftoss/swapper'
import { GetQuoteInput, Quote, SwapperType } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { web3Instance } from 'lib/web3-instance'
import { TradeState } from 'components/Trade/Trade'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { debounce } from 'lodash'
import { bn } from 'lib/bignumber/bignumber'

const debounceTime = 1000

export const useSwapper = ({
  sellAsset,
  buyAsset,
  fiatAmount,
  quote: previousQuote,
  setValue
}: TradeState & { setValue: any }) => {
  const [swapperManager, setSwapperManager] = useState<SwapperManager>()
  const [bestSwapper, setBestSwapper] = useState(SwapperType.Zrx)
  const adapterManager = useChainAdapters()
  const [debounceObj, setDebounceObj] = useState<any>()

  useEffect(() => {
    const manager = new SwapperManager()
    manager.addSwapper(SwapperType.Zrx, new ZrxSwapper({ web3: web3Instance, adapterManager }))
    setSwapperManager(manager)
  }, [adapterManager])

  const getQuote = async (
    amount: Pick<GetQuoteInput, 'buyAmount' | 'sellAmount'>,
    onFinish: (quote: Quote) => void
  ) => {
    if (debounceObj?.cancel) debounceObj.cancel()
    const quoteDebounce = debounce(async () => {
      try {
        if (!swapperManager) throw new Error('getQuote - Swapper needs to be initialized')
        if (!sellAsset.currency || !buyAsset.currency)
          throw new Error('getQuote - needs buyAsset and sellAsset to get quote')
        const swapper = swapperManager.getSwapper(bestSwapper)
        const quoteInput = {
          sellAsset: sellAsset.currency,
          buyAsset: buyAsset.currency,
          ...amount
        }
        let minMax = {}
        if (
          previousQuote?.sellAsset?.symbol !== sellAsset.currency.symbol &&
          previousQuote?.buyAsset?.symbol !== buyAsset.currency.symbol
        ) {
          minMax = await swapper.getMinMax(quoteInput)
        }
        const quote = await swapper.getQuote({ ...quoteInput, ...minMax })
        if (!quote?.success) throw new Error('getQuote - quote not successful')
        const sellAssetUsdRate = await swapper.getUsdRate({
          symbol: sellAsset.currency.symbol,
          tokenId: sellAsset.currency.tokenId
        })
        let buyAssetUsdRate
        if (quote?.rate) {
          buyAssetUsdRate = bn(sellAssetUsdRate).dividedBy(quote?.rate).toString()
        } else {
          buyAssetUsdRate = await swapper.getUsdRate({
            symbol: buyAsset.currency.symbol,
            tokenId: buyAsset.currency.tokenId
          })
        }
        const sellAssetFiatRate = bn(sellAssetUsdRate).times(1) // TODO: Implement fiatPerUsd here
        const buyAssetFiatRate = bn(buyAssetUsdRate).times(1) // TODO: Implement fiatPerUsd here
        const marketRate = bn(sellAssetFiatRate).dividedBy(buyAssetFiatRate)
        const rates = {
          sellAssetFiatRate,
          buyAssetFiatRate,
          marketRate
        }
        setValue('quote', quote)
        setValue('rates', rates)
        onFinish(quote)
      } catch (e) {
        console.error('e', e)
      }
    }, debounceTime)
    quoteDebounce()
    setDebounceObj({ ...quoteDebounce })
  }

  // const getQuoteDebounce = async (amount: any, onFinish: (quote: Quote) => void) => {
  //   if (debounceObj?.cancel) debounceObj.cancel()
  //   const quoteDebounce = debounce(async () => {
  //     const quote = await getBestQuote({
  //       ...amount
  //     })
  //     quote && onFinish(quote)
  //   }, debounceTime)
  //   quoteDebounce()
  //   setDebounceObj({ ...quoteDebounce })
  // }

  const getBuyAssetQuote = async () => {
    console.log('getBuyAssetQuote')
    if (!buyAsset.currency || !buyAsset.amount) return
    getQuote({ buyAmount: toBaseUnit(buyAsset.amount, buyAsset.currency.precision) }, quote => {
      if (quote?.sellAmount && quote.rate) {
        setValue('sellAsset.amount', fromBaseUnit(quote.sellAmount, sellAsset.currency.precision))
      }
    })
  }

  const getSellAssetQuote = async () => {
    console.log('getSellAssetQuote')
    if (!sellAsset.currency || !sellAsset.amount) return
    getQuote({ sellAmount: toBaseUnit(sellAsset.amount, sellAsset.currency.precision) }, quote => {
      if (quote?.buyAmount) {
        setValue('buyAsset.amount', fromBaseUnit(quote.buyAmount, buyAsset.currency.precision))
      }
    })
  }

  const getFiatQuote = async () => {
    console.log('getFiatQuote')
    if (!fiatAmount) return
    getQuote({ sellAmount: toBaseUnit(fiatAmount, sellAsset.currency.precision) }, quote => {
      if (quote?.buyAmount) {
        setValue('buyAsset.amount', fromBaseUnit(quote.buyAmount, buyAsset.currency.precision))
      }
    })
  }

  const getBestSwapper = async () => {
    if (!sellAsset.currency || !buyAsset.currency || !swapperManager) return
    const input = {
      sellAsset: sellAsset.currency,
      buyAsset: buyAsset.currency
    }
    const bestSwapper = await swapperManager.getBestSwapper(input)

    setBestSwapper(bestSwapper)
  }

  return {
    swapperManager,
    getBuyAssetQuote,
    getSellAssetQuote,
    getFiatQuote,
    getBestSwapper
  }
}
