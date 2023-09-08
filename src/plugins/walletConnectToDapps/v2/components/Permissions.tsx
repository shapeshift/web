import { VStack } from '@chakra-ui/react'
import type { ProposalTypes } from '@walletconnect/types'
import type { FC } from 'react'
import { useMemo } from 'react'

import { ChainReferenceCard } from './ChainReferenceCard'

interface IProps {
  requiredNamespaces: ProposalTypes.RequiredNamespaces
  selectedAccountIds: string[]
  toggleAccountId: (accountId: string) => void
}

export const Permissions: FC<IProps> = ({
  requiredNamespaces,
  selectedAccountIds,
  toggleAccountId,
}) => {
  // For each chainNamespace (e.g. eip155), return a card showing: chains, methods, events.
  const renderPermissions = useMemo(
    () =>
      Object.entries(requiredNamespaces).map(([chainNamespace, value]) => {
        return value.chains?.map(chainId => (
          <ChainReferenceCard
            chainNamespace={chainNamespace}
            chainId={chainId}
            methods={value.methods}
            events={value.events}
            key={chainId}
            selectedAccountIds={selectedAccountIds}
            toggleAccountId={toggleAccountId}
          />
        ))
      }),
    [requiredNamespaces, selectedAccountIds, toggleAccountId],
  )
  // Return a set of cards per chainNamespace (e.g. eip155)
  return <VStack>{renderPermissions}</VStack>
}
