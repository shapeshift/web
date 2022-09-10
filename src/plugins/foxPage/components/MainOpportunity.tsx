import { supportsETH } from '@shapeshiftoss/hdwallet-core/dist/wallet'
import { useMemo } from 'react'
import type { ResponsiveValue } from '@chakra-ui/react'
import { Box, Button, Flex, Skeleton, Text as CText } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import type { TextPropTypes } from 'components/Text/Text'
import { Text } from 'components/Text/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
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
  const {
    state: { wallet },
  } = useWallet()

  const selectedAsset = useAppSelector(state => selectAssetById(state, assetId))

  const { data: foxyBalancesData, isLoading: isFoxyBalancesLoading } = useFoxyBalances({
    accountNumber: 0,
  })
  const hasActiveStaking = bnOrZero(foxyBalancesData?.opportunities?.[0]?.balance).gt(0)

  const opportunityButtonTranslation = useMemo(() => {
    if (hasActiveStaking) return 'plugins.foxPage.manage'
    if (!wallet || !supportsETH(wallet)) return 'common.connectWallet'
    return 'plugins.foxPage.getStarted'
  }, [wallet, hasActiveStaking])

  const isOpportunityButtonReady = useMemo(
    () => Boolean((wallet && !supportsETH(wallet)) || isFoxyBalancesLoading),
    [wallet, isFoxyBalancesLoading])

  const mainStakingTitleTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      'plugins.foxPage.mainStakingTitle' as const,
      {
        assetSymbol: selectedAsset.symbol,
      },
    ],
    [selectedAsset.symbol],
  )

  const flexDirection: ResponsiveValue<Property.FlexDirection> = useMemo(
    () => ({ base: 'column', md: 'row' }),
    [],
  )
  const flexCommonProps = useMemo(
    () => ({
      flexDirection,
      alignItems: { base: 'center', md: 'flex-start' },
      justifyContent: 'space-between',
      width: 'full',
    }),
    [flexDirection],
  )

  return (
    <Card display='block' width='auto'>
      <Card.Header>
        <Flex flexDirection='row' alignItems='center' mb={2}>
          <AssetIcon src={selectedAsset.icon} boxSize='6' mr={2} zIndex={2} />
          <Text fontWeight='bold' color='inherit' translation={mainStakingTitleTranslation} />
        </Flex>
        <Text translation='plugins.foxPage.mainStakingDescription' color='gray.500' />
      </Card.Header>
      <Card.Body>
        <Flex width='full' justifyContent='space-between' gap={4} flexDirection={flexDirection}>
          <Flex {...flexCommonProps}>
            <Text translation='plugins.foxPage.currentApy' color='gray.500' mb={1} />
            <Skeleton isLoaded={Boolean(apy)}>
              <Box color='green.400' fontSize={'xl'}>
                <Amount.Percent value={apy} />
              </Box>
            </Skeleton>
          </Flex>
          <Flex {...flexCommonProps}>
            <Text translation='plugins.foxPage.tvl' color='gray.500' mb={1} />
            <Skeleton isLoaded={isLoaded}>
              <Amount.Fiat color='inherit' fontSize={'xl'} fontWeight='semibold' value={tvl} />
            </Skeleton>
          </Flex>
          <Flex {...flexCommonProps}>
            <Text translation='plugins.foxPage.balance' color='gray.500' mb={1} />
            <CText color='inherit' fontSize={'xl'}>
              {balance}
            </CText>
          </Flex>
          <Skeleton width='full' isLoaded={isOpportunityButtonReady} alignSelf='center'>
            <Box width='full'>
              <Button width='full' onClick={onClick} colorScheme={'blue'}>
                <Text translation={opportunityButtonTranslation} />
              </Button>
            </Box>
          </Skeleton>
        </Flex>
      </Card.Body>
    </Card>
  )
}
