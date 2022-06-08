import { Box, Flex, Skeleton } from '@chakra-ui/react'
import { Button, Text as CText } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { fox } from 'test/mocks/assets'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'

type MainOpportunityProps = {
  isLoaded: boolean
  apy: string
  tvl: string
  balance: string
  onClick: () => void
}

export const MainOpportunity = ({ apy, tvl, balance, onClick, isLoaded }: MainOpportunityProps) => {
  const translate = useTranslate()

  return (
    <Card display='block' width='full'>
      <Card.Header>
        <Flex flexDirection='row' alignItems='center' mb={2}>
          <AssetIcon src={fox.icon} boxSize='6' mr={2} zIndex={2} />
          <CText fontWeight='bold' color='inherit'>
            {translate('plugins.foxPage.titleStaking', {
              assetSymbol: 'FOX',
            })}
          </CText>
        </Flex>
        <Text translation='Lorem ipsum sit dolor amet.' color='gray.500' />
      </Card.Header>
      <Card.Body>
        <Flex justifyContent='space-between' flexDirection={{ base: 'column', md: 'row' }}>
          <Box>
            <Text translation='plugins.foxPage.currentApy' color='gray.500' mb={1} />
            <Skeleton isLoaded={Boolean(apy)}>
              <CText color='green.400' fontSize={'xl'}>
                <Amount.Percent value={apy} />
              </CText>
            </Skeleton>
          </Box>
          <Box>
            <Text translation='plugins.foxPage.tvl' color='gray.500' mb={1} />
            <Skeleton isLoaded={isLoaded}>
              <Amount.Fiat color='inherit' fontSize={'xl'} fontWeight='semibold' value={tvl} />
            </Skeleton>
          </Box>
          <Box>
            <Text translation='plugins.foxPage.balance' color='gray.500' mb={1} />
            <CText color='inherit' fontSize={'xl'}>
              {balance}
            </CText>
          </Box>
          <Box alignSelf='center'>
            <Button onClick={onClick} colorScheme={'blue'}>
              <CText>{translate('plugins.foxPage.getStarted')}</CText>
            </Button>
          </Box>
        </Flex>
      </Card.Body>
    </Card>
  )
}
