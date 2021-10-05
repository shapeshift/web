import { SwapperManager, ZrxSwapper } from '@shapeshiftoss/swapper'
import { GetQuoteInput, SwapperType } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { web3Instance } from 'lib/web3-instance'

export const useSwapper = () => {
  const [swapperManager, setSwapperManager] = useState<SwapperManager<SwapperType>>()
  const adapterManager = useChainAdapters()

  useEffect(() => {
    const manager = new SwapperManager()
    manager.addSwapper(SwapperType.Zrx, new ZrxSwapper({ web3: web3Instance, adapterManager }))
    setSwapperManager(manager)
  }, [adapterManager])

  const getBestQuote = useCallback(
    (swapperType: SwapperType, quoteParams: GetQuoteInput) => {
      return swapperManager?.getBestQuote(swapperType, quoteParams)
    },
    [swapperManager]
  )

  return {
    swapperManager,
    getBestQuote
  }
}
