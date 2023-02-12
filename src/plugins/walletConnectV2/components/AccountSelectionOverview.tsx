import { VStack } from '@chakra-ui/react'
import type { ProposalTypes } from '@walletconnect/types'
import { AccountSelectionByChainId } from 'plugins/walletConnectV2/components/AccountSelectionByChainId'
import type { FC } from 'react'
import { RawText } from 'components/Text'

interface IProps {
  requiredNamespaces: ProposalTypes.RequiredNamespaces
  selectedAccountIds: string[]
  toggleAccountId: (accountId: string) => void
}

export const AccountSelectionOverview: FC<IProps> = ({
  requiredNamespaces,
  toggleAccountId,
  selectedAccountIds,
}) => {
  const accountsByChainNamespace: JSX.Element[] = Object.entries(requiredNamespaces).map(
    ([chainNamespace, requiredNamespace]) => {
      return (
        <>
          <RawText>{chainNamespace}</RawText>
          {requiredNamespace.chains?.map(chainId => {
            return (
              <AccountSelectionByChainId
                chainId={chainId}
                toggleAccountId={toggleAccountId}
                selectedAccountIds={selectedAccountIds}
              />
            )
          })}
        </>
      )
    },
  )
  return <VStack>{accountsByChainNamespace}</VStack>
}
