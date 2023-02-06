import { VStack } from '@chakra-ui/react'
import type { ProposalTypes } from '@walletconnect/types'
import { AccountSelectionByChainId } from 'plugins/walletConnectV2/components/AccountSelectionByChainId'
import type { FC } from 'react'
import { RawText } from 'components/Text'

interface IProps {
  requiredNamespaces: ProposalTypes.RequiredNamespaces
}

export const AccountSelectionOverview: FC<IProps> = ({ requiredNamespaces }) => {
  const accountsByChainNamespace: JSX.Element[] = Object.entries(requiredNamespaces).map(
    ([chainNamespace, requiredNamespace]) => {
      return (
        <>
          <RawText>{chainNamespace}</RawText>
          {requiredNamespace.chains.map(chainId => {
            return <AccountSelectionByChainId chainId={chainId} />
          })}
        </>
      )
    },
  )
  return <VStack>{accountsByChainNamespace}</VStack>
}
