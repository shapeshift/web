import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ProposalTypes, SessionTypes } from '@walletconnect/types'
import { uniq } from 'lodash'

import { EIP155_SigningMethod } from '@/plugins/walletConnectToDapps/types'

export const createApprovalNamespaces = (
  requiredNamespaces: ProposalTypes.RequiredNamespaces,
  optionalNamespaces: ProposalTypes.OptionalNamespaces,
  selectedAccountIds: AccountId[],
  selectedChainIds: ChainId[],
): SessionTypes.Namespaces => {
  const approvedNamespaces: SessionTypes.Namespaces = {}

  const DEFAULT_EIP155_METHODS = Object.values(EIP155_SigningMethod).filter(
    method => method !== EIP155_SigningMethod.GET_CAPABILITIES,
  )

  const createNamespaceEntry = (
    key: string,
    proposalNamespace: ProposalTypes.RequiredNamespace,
    accounts: string[],
  ) => {
    // That condition seems useless at runtime since we *currently* only handle eip155
    // but technically, we *do* support Cosmos SDK
    const methods = key === 'eip155' ? DEFAULT_EIP155_METHODS : proposalNamespace.methods

    return {
      accounts,
      methods,
      events: proposalNamespace.events,
    }
  }

  // Handle required namespaces first
  Object.entries(requiredNamespaces).forEach(([key, proposalNamespace]) => {
    const selectedAccountsForKey = selectedAccountIds.filter(accountId => {
      const { chainNamespace } = fromAccountId(accountId)
      return chainNamespace === key
    })

    if (selectedAccountsForKey.length > 0) {
      approvedNamespaces[key] = createNamespaceEntry(key, proposalNamespace, selectedAccountsForKey)
    }
  })

  // Handle optional namespaces for chains user selected but aren't required
  const requiredChainIds = Object.values(requiredNamespaces)
    .flatMap(namespace => namespace.chains ?? [])
    .filter(isEvmChainId)

  const additionalChainIds = selectedChainIds.filter(
    chainId => isEvmChainId(chainId) && !requiredChainIds.includes(chainId),
  )

  if (additionalChainIds.length > 0) {
    const eip155AccountIds = selectedAccountIds.filter(
      accountId =>
        fromAccountId(accountId).chainNamespace === 'eip155' &&
        additionalChainIds.includes(fromAccountId(accountId).chainId),
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

  return approvedNamespaces
}
