import { CHAIN_NAMESPACE } from './constants'

const dynamicEvmChainReferences = new Set<string>()

export const registerEvmChainReference = (chainReference: string): void => {
  if (!/^\d+$/.test(chainReference)) {
    throw new Error(`Invalid EVM chain reference: ${chainReference}. Must be a numeric string.`)
  }
  dynamicEvmChainReferences.add(chainReference)
}

export const registerEvmChainReferences = (chainReferences: string[]): void => {
  for (const ref of chainReferences) {
    registerEvmChainReference(ref)
  }
}

export const unregisterEvmChainReference = (chainReference: string): void => {
  dynamicEvmChainReferences.delete(chainReference)
}

export const isDynamicEvmChainReference = (chainReference: string): boolean => {
  return dynamicEvmChainReferences.has(chainReference)
}

export const getDynamicEvmChainReferences = (): string[] => {
  return Array.from(dynamicEvmChainReferences)
}

export const clearDynamicEvmChainReferences = (): void => {
  dynamicEvmChainReferences.clear()
}

export const isValidEvmChainReference = (chainReference: string): boolean => {
  return /^\d+$/.test(chainReference)
}

export const toEvmChainId = (chainReference: string): `eip155:${string}` => {
  if (!isValidEvmChainReference(chainReference)) {
    throw new Error(`Invalid EVM chain reference: ${chainReference}. Must be a numeric string.`)
  }
  return `${CHAIN_NAMESPACE.Evm}:${chainReference}` as `eip155:${string}`
}

export const fromEvmChainId = (chainId: string): string | undefined => {
  if (!chainId.startsWith(`${CHAIN_NAMESPACE.Evm}:`)) {
    return undefined
  }
  const chainReference = chainId.slice(CHAIN_NAMESPACE.Evm.length + 1)
  if (!isValidEvmChainReference(chainReference)) {
    return undefined
  }
  return chainReference
}
