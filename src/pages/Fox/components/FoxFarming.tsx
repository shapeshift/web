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
import { ethChainId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { ETH_FOX_STAKING_EVERGREEN_CONTRACT } from '@shapeshiftoss/contracts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import qs from 'qs'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { formatSecondsToDuration } from 'lib/utils/time'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesApiSlice'
import { fetchAllOpportunitiesIdsByChainId } from 'state/slices/opportunitiesSlice/thunks'
import {
  DefiProvider,
  DefiType,
  type LpEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserStakingOpportunityByOpportunityId,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useFoxPageContext } from '../hooks/useFoxPageContext'

const containerPaddingX = { base: 4, xl: 0 }
const headerTitleMb = { base: 4, md: 0 }
const headerTitleMaxWidth = { base: '100%', md: '50%' }
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
  const { assetAccountId } = useFoxPageContext()
  const translate = useTranslate()
  const isFoxFarmingEnabled = useFeatureFlag('FoxPageFoxFarmingSection')
  const history = useHistory()
  const location = useLocation()
  const appDispatch = useAppDispatch()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()
  const queryClient = useQueryClient()

  useEffect(() => {
    appDispatch(marketApi.endpoints.findByAssetId.initiate(foxEthLpAssetId))
  }, [appDispatch])

  const foxEthMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, foxEthLpAssetId),
  )

  const opportunityId = useMemo(
    () =>
      toOpportunityId({
        assetNamespace: 'erc20',
        assetReference: ETH_FOX_STAKING_EVERGREEN_CONTRACT,
        chainId: assetAccountId ? fromAccountId(assetAccountId).chainId : ethChainId,
      }),
    [assetAccountId],
  )

  const stakingOpportunityByIdFilter = useMemo(() => {
    const userStakingId = assetAccountId
      ? serializeUserStakingId(assetAccountId, opportunityId)
      : undefined
    return { userStakingId, opportunityId }
  }, [assetAccountId, opportunityId])

  const opportunity = useAppSelector(state =>
    selectEarnUserStakingOpportunityByOpportunityId(state, stakingOpportunityByIdFilter),
  )

  const { getPeriodFinish } = useFoxFarming(ETH_FOX_STAKING_EVERGREEN_CONTRACT)

  const {
    data: periodFinish,
    isLoading: isGetPeriodFinishQueryLoading,
    isFetching: isGetPeriodFetchingLoading,
  } = useQuery({
    queryKey: ['getPeriodFinish'],
    queryFn: () => getPeriodFinish(),
  })

  const isGetPeriodFinishLoading = useMemo(
    () => isGetPeriodFinishQueryLoading || isGetPeriodFetchingLoading,
    [isGetPeriodFinishQueryLoading, isGetPeriodFetchingLoading],
  )

  const fetchOpportunityData = useCallback(async () => {
    if (!foxEthMarketData) return

    const chainId = assetAccountId ? fromAccountId(assetAccountId).chainId : ethChainId

    await fetchAllOpportunitiesIdsByChainId(appDispatch, chainId)
    appDispatch(
      opportunitiesApi.endpoints.getOpportunityMetadata.initiate(
        [
          {
            opportunityId,
            defiType: DefiType.Staking,
            defiProvider: DefiProvider.EthFoxStaking,
          },
        ],
        { forceRefetch: true },
      ),
    )

    if (assetAccountId) {
      appDispatch(
        opportunitiesApi.endpoints.getOpportunityUserData.initiate(
          [
            {
              opportunityId,
              accountId: assetAccountId,
              defiType: DefiType.Staking,
              defiProvider: DefiProvider.EthFoxStaking,
            },
          ],
          { forceRefetch: true },
        ),
      )
    }

    return true
  }, [assetAccountId, appDispatch, foxEthMarketData, opportunityId])

  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ['fetchOpportunityData'],
    })
  }, [assetAccountId, queryClient])

  const { isLoading: isOpportunityQueryLoading, isFetching: isOpportunityFetching } = useQuery({
    queryKey: ['fetchOpportunityData', assetAccountId],
    queryFn: fetchOpportunityData,
    enabled: Boolean(foxEthMarketData),
  })

  const isOpportunityLoading = useMemo(
    () => isOpportunityQueryLoading || isOpportunityFetching,
    [isOpportunityQueryLoading, isOpportunityFetching],
  )

  const underlyingAsset = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetId ?? ''),
  )

  const rewardAsset = useAppSelector(state =>
    selectAssetById(state, opportunity?.rewardAssetIds[0] ?? ''),
  )

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
    if (!opportunity) return

    handleClick(opportunity, DefiAction.Overview)
  }, [opportunity, handleClick])

  const handleClaimClick = useCallback(() => {
    if (!opportunity) return

    handleClick(opportunity, DefiAction.Claim)
  }, [opportunity, handleClick])

  const rewardsCryptoAmount = useMemo(() => {
    if (!opportunity) return
    if (!rewardAsset) return

    return fromBaseUnit(opportunity.rewardsCryptoBaseUnit?.amounts[0], rewardAsset?.precision ?? 0)
  }, [opportunity, rewardAsset])

  const totalStakingValue = useMemo(() => {
    if (!opportunity) return

    return fromBaseUnit(opportunity?.stakedAmountCryptoBaseUnit, underlyingAsset?.precision ?? 0)
  }, [opportunity, underlyingAsset?.precision])

  const apy = useMemo(() => {
    if (!opportunity) return

    return opportunity.apy
  }, [opportunity])

  const nextEpochHuman = useMemo(() => {
    if (!periodFinish) return

    return formatSecondsToDuration(
      bnOrZero(periodFinish.toString())
        .minus(Date.now() / 1000)
        .toNumber(),
    )
  }, [periodFinish])

  if (!isFoxFarmingEnabled) return null

  return (
    <>
      <Divider mb={4} />
      <Box py={4} px={containerPaddingX}>
        <Flex sx={headerSx}>
          <Box mb={headerTitleMb} maxWidth={headerTitleMaxWidth}>
            <Heading as='h2' fontSize='2xl' display='flex' alignItems='center'>
              <CText as='span' me={2}>
                🧑‍🌾
              </CText>
              {translate('foxPage.foxFarming.title')}
              <Skeleton isLoaded={Boolean(!isOpportunityLoading && apy)} ml={2}>
                <Tag colorScheme='green' verticalAlign='middle'>
                  <Amount.Percent value={apy ?? ''} suffix='APY' />
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
                <Box width='100%'>
                  <Text
                    fontSize='md'
                    color='text.subtle'
                    translation='foxPage.foxFarming.totalClaimableRewards'
                  />

                  <Skeleton isLoaded={Boolean(!isOpportunityLoading && rewardsCryptoAmount)}>
                    <Amount.Crypto value={rewardsCryptoAmount} symbol={rewardAsset?.symbol ?? ''} />
                  </Skeleton>
                </Box>

                {rewardsCryptoAmount !== '0' && Boolean(rewardsCryptoAmount && rewardAsset) ? (
                  <Button onClick={handleClaimClick} colorScheme='gray' size='sm'>
                    {translate('common.claim')}
                  </Button>
                ) : null}
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
              <Skeleton isLoaded={Boolean(!isOpportunityLoading && totalStakingValue)}>
                <Amount.Crypto
                  fontSize='2xl'
                  value={totalStakingValue}
                  symbol={underlyingAsset?.symbol ?? ''}
                />
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
            <Skeleton isLoaded={Boolean(!isGetPeriodFinishLoading && nextEpochHuman)}>
              <CText fontSize='2xl'>{nextEpochHuman}</CText>
            </Skeleton>
          </Stack>
        </SimpleGrid>
      </Box>
    </>
  )
}
