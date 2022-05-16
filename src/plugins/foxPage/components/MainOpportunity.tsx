import { Box, Flex } from '@chakra-ui/layout'
import { Button, Text as CText, useColorModeValue } from '@chakra-ui/react'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { fox } from 'test/mocks/assets'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'
import { BigNumber } from 'lib/bignumber/bignumber'

type MainOpportunityProps = {
  apy: string
  tvl: BigNumber
  balance: string
  type: DefiType
  provider: string
  tokenCaip19: string
}

export const MainOpportunity = ({
  apy,
  tvl,
  balance,
  type,
  provider,
  tokenCaip19,
}: MainOpportunityProps) => {
  const bgHover = useColorModeValue('gray.100', 'gray.750')

  return (
    <Card display='block' width='full'>
      <Card.Header>
        <Flex flexDirection='row' alignItems='center' mb={2}>
          <AssetIcon src={fox.icon} boxSize='6' mr={2} zIndex={2} />
          <Text translation='FOX Token Staking' fontWeight='bold' color='inherit' />
        </Flex>
        <Text translation='Lorem ipsum sit dolor amet.' color='gray.500' />
      </Card.Header>
      <Card.Body>
        <Flex justifyContent='space-between' flexDirection={{ base: 'column', md: 'row' }}>
          <Box>
            <Text translation='Current APY' color='gray.500' mb={1} />
            <CText color='green.400' fontSize={'xl'}>
              {'11.61%'}
            </CText>
          </Box>
          <Box>
            <Text translation='TVL' color='gray.500' mb={1} />
            <CText color='inherit' fontSize={'xl'} fontWeight='semibold'>
              {'3.4M'}
            </CText>
          </Box>
          <Box>
            <Text translation='Balance' color='gray.500' mb={1} />
            <CText color='inherit' fontSize={'xl'}>
              {'--'}
            </CText>
          </Box>
          <Box alignSelf='center'>
            <Button onClick={() => {}} colorScheme={'blue'}>
              <CText>{'Get Started'}</CText>
            </Button>
          </Box>
        </Flex>
      </Card.Body>
    </Card>
  )
}
