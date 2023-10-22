import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Skeleton,
  Text as CText,
  useColorModeValue,
} from '@chakra-ui/react'
import type { ToAssetIdArgs } from '@shapeshiftoss/caip'
import { ethChainId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core/dist/wallet'
import type { Property } from 'csstype'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { TextPropTypes } from 'components/Text/Text'
import { Text } from 'components/Text/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { foxyAddresses } from 'lib/investor/investor-foxy'
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

const flexDirectionRow: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const flexDirectionColumn: ResponsiveValue<Property.FlexDirection> = { base: 'row', md: 'column' }
const alignItemsFlexStart = { base: 'center', md: 'flex-start' }

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

  const mainStakingTitleTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      'plugins.foxPage.mainStakingTitle',
      {
        assetSymbol: selectedAsset.symbol,
      },
    ],
    [selectedAsset.symbol],
  )

  return (
    <Card display='block' width='auto'>
      <CardHeader>
        <Flex flexDirection='row' alignItems='center' mb={2}>
          <AssetIcon src={selectedAsset.icon} boxSize='6' mr={2} zIndex={2} />
          <Text fontWeight='bold' color='inherit' translation={mainStakingTitleTranslation} />
        </Flex>
        <Text translation='plugins.foxPage.mainStakingDescription' color='text.subtle' />
      </CardHeader>
      <CardBody>
        <Flex width='full' justifyContent='space-between' gap={4} flexDirection={flexDirectionRow}>
          <Flex
            flexDirection={flexDirectionColumn}
            width='full'
            justifyContent='space-between'
            alignItems={alignItemsFlexStart}
          >
            <Text translation='plugins.foxPage.currentApy' color='text.subtle' mb={1} />
            <Skeleton isLoaded={Boolean(apy)}>
              <Box color={greenColor} fontSize={'xl'}>
                <Amount.Percent value={apy} />
              </Box>
            </Skeleton>
          </Flex>
          <Flex
            flexDirection={flexDirectionColumn}
            width='full'
            justifyContent='space-between'
            alignItems={alignItemsFlexStart}
          >
            <Text translation='plugins.foxPage.tvl' color='text.subtle' mb={1} />
            <Skeleton isLoaded={isLoaded}>
              <Amount.Fiat color='inherit' fontSize={'xl'} fontWeight='semibold' value={tvl} />
            </Skeleton>
          </Flex>
          <Flex
            flexDirection={flexDirectionColumn}
            width='full'
            justifyContent='space-between'
            alignItems={alignItemsFlexStart}
          >
            <Text translation='plugins.foxPage.balance' color='text.subtle' mb={1} />
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
      </CardBody>
    </Card>
  )
}
