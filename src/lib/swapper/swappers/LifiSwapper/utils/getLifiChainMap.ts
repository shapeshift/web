import type { ChainId as LifiChainId, ChainKey } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads/build'
import { Err, Ok } from '@sniptt/monads/build'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight } from 'lib/swapper/api'

import { createLifiChainMap } from './createLifiChainMap/createLifiChainMap'
import { getLifi } from './getLifi'

export const getLifiChainMap = async (): Promise<
  Result<Map<ChainId, ChainKey>, SwapErrorRight>
> => {
  const supportedChainRefs = evmChainIds.map(
    chainId => Number(fromChainId(chainId).chainReference) as LifiChainId,
  )

  // getMixPanel()?.track(MixPanelEvents.SwapperApiRequest, {
  //   swapper: SwapperName.LIFI,
  //   method: 'get',
  //   // Note, this may change if the Li.Fi SDK changes
  //   url: 'https://li.quest/v1/chains',
  // })
  const { chains } = await getLifi().getPossibilities({
    include: ['chains'],
    chains: supportedChainRefs,
  })

  if (chains === undefined)
    return Err(
      makeSwapErrorRight({
        message: '[getLifiChainMap] no chains available',
      }),
    )

  return Ok(createLifiChainMap(chains))
}
