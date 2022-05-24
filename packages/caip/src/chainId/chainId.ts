// https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md

import { CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../constants'
import {
  assertIsChainId,
  assertIsChainNamespace,
  assertIsChainReference,
  assertValidChainPartsPair
} from '../typeGuards'

export type ChainId = string

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

type FromChainIdReturn = {
  chainNamespace: ChainNamespace
  chainReference: ChainReference
}

type FromChainId = (chainId: string) => FromChainIdReturn

export const fromChainId: FromChainId = (chainId) => {
  const [chainNamespace, chainReference] = chainId.split(':')
  assertIsChainNamespace(chainNamespace)
  assertIsChainReference(chainReference)
  assertValidChainPartsPair(chainNamespace, chainReference)
  return { chainNamespace, chainReference }
}

export const toCAIP2 = toChainId
export const fromCAIP2 = fromChainId
