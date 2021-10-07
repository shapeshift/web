import { SwapperManager, ZrxSwapper } from '@shapeshiftoss/swapper'
import { GetQuoteInput, Quote, SwapperType } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
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

  const getDefaultPair = () => {
    const swapper = swapperManager?.getSwapper(bestSwapper)
    return swapper?.getDefaultPair()
  }

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
        console.log('marketRate', marketRate.toString())
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

  const getBuyAssetQuote = async () => {
    console.log('getBuyAssetQuote')
    if (!buyAsset.currency) return
    getQuote(
      { buyAmount: toBaseUnit(buyAsset?.amount || '0', buyAsset.currency.precision) },
      quote => {
        const sellAmount = fromBaseUnit(quote.sellAmount || '0', sellAsset.currency.precision)
        if (sellAmount) {
          const fiatAmount = bn(sellAmount)
            .times(quote?.rate || 0)
            .toFixed(2)
          setValue('sellAsset.amount', sellAmount)
          fiatAmount && setValue('fiatAmount', fiatAmount)
        }
      }
    )
  }

  const getSellAssetQuote = async () => {
    console.log('getSellAssetQuote')
    if (!sellAsset.currency) return
    getQuote(
      { sellAmount: toBaseUnit(sellAsset?.amount || '0', sellAsset.currency.precision) },
      quote => {
        const buyAmount = fromBaseUnit(quote.buyAmount || '0', buyAsset.currency.precision)
        const sellAmount = fromBaseUnit(quote.sellAmount || '0', sellAsset.currency.precision)
        if (buyAmount) {
          const fiatAmount = bn(sellAmount)
            .times(quote?.rate || 0)
            .toFixed(2)
          setValue('buyAsset.amount', buyAmount)
          fiatAmount && setValue('fiatAmount', fiatAmount)
        }
      }
    )
  }

  const getFiatQuote = async (fiatAmount: string) => {
    console.log('getFiatQuote', fiatAmount)
    const rate = previousQuote?.rate
    if (!fiatAmount || !rate) return
    const sellAmount = toBaseUnit(bn(fiatAmount).div(rate).toString(), sellAsset.currency.precision)
    getQuote({ sellAmount }, quote => {
      if (quote?.buyAmount && quote?.sellAmount) {
        setValue('buyAsset.amount', fromBaseUnit(quote.buyAmount, buyAsset.currency.precision))
        setValue('sellAsset.amount', fromBaseUnit(quote.sellAmount, sellAsset.currency.precision))
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
    getBestSwapper,
    getDefaultPair
  }
}
