import { Box, Flex } from '@chakra-ui/layout'
import { Button, Text as CText } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { fox } from 'test/mocks/assets'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'

type MainOpportunityProps = {
  apy: string
  assetSymbol: string
  tvl: string
  balance: string
  onClick: () => void
}

export const FoxOpportunity = ({
  apy,
  tvl,
  assetSymbol,
  balance,
  onClick,
}: MainOpportunityProps) => {
  const translate = useTranslate()

  return (
    <Card display='block' width='full' borderRadius={8}>
      <Card.Header>
        <Flex flexDirection='row' alignItems='center' mb={2}>
          <AssetIcon src={fox.icon} boxSize='6' mr={2} zIndex={2} />
          <CText fontWeight='bold' color='inherit'>
            {translate('plugins.foxPage.titleStaking', {
              assetSymbol,
            })}
          </CText>
        </Flex>
        <Text translation='Lorem ipsum sit dolor amet.' color='gray.500' />
      </Card.Header>
      <Card.Body>
        <Flex
          justifyContent='space-between'
          flexDirection={'row'}
          flexWrap={{ base: 'wrap', md: 'nowrap' }}
        >
          <Box width={{ base: '50%', md: 'auto' }}>
            <Text translation='plugins.foxPage.currentApy' color='gray.500' mb={1} />
            <CText color='green.400' fontSize={'xl'}>
              <Amount.Percent value={apy} />
            </CText>
          </Box>
          <Box display={{ base: 'none', md: 'block' }} width={{ base: '50%', md: 'auto' }}>
            <Text translation='plugins.foxPage.tvl' color='gray.500' mb={1} />
            <Amount.Fiat color='inherit' fontSize={'xl'} fontWeight='semibold' value={tvl} />
          </Box>
          <Box width={{ base: '50%', md: 'auto' }} mb={{ base: 4, md: 0 }}>
            <Text translation='plugins.foxPage.balance' color='gray.500' mb={1} />
            <CText color='inherit' fontSize={'xl'}>
              {balance}
            </CText>
          </Box>
          <Box alignSelf='center' width={{ base: 'full', md: 'auto' }}>
            <Button onClick={onClick} colorScheme={'blue'} width={{ base: 'full', md: 'auto' }}>
              <CText>{translate('plugins.foxPage.getStarted')}</CText>
            </Button>
          </Box>
        </Flex>
      </Card.Body>
    </Card>
  )
}
