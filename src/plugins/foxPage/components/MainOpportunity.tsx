import { Box, Flex, Skeleton } from '@chakra-ui/react'
import { Button, Text as CText } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type MainOpportunityProps = {
  apy: string
  assetId: string
  balance: string
  isLoaded: boolean
  onClick: () => void
  tvl: string
}

export const MainOpportunity = ({
  apy,
  assetId,
  tvl,
  balance,
  onClick,
  isLoaded,
}: MainOpportunityProps) => {
  const translate = useTranslate()

  const selectedAsset = useAppSelector(state => selectAssetById(state, assetId))

  const { data: foxyBalancesData, isLoading: isFoxyBalancesLoading } = useFoxyBalances()
  const hasActiveStaking = bnOrZero(foxyBalancesData?.opportunities?.[0]?.balance).gt(0)

  return (
    <Card display='block' width='full'>
      <Card.Header>
        <Flex flexDirection='row' alignItems='center' mb={2}>
          <AssetIcon src={selectedAsset.icon} boxSize='6' mr={2} zIndex={2} />
          <Text
            fontWeight='bold'
            color='inherit'
            translation={[
              'plugins.foxPage.mainStakingTitle',
              {
                assetSymbol: selectedAsset.symbol,
              },
            ]}
          />
        </Flex>
        <Text translation='plugins.foxPage.mainStakingDescription' color='gray.500' />
      </Card.Header>
      <Card.Body>
        <Flex
          width='full'
          justifyContent='space-between'
          gap={4}
          flexDirection={{ base: 'column', md: 'row' }}
        >
          <Flex
            flexDirection={{ base: 'row', md: 'column' }}
            width='full'
            justifyContent='space-between'
            alignItems={{ base: 'center', md: 'flex-start' }}
          >
            <Text translation='plugins.foxPage.currentApy' color='gray.500' mb={1} />
            <Skeleton isLoaded={Boolean(apy)}>
              <Box color='green.400' fontSize={'xl'}>
                <Amount.Percent value={apy} />
              </Box>
            </Skeleton>
          </Flex>
          <Flex
            flexDirection={{ base: 'row', md: 'column' }}
            width='full'
            justifyContent='space-between'
            alignItems={{ base: 'center', md: 'flex-start' }}
          >
            <Text translation='plugins.foxPage.tvl' color='gray.500' mb={1} />
            <Skeleton isLoaded={isLoaded}>
              <Amount.Fiat color='inherit' fontSize={'xl'} fontWeight='semibold' value={tvl} />
            </Skeleton>
          </Flex>
          <Flex
            flexDirection={{ base: 'row', md: 'column' }}
            width='full'
            justifyContent='space-between'
            alignItems={{ base: 'center', md: 'flex-start' }}
          >
            <Text translation='plugins.foxPage.balance' color='gray.500' mb={1} />
            <CText color='inherit' fontSize={'xl'}>
              {balance}
            </CText>
          </Flex>
          <Skeleton width='full' isLoaded={!isFoxyBalancesLoading} alignSelf='center'>
            <Box width='full'>
              <Button width='full' onClick={onClick} colorScheme={'blue'}>
                <CText>
                  {translate(
                    hasActiveStaking ? 'plugins.foxPage.manage' : 'plugins.foxPage.getStarted',
                  )}
                </CText>
              </Button>
            </Box>
          </Skeleton>
        </Flex>
      </Card.Body>
    </Card>
  )
}
