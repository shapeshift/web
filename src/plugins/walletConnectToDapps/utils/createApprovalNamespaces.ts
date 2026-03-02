import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ProposalTypes, SessionTypes } from '@walletconnect/types'
import { uniq } from 'lodash'

import { CosmosSigningMethod, EIP155_SigningMethod } from '@/plugins/walletConnectToDapps/types'

const DEFAULT_EIP155_METHODS = Object.values(EIP155_SigningMethod).filter(
  method => method !== EIP155_SigningMethod.GET_CAPABILITIES,
)

const DEFAULT_COSMOS_METHODS = Object.values(CosmosSigningMethod)

const DEFAULT_COSMOS_EVENTS: string[] = []

const isCosmosSdkChainId = (chainId: string): boolean =>
  chainId.startsWith(`${CHAIN_NAMESPACE.CosmosSdk}:`)

export const isWcSupportedChainId = (chainId: string): boolean =>
  isEvmChainId(chainId) || isCosmosSdkChainId(chainId)

export const createApprovalNamespaces = (
  requiredNamespaces: ProposalTypes.RequiredNamespaces,
  optionalNamespaces: ProposalTypes.OptionalNamespaces,
  selectedAccountIds: AccountId[],
  selectedChainIds: ChainId[],
): SessionTypes.Namespaces => {
  const approvedNamespaces: SessionTypes.Namespaces = {}

  const getDefaultMethods = (key: string): string[] => {
    switch (key) {
      case CHAIN_NAMESPACE.Evm:
        return DEFAULT_EIP155_METHODS
      case CHAIN_NAMESPACE.CosmosSdk:
        return DEFAULT_COSMOS_METHODS
      default:
        return []
    }
  }

  const createNamespaceEntry = (
    key: string,
    proposalNamespace: ProposalTypes.RequiredNamespace,
    accounts: string[],
  ) => {
    const defaultMethods = getDefaultMethods(key)
    const methods = defaultMethods.length > 0 ? defaultMethods : proposalNamespace.methods

    return {
      accounts,
      methods,
      events: proposalNamespace.events,
    }
  }

  Object.entries(requiredNamespaces).forEach(([key, proposalNamespace]) => {
    const selectedAccountsForKey = selectedAccountIds.filter(accountId => {
      const { chainNamespace } = fromAccountId(accountId)
      return chainNamespace === key
    })

    if (selectedAccountsForKey.length > 0) {
      approvedNamespaces[key] = createNamespaceEntry(key, proposalNamespace, selectedAccountsForKey)
    }
  })

  const requiredChainIds = Object.values(requiredNamespaces).flatMap(
    namespace => namespace.chains ?? [],
  )

  // Handle optional EVM namespaces
  const additionalEvmChainIds = selectedChainIds.filter(
    chainId => isEvmChainId(chainId) && !requiredChainIds.includes(chainId),
  )

  if (additionalEvmChainIds.length > 0) {
    const eip155AccountIds = selectedAccountIds.filter(
      accountId =>
        fromAccountId(accountId).chainNamespace === 'eip155' &&
        additionalEvmChainIds.includes(fromAccountId(accountId).chainId),
    )

    if (eip155AccountIds.length > 0) {
      const existing = approvedNamespaces.eip155
      approvedNamespaces.eip155 = {
        ...(existing ?? {}),
        accounts: uniq([...(existing?.accounts ?? []), ...eip155AccountIds]),
        methods: uniq([
          ...(existing?.methods ?? DEFAULT_EIP155_METHODS),
          ...(optionalNamespaces?.eip155?.methods && optionalNamespaces.eip155.methods.length > 0
            ? optionalNamespaces.eip155.methods
            : DEFAULT_EIP155_METHODS),
        ]),
        events: uniq([...(existing?.events ?? []), ...(optionalNamespaces?.eip155?.events ?? [])]),
      }
    }
  }

  // Handle optional Cosmos namespaces
  const cosmosNamespaceKey = CHAIN_NAMESPACE.CosmosSdk
  const additionalCosmosChainIds = selectedChainIds.filter(
    chainId => isCosmosSdkChainId(chainId) && !requiredChainIds.includes(chainId),
  )

  if (additionalCosmosChainIds.length > 0) {
    const cosmosAccountIds = selectedAccountIds.filter(
      accountId =>
        fromAccountId(accountId).chainNamespace === cosmosNamespaceKey &&
        additionalCosmosChainIds.includes(fromAccountId(accountId).chainId),
    )

    if (cosmosAccountIds.length > 0) {
      const existing = approvedNamespaces[cosmosNamespaceKey]
      approvedNamespaces[cosmosNamespaceKey] = {
        ...(existing ?? {}),
        accounts: uniq([...(existing?.accounts ?? []), ...cosmosAccountIds]),
        methods: uniq([
          ...(existing?.methods ?? DEFAULT_COSMOS_METHODS),
          ...(optionalNamespaces?.[cosmosNamespaceKey]?.methods &&
          optionalNamespaces[cosmosNamespaceKey].methods.length > 0
            ? optionalNamespaces[cosmosNamespaceKey].methods
            : DEFAULT_COSMOS_METHODS),
        ]),
        events: uniq([
          ...(existing?.events ?? DEFAULT_COSMOS_EVENTS),
          ...(optionalNamespaces?.[cosmosNamespaceKey]?.events ?? DEFAULT_COSMOS_EVENTS),
        ]),
      }
    }
  }

  return approvedNamespaces
}
