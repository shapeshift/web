import type { ChainId as LifiChainId, ChainKey } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import { arbitrumNovaChainId, fromChainId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'

import { createLifiChainMap } from './createLifiChainMap/createLifiChainMap'
import { getLifi } from './getLifi'

export const getLifiChainMap = async (): Promise<Map<ChainId, ChainKey>> => {
  const supportedChainRefs = evmChainIds
    .filter(chainId => chainId !== arbitrumNovaChainId)
    .map(chainId => Number(fromChainId(chainId).chainReference) as LifiChainId)

  const { chains } = await getLifi().getPossibilities({
    include: ['chains'],
    chains: supportedChainRefs,
  })

  if (chains === undefined) throw Error('no chains available')

  return createLifiChainMap(chains)
}
