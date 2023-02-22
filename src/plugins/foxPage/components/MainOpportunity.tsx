import { Box, Button, Flex, Skeleton, Text as CText, useColorModeValue } from '@chakra-ui/react'
import type { ToAssetIdArgs } from '@shapeshiftoss/caip'
import { ethChainId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core/dist/wallet'
import { foxyAddresses } from '@shapeshiftoss/investor-foxy'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAggregatedEarnUserStakingOpportunityByStakingId,
  selectAssetById,
} from 'state/slices/selectors'
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
    state: { wallet, isDemoWallet },
  } = useWallet()
  const greenColor = useColorModeValue('green.600', 'green.400')
  const selectedAsset = useAppSelector(state => selectAssetById(state, assetId))
  if (!selectedAsset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const toAssetIdParts: ToAssetIdArgs = {
    assetNamespace: 'erc20',
    assetReference: foxyAddresses[0].staking,
    chainId: ethChainId,
  }

  const opportunityId = toOpportunityId(toAssetIdParts)
  const opportunityDataFilter = useMemo(() => {
    return {
      stakingId: opportunityId,
    }
  }, [opportunityId])

  const foxyEarnOpportunityData = useAppSelector(state =>
    opportunityDataFilter
      ? selectAggregatedEarnUserStakingOpportunityByStakingId(state, opportunityDataFilter)
      : undefined,
  )
  const hasActiveStaking = bnOrZero(foxyEarnOpportunityData?.stakedAmountCryptoBaseUnit).gt(0)

  const opportunityButtonTranslation = useMemo(() => {
    if (isDemoWallet || !wallet || !supportsETH(wallet)) return 'common.connectWallet'
    if (hasActiveStaking) return 'plugins.foxPage.manage'
    return 'plugins.foxPage.getStarted'
  }, [isDemoWallet, wallet, hasActiveStaking])

  const isOpportunityButtonReady = useMemo(
    () => Boolean(isDemoWallet || (wallet && !supportsETH(wallet)) || foxyEarnOpportunityData),
    [isDemoWallet, wallet, foxyEarnOpportunityData],
  )

  return (
    <Card display='block' width='auto'>
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
              <Box color={greenColor} fontSize={'xl'}>
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
