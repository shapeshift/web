import { SwapperManager, ZrxSwapper } from '@shapeshiftoss/swapper'
import { GetQuoteInput, Quote, SwapperType } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { web3Instance } from 'lib/web3-instance'
import { TradeState } from 'components/Trade/Trade'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { debounce } from 'lodash'
import { bn } from 'lib/bignumber/bignumber'

const debounceTime = 500

export const useSwapper = ({
  sellAsset,
  buyAsset,
  fiatAmount,
  setValue
}: TradeState & { setValue: any }) => {
  const [swapperManager, setSwapperManager] = useState<SwapperManager>()
  const adapterManager = useChainAdapters()
  const [debounceObj, setDebounceObj] = useState<any>({ buyAsset: {}, sellAsset: {} })

  // console.log('sellAsset', sellAsset)
  // console.log('buyAsset', buyAsset)
  // console.log('fiatAmount', fiatAmount)

  useEffect(() => {
    const manager = new SwapperManager()
    manager.addSwapper(SwapperType.Zrx, new ZrxSwapper({ web3: web3Instance, adapterManager }))
    setSwapperManager(manager)
  }, [adapterManager])

  const getBuyAssetQuote = async () => {
    console.log('getBuyAssetQuote')
    if (debounceObj.buyAsset.cancel) debounceObj.buyAsset.cancel()
    const buyAssetDebounce = debounce(async () => {
      if (!buyAsset.currency || !buyAsset.amount) return
      const quote = await getBestQuote({
        buyAmount: toBaseUnit(buyAsset.amount, buyAsset.currency.precision)
      })
      if (quote?.sellAmount && quote.rate) {
        setValue('sellAsset.amount', fromBaseUnit(quote.sellAmount, sellAsset.currency.precision))
        setValue('quote', { ...quote, rate: bn(1).div(quote.rate) })
      }
      setValue('quoteInput', undefined)
    }, debounceTime)
    buyAssetDebounce()
    setDebounceObj((state: any) => ({ ...state, buyAsset: buyAssetDebounce }))
  }

  const getSellAssetQuote = async () => {
    console.log('getSellAssetQuote')
    if (debounceObj.sellAsset.cancel) debounceObj.sellAsset.cancel()
    const sellAssetDebounce = debounce(async () => {
      if (!sellAsset.currency || !sellAsset.amount) return
      const quote = await getBestQuote({
        sellAmount: toBaseUnit(sellAsset.amount, sellAsset.currency.precision)
      })
      if (quote?.buyAmount) {
        setValue('buyAsset.amount', fromBaseUnit(quote.buyAmount, buyAsset.currency.precision))
        setValue('quote', quote)
      }
      setValue('quoteInput', undefined)
    }, debounceTime)
    sellAssetDebounce()
    setDebounceObj((state: any) => ({ ...state, sellAsset: sellAssetDebounce }))
  }

  const getBestQuote = useCallback(
    async (amount: Pick<GetQuoteInput, 'buyAmount' | 'sellAmount'>) => {
      console.log('getQuote')
      if (!sellAsset.currency || !buyAsset.currency) return
      const quoteInput = {
        sellAsset: sellAsset.currency,
        buyAsset: buyAsset.currency,
        ...amount
      }
      const quote = await swapperManager?.getBestQuote(quoteInput)
      if (!quote?.success) return
      setValue('quoteInput', quoteInput)
      return quote
    },
    [swapperManager]
  )

  return {
    swapperManager,
    getBuyAssetQuote,
    getSellAssetQuote
  }
}
