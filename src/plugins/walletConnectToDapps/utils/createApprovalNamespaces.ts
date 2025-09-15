import type { ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ProposalTypes, SessionTypes } from '@walletconnect/types'
import { uniq } from 'lodash'

import { EIP155_SigningMethod } from '@/plugins/walletConnectToDapps/types'

export const createApprovalNamespaces = (
  requiredNamespaces: ProposalTypes.RequiredNamespaces,
  optionalNamespaces: ProposalTypes.OptionalNamespaces,
  selectedAccounts: string[],
  selectedChainIds: ChainId[],
): SessionTypes.Namespaces => {
  const approvedNamespaces: SessionTypes.Namespaces = {}

  // Helper to create namespace entry
  const createNamespaceEntry = (
    key: string,
    proposalNamespace: ProposalTypes.RequiredNamespace,
    accounts: string[],
  ) => {
    const methods =
      key === 'eip155'
        ? Object.values(EIP155_SigningMethod).filter(
            method => method !== EIP155_SigningMethod.GET_CAPABILITIES,
          )
        : proposalNamespace.methods

    return {
      accounts,
      methods,
      events: proposalNamespace.events,
    }
  }

  // Handle required namespaces first
  Object.entries(requiredNamespaces).forEach(([key, proposalNamespace]) => {
    const selectedAccountsForKey = selectedAccounts.filter(accountId => {
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

  if (additionalChainIds.length > 0 && optionalNamespaces?.eip155) {
    const eip155AccountIds = selectedAccounts.filter(
      accountId =>
        fromAccountId(accountId).chainNamespace === 'eip155' &&
        additionalChainIds.includes(fromAccountId(accountId).chainId),
    )

    if (eip155AccountIds.length > 0) {
      approvedNamespaces.eip155 = {
        ...(approvedNamespaces.eip155 || {}),
        accounts: uniq([...(approvedNamespaces.eip155?.accounts || []), ...eip155AccountIds]),
        methods:
          optionalNamespaces.eip155.methods ||
          Object.values(EIP155_SigningMethod).filter(
            method => method !== EIP155_SigningMethod.GET_CAPABILITIES,
          ),
        events: optionalNamespaces.eip155.events || [],
      }
    }
  }

  return approvedNamespaces
}