import type { ChainId as LifiChainId, ChainKey } from '@lifi/sdk'
import { getChains } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import { arbitrumNovaChainId, fromChainId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'

import { configureLiFi } from './configureLiFi'
import { createLifiChainMap } from './createLifiChainMap/createLifiChainMap'

export const getLifiChainMap = async (): Promise<Map<ChainId, ChainKey>> => {
  configureLiFi()

  const supportedChainRefs = evmChainIds
    .filter(chainId => chainId !== arbitrumNovaChainId)
    .map(chainId => Number(fromChainId(chainId).chainReference) as LifiChainId)

  const chains = await getChains()
  if (chains === undefined) throw Error('no chains available')

  const filteredChains = chains.filter(chain => supportedChainRefs.includes(chain.id))

  return createLifiChainMap(filteredChains)
}
