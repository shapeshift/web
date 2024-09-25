import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import merge from 'lodash/merge'
import { isFulfilled, isRejected } from 'lib/utils'

import { deriveCosmosSdkAccountIdsAndMetadata } from './cosmosSdk'
import { deriveEvmAccountIdsAndMetadata } from './evm'
import { deriveSolanaAccountIdsAndMetadata } from './solana'
import { deriveUtxoAccountIdsAndMetadata } from './utxo'

export const deriveAccountIdsAndMetadataForChainNamespace = {
  [CHAIN_NAMESPACE.CosmosSdk]: deriveCosmosSdkAccountIdsAndMetadata,
  [CHAIN_NAMESPACE.Evm]: deriveEvmAccountIdsAndMetadata,
  [CHAIN_NAMESPACE.Utxo]: deriveUtxoAccountIdsAndMetadata,
  [CHAIN_NAMESPACE.Solana]: deriveSolanaAccountIdsAndMetadata,
} as const

export type DeriveAccountIdsAndMetadataArgs = {
  accountNumber: number
  chainIds: ChainId[]
  wallet: HDWallet
  isSnapInstalled: boolean
}
export type DeriveAccountIdsAndMetadataReturn = Promise<AccountMetadataById>
export type DeriveAccountIdsAndMetadata = (
  args: DeriveAccountIdsAndMetadataArgs,
) => DeriveAccountIdsAndMetadataReturn

export const deriveAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet, isSnapInstalled } = args
  if (!Number.isInteger(accountNumber) || accountNumber < 0)
    throw new Error('invalid accountNumber')
  type ChainNamespaceKey = (typeof CHAIN_NAMESPACE)[keyof typeof CHAIN_NAMESPACE]
  type ChainIdsByChainNamespace = {
    [key in ChainNamespaceKey]: ChainId[]
  }
  const initial: ChainIdsByChainNamespace = {
    [CHAIN_NAMESPACE.CosmosSdk]: [],
    [CHAIN_NAMESPACE.Evm]: [],
    [CHAIN_NAMESPACE.Utxo]: [],
    [CHAIN_NAMESPACE.Solana]: [],
  }
  const chainIdsByChainNamespace = chainIds.reduce((acc, chainId) => {
    const { chainNamespace } = fromChainId(chainId)
    if (!acc[chainNamespace]) acc[chainNamespace] = []
    acc[chainNamespace].push(chainId)
    return acc
  }, initial)

  const settledAccountIdsAndMetadata = await Promise.allSettled(
    Object.entries(chainIdsByChainNamespace).map(([chainNamespace, chainIds]) =>
      deriveAccountIdsAndMetadataForChainNamespace[chainNamespace as ChainNamespaceKey]({
        accountNumber,
        chainIds,
        wallet,
        isSnapInstalled,
      }),
    ),
  )

  const fulfilledAccountIdsAndMetadata = settledAccountIdsAndMetadata.reduce<AccountMetadataById[]>(
    (acc, result) => {
      if (isRejected(result)) {
        console.error(result.reason)
      } else if (isFulfilled(result)) {
        acc.push(result.value)
      }
      return acc
    },
    [],
  )

  return merge({}, ...fulfilledAccountIdsAndMetadata)
}
