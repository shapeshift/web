import type { FlexProps, StackProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  SimpleGrid,
  Skeleton,
  Stack,
  Tag,
  Text as CText,
} from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { ETH_FOX_STAKING_EVERGREEN_CONTRACT } from '@shapeshiftoss/contracts'
import type { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { LpEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import { selectAggregatedEarnUserStakingEligibleOpportunities } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const containerPaddingX = { base: 4, xl: 0 }
const headerTitleMb = { base: 4, md: 0 }
const headerSx: FlexProps['sx'] = {
  alignItems: { base: 'flex-start', md: 'center' },
  justifyContent: 'space-between',
  mb: 8,
  flexDir: {
    base: 'column',
    md: 'row',
  },
}
const stackProps: StackProps = {
  width: '100%',
  flexDir: 'column',
  flex: 1,
  spacing: 0,
}
const columnsProps = {
  base: 1,
  md: 2,
}

export const FoxFarming = () => {
  const translate = useTranslate()
  const isFoxFarmingEnabled = useFeatureFlag('FoxPageFoxFarmingSection')
  const history = useHistory()
  const location = useLocation()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()

  const eligibleOpportunities = useAppSelector(selectAggregatedEarnUserStakingEligibleOpportunities)

  const foxFarmingEvergreen = eligibleOpportunities.find(
    eligibleOpportunity =>
      eligibleOpportunity.contractAddress === ETH_FOX_STAKING_EVERGREEN_CONTRACT,
  )

  console.log({ foxFarmingEvergreen })

  const handleClick = useCallback(
    (opportunity: LpEarnOpportunityType, action: DefiAction) => {
      const {
        type,
        provider,
        contractAddress,
        chainId,
        rewardAddress,
        assetId,
        highestBalanceAccountAddress,
      } = opportunity
      const { assetReference, assetNamespace } = fromAssetId(assetId)

      if (!isConnected || isDemoWallet) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      history.push({
        pathname: location.pathname,
        search: qs.stringify({
          type,
          provider,
          chainId,
          contractAddress,
          assetNamespace,
          assetReference,
          highestBalanceAccountAddress,
          rewardId: rewardAddress,
          modal: action,
        }),
        state: { background: location },
      })
    },
    [dispatch, history, isConnected, isDemoWallet, location],
  )

  const handleManageClick = useCallback(() => {
    console.log('click')
  }, [])

  const handleClaimClick = useCallback(() => {
    console.log('claim')
  }, [])

  if (!isFoxFarmingEnabled) return null

  return (
    <>
      <Divider mb={4} />
      <Box py={4} px={containerPaddingX}>
        <Flex sx={headerSx}>
          <Box mb={headerTitleMb} maxWidth='50%'>
            <Heading as='h2' fontSize='2xl' display='flex' alignItems='center'>
              <CText as='span' me={1}>
                🧑‍🌾
              </CText>
              {translate('foxPage.foxFarming.title')}
              <Skeleton isLoaded={true} ml={2}>
                <Tag colorScheme='green' verticalAlign='middle'>
                  <Amount.Percent value={0.02} suffix='APY' />
                </Tag>
              </Skeleton>
            </Heading>
            <Text
              fontSize='md'
              color='text.subtle'
              mt={2}
              translation='foxPage.foxFarming.description'
            />
          </Box>

          <Card width='100%' maxWidth='400px'>
            <CardBody py={4} px={4}>
              <Flex alignItems='center' justifyContent='space-between'>
                <Box>
                  <Text
                    fontSize='md'
                    color='text.subtle'
                    translation='foxPage.foxFarming.totalClaimableRewards'
                  />

                  <Skeleton isLoaded={true}>
                    <Amount.Crypto value={'100'} symbol={'FOX'} />
                  </Skeleton>
                </Box>

                <Button onClick={handleClaimClick} colorScheme='gray' size='sm'>
                  {translate('common.claim')}
                </Button>
              </Flex>
            </CardBody>
          </Card>
        </Flex>

        <SimpleGrid my={4} columns={columnsProps} spacing='26px' width='100%' mb={8}>
          <Stack {...stackProps} alignItems='center' flexDir='row' justifyContent='space-between'>
            <Box>
              <Text
                fontSize='md'
                color='text.subtle'
                fontWeight='medium'
                translation='foxPage.foxFarming.totalStakingValue'
                mb={1}
              />
              <Skeleton isLoaded={true}>
                <Amount.Crypto fontSize='2xl' value={'100'} symbol={'FOX'} />
              </Skeleton>
            </Box>
            <Button onClick={handleManageClick} colorScheme='gray' size='sm'>
              {translate('common.manage')}
            </Button>
          </Stack>

          <Stack {...stackProps}>
            <Text
              fontSize='md'
              color='text.subtle'
              fontWeight='medium'
              translation='foxPage.foxFarming.nextEpoch'
              mb={1}
            />
            <Skeleton isLoaded={true}>
              <Amount.Crypto fontSize='2xl' value={'100'} symbol={'FOX'} />
            </Skeleton>
          </Stack>
        </SimpleGrid>
      </Box>
    </>
  )
}
