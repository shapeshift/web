import type { ChainId } from '@shapeshiftoss/caip'
import { useSuspenseQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { thorchainBlockTimeMs } from '../constants'
import { isChainHalted } from '../utils/isChainHalted'

import { reactQueries } from '@/react-queries'

// Mimics the isChainHalted util from THORNode:
// https://gitlab.com/thorchain/thornode/-/blob/c979858d83106d8959c1140365231a1a6492b837/x/thorchain/keeper/v1/keeper_halt.go#L76-102
// Failure to check this will before broadcasting a Tx will result in Txs such as:
// https://runescan.io/tx/1388238091CD058D3859E5105909576ED6640A76FE4956F882343329431C8EAC
export const useIsChainHalted = (chainId: ChainId | undefined) => {
  const {
    data: { mimir: mimirData, blockheight: blockheightData },
    isFetching,
    isSuccess,
  } = useSuspenseQueries({
    queries: [
      {
        ...reactQueries.thornode.mimir(),
        staleTime: thorchainBlockTimeMs,
      },
      {
        ...reactQueries.thornode.block(),
        staleTime: thorchainBlockTimeMs,
      },
    ],
    combine: results => {
      const [mimir, blockheight] = results
      return {
        data: { mimir: mimir.data, blockheight: blockheight.data },
        isFetching: results.some(result => result.isFetching),
        isSuccess: results.every(result => result.isSuccess),
      }
    },
  })

  const isChainHaltedResult = useMemo(() => {
    if (!chainId) return undefined
    if (isFetching) return undefined
    if (!isSuccess) return undefined

    const blockHeight = blockheightData.header.height
    const mimir = mimirData

    return isChainHalted({ mimir, blockHeight, chainId })
  }, [isFetching, isSuccess, mimirData, blockheightData, chainId])

  return { isChainHalted: isChainHaltedResult, isFetching, isSuccess }
}
