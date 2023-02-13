import { Flex, VStack } from '@chakra-ui/react'
import type { ProposalTypes } from '@walletconnect/types'
import type { FC } from 'react'
import { Card } from 'components/Card/Card'
import { RawText } from 'components/Text'

interface IProps {
  requiredNamespaces: ProposalTypes.RequiredNamespaces
}

// FIXME: this needs serious beard oil, but it shows all required information for now.
export const Permissions: FC<IProps> = ({ requiredNamespaces }) => {
  // For each chainNamespace (e.g. eip155), return a card showing: chains, methods, events.
  const chainNamespacePermissions: JSX.Element[] = Object.entries(requiredNamespaces).map(
    ([chainNamespace, value]) => {
      return (
        <Card>
          <Card.Header>
            <Card.Heading>{chainNamespace}</Card.Heading>
          </Card.Header>
          <Card.Body>
            <Flex alignItems='center' gap={4}>
              <RawText>
                <b>Chains:</b> {value.chains?.join(', ')}
              </RawText>
              <RawText>
                <b>Methods:</b> {value.methods.join(', ')}
              </RawText>
              <RawText>
                <b>Events:</b> {value.events.join(', ')}
              </RawText>
            </Flex>
          </Card.Body>
        </Card>
      )
    },
  )
  // Return a set of cards per chainNamespace (e.g. eip155)
  return <VStack>{chainNamespacePermissions}</VStack>
}
