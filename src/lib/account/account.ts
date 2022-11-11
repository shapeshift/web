import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import merge from 'lodash/merge'
import type { AccountMetadataById } from 'state/slices/portfolioSlice/portfolioSliceCommon'

import { deriveCosmosSdkAccountIdsAndMetadata } from './cosmosSdk'
import { deriveEvmAccountIdsAndMetadata } from './evm'
import { deriveUtxoAccountIdsAndMetadata } from './utxo'

const deriveAccountIdsAndMetadataForChainNamespace = {
  [CHAIN_NAMESPACE.CosmosSdk]: deriveCosmosSdkAccountIdsAndMetadata,
  [CHAIN_NAMESPACE.Evm]: deriveEvmAccountIdsAndMetadata,
  [CHAIN_NAMESPACE.Utxo]: deriveUtxoAccountIdsAndMetadata,
} as const

export type DeriveAccountIdsAndMetadataArgs = {
  accountNumber: number
  chainIds: ChainId[]
  wallet: HDWallet
}
export type DeriveAccountIdsAndMetadataReturn = Promise<AccountMetadataById>
export type DeriveAccountIdsAndMetadata = (
  args: DeriveAccountIdsAndMetadataArgs,
) => DeriveAccountIdsAndMetadataReturn

export const deriveAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args
  if (!Number.isInteger(accountNumber) || accountNumber < 0)
    throw new Error('invalid accountNumber')

  type ChainNamespaceKey = typeof CHAIN_NAMESPACE[keyof typeof CHAIN_NAMESPACE]
  type ChainIdsByChainNamespace = {
    [key in ChainNamespaceKey]: ChainId[]
  }
  const initial: ChainIdsByChainNamespace = {
    [CHAIN_NAMESPACE.CosmosSdk]: [],
    [CHAIN_NAMESPACE.Evm]: [],
    [CHAIN_NAMESPACE.Utxo]: [],
  }
  const chainIdsByChainNamespace = chainIds.reduce((acc, chainId) => {
    const { chainNamespace } = fromChainId(chainId)
    if (!acc[chainNamespace]) acc[chainNamespace] = []
    acc[chainNamespace].push(chainId)
    return acc
  }, initial)

  const result = await Promise.all(
    Object.entries(chainIdsByChainNamespace).map(([chainNamespace, chainIds]) =>
      deriveAccountIdsAndMetadataForChainNamespace[chainNamespace as ChainNamespaceKey]({
        accountNumber,
        chainIds,
        wallet,
      }),
    ),
  )
  return merge({}, ...result)
}
