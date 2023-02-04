import { VStack } from '@chakra-ui/react'
import type { ProposalTypes } from '@walletconnect/types'
import type { FC } from 'react'
import { Card } from 'components/Card/Card'

interface IProps {
  requiredNamespaces: ProposalTypes.RequiredNamespaces
}

export const Permissions: FC<IProps> = ({ requiredNamespaces }) => {
  const permissionCards: JSX.Element[] = Object.entries(requiredNamespaces).map(
    ([chainNamespace, value]) => {
      return (
        <Card>
          <Card.Body></Card.Body>
        </Card>
      )
    },
  )
  return <VStack>{permissionCards}</VStack>
}
