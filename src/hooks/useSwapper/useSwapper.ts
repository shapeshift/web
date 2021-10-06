import { SwapperManager, ZrxSwapper } from '@shapeshiftoss/swapper'
import { GetQuoteInput, Quote, SwapperType } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { web3Instance } from 'lib/web3-instance'
import { TradeState } from 'components/Trade/Trade'
import { bnOrZero } from 'lib/bignumber/bignumber'

export const useSwapper = ({ sellAsset, buyAsset, fiatAmount, setQuote }: any) => {
  const [swapperManager, setSwapperManager] = useState<SwapperManager>()
  const adapterManager = useChainAdapters()

  console.log('sellAsset', sellAsset)
  console.log('buyAsset', buyAsset)
  console.log('fiatAmount', fiatAmount)

  useEffect(() => {
    const manager = new SwapperManager()
    manager.addSwapper(SwapperType.Zrx, new ZrxSwapper({ web3: web3Instance, adapterManager }))
    setSwapperManager(manager)
  }, [adapterManager])

  const getBuyAssetQuote = () => {
    if (!buyAsset.currency) return
    return getBestQuote({
      buyAmount: bnOrZero(buyAsset.amount)
        .times(bnOrZero(10).exponentiatedBy(buyAsset.currency.precision))
        .toFixed(0)
    })
  }

  const getSellAssetQuote = () => {
    if (!sellAsset.currency) return
    return getBestQuote({
      sellAmount: bnOrZero(sellAsset.amount)
        .times(bnOrZero(10).exponentiatedBy(sellAsset.currency.precision))
        .toFixed(0)
    })
  }

  const getBestQuote = useCallback(
    async (amount: Pick<GetQuoteInput, 'buyAmount' | 'sellAmount'>) => {
      if (!sellAsset.currency && !buyAsset.currency) return
      const quote = await swapperManager?.getBestQuote({
        sellAsset: sellAsset.currency,
        buyAsset: buyAsset.currency,
        ...amount
      })
      setQuote(quote)
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
