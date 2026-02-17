import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ProposalTypes, SessionTypes } from '@walletconnect/types'
import { uniq } from 'lodash'

import { BIP122SigningMethod, EIP155_SigningMethod } from '@/plugins/walletConnectToDapps/types'

const DEFAULT_EIP155_METHODS = Object.values(EIP155_SigningMethod).filter(
  method => method !== EIP155_SigningMethod.GET_CAPABILITIES,
)

const DEFAULT_BIP122_METHODS = Object.values(BIP122SigningMethod)
const DEFAULT_BIP122_EVENTS: string[] = []

const isBip122ChainId = (chainId: string): boolean =>
  chainId.startsWith(`${CHAIN_NAMESPACE.Utxo}:`)

const getDefaultMethods = (key: string): string[] => {
  switch (key) {
    case CHAIN_NAMESPACE.Evm:
      return DEFAULT_EIP155_METHODS
    case CHAIN_NAMESPACE.Utxo:
      return DEFAULT_BIP122_METHODS
    default:
      return []
  }
}

export const createApprovalNamespaces = (
  requiredNamespaces: ProposalTypes.RequiredNamespaces,
  optionalNamespaces: ProposalTypes.OptionalNamespaces,
  selectedAccountIds: AccountId[],
  selectedChainIds: ChainId[],
): SessionTypes.Namespaces => {
  const approvedNamespaces: SessionTypes.Namespaces = {}

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
        fromAccountId(accountId).chainNamespace === CHAIN_NAMESPACE.Evm &&
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

  // Handle optional BIP122 namespaces
  const additionalBip122ChainIds = selectedChainIds.filter(
    chainId => isBip122ChainId(chainId) && !requiredChainIds.includes(chainId),
  )

  if (additionalBip122ChainIds.length > 0) {
    const bip122AccountIds = selectedAccountIds.filter(
      accountId =>
        fromAccountId(accountId).chainNamespace === CHAIN_NAMESPACE.Utxo &&
        additionalBip122ChainIds.includes(fromAccountId(accountId).chainId),
    )

    if (bip122AccountIds.length > 0) {
      const existing = approvedNamespaces.bip122
      approvedNamespaces.bip122 = {
        ...(existing ?? {}),
        accounts: uniq([...(existing?.accounts ?? []), ...bip122AccountIds]),
        methods: uniq([
          ...(existing?.methods ?? DEFAULT_BIP122_METHODS),
          ...(optionalNamespaces?.bip122?.methods && optionalNamespaces.bip122.methods.length > 0
            ? optionalNamespaces.bip122.methods
            : DEFAULT_BIP122_METHODS),
        ]),
        events: uniq([
          ...(existing?.events ?? DEFAULT_BIP122_EVENTS),
          ...(optionalNamespaces?.bip122?.events ?? []),
        ]),
      }
    }
  }

  return approvedNamespaces
}
