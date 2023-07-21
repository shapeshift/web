// https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md

import type { CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../constants'
import { assertIsChainId } from '../typeGuards'
import type { Nominal } from '../utils'

export type ChainId = Nominal<string, 'ChainId'>

export type ChainNamespace = typeof CHAIN_NAMESPACE[keyof typeof CHAIN_NAMESPACE]
export type ChainReference = typeof CHAIN_REFERENCE[keyof typeof CHAIN_REFERENCE]

type ToChainIdArgs = {
  chainNamespace: ChainNamespace
  chainReference: ChainReference
}

export const toChainId = (args: ToChainIdArgs): ChainId => {
  const { chainNamespace, chainReference } = args
  const maybeChainId = `${chainNamespace}:${chainReference}`
  assertIsChainId(maybeChainId)
  return maybeChainId
}

// NOTE: perf critical - benchmark any changes
export const fromChainId = (
  chainId: ChainId,
): {
  chainNamespace: ChainNamespace
  chainReference: ChainReference
} => {
  const idx = chainId.indexOf(':')
  const chainNamespace = chainId.substring(0, idx)
  const chainReference = chainId.substring(idx + 1)

  return {
    chainNamespace: chainNamespace as ChainNamespace,
    chainReference: chainReference as ChainReference,
  }
}

export const toCAIP2 = toChainId
export const fromCAIP2 = fromChainId
