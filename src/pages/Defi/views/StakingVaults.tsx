import {
  Box,
  Flex,
  Heading,
  Link,
  Skeleton,
  Stack,
  Text as CText,
  useColorModeValue,
} from '@chakra-ui/react'
import { ethAssetId, ethChainId, foxAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { UNISWAP_V2_WETH_FOX_POOL_ADDRESS } from 'features/defi/providers/fox-eth-lp/constants'
import { FOX_FARMING_V4_CONTRACT_ADDRESS } from 'features/defi/providers/fox-farming/constants'
import { FOX_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import qs from 'qs'
import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { AllEarnOpportunities } from 'components/StakingVaults/AllEarnOpportunities'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { GetFoxFarmingContractMetricsReturn } from 'state/slices/foxEthSlice/foxEthSlice'
import { foxEthApi } from 'state/slices/foxEthSlice/foxEthSlice'
import {
  selectAccountIdsByAssetId,
  selectAssetById,
  selectFeatureFlags,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

const DefiHeader = () => {
  const translate = useTranslate()
  return (
    <Box>
      <Heading>{translate('defi.defi')}</Heading>
    </Box>
  )
}

const FoxFarmCTA = () => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const history = useHistory()
  const location = useLocation()

  const [lpApy, setLpApy] = useState<Nullable<string>>(null)
  const [farmingV4Data, setFarmingV4Data] =
    useState<Nullable<GetFoxFarmingContractMetricsReturn>>(null)
  const [isLpAprLoaded, setIsLpAprLoaded] = useState<boolean>(false)
  const [isFarmingAprV4Loaded, setIsFarmingAprV4Loaded] = useState<boolean>(false)

  const ethAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: ethAssetId }),
  )

  useEffect(() => {
    ;(async () => {
      if (!ethAccountIds?.length) return

      const ethAccountAddresses = ethAccountIds.map(accountId => fromAccountId(accountId).account)

      const metricsPromises = await Promise.all(
        ethAccountAddresses.map(
          async accountAddress =>
            await dispatch(
              foxEthApi.endpoints.getFoxEthLpMetrics.initiate({
                accountAddress,
              }),
            ),
        ),
      )

      // To get the APY, we need to fire the metrics requests for all accounts
      // However, it doesn't matter which account we introspect - it's going to be the same for all accounts
      const { isLoading, isSuccess, data } = metricsPromises[0]

      if (isLoading || !data) return

      if (isSuccess) {
        setLpApy(data.apy)
        setIsLpAprLoaded(true)
      }
    })()
  }, [ethAccountIds, dispatch])

  useEffect(() => {
    ;(async () => {
      if (!ethAccountIds?.length) return

      const ethAccountAddresses = ethAccountIds.map(accountId => fromAccountId(accountId).account)

      const metricsPromises = await Promise.all(
        ethAccountAddresses.map(
          async accountAddress =>
            await dispatch(
              foxEthApi.endpoints.getFoxFarmingContractMetrics.initiate({
                contractAddress: FOX_FARMING_V4_CONTRACT_ADDRESS,
                accountAddress,
              }),
            ),
        ),
      )

      // To get the FOX farming contract metrics data, it doesn't matter which account we introspect - it's going to be the same for all accounts
      const { isLoading, isSuccess, data } = metricsPromises[0]

      if (isLoading || !data) return

      if (isSuccess) {
        setFarmingV4Data(data)
        setIsFarmingAprV4Loaded(true)
      }
    })()
  }, [ethAccountIds, dispatch])

  const featureFlags = useAppSelector(selectFeatureFlags)
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const { icon: ethAssetIcon } = ethAsset
  const { icon: foxAssetIcon } = foxAsset
  const hoverBg = useColorModeValue('gray.100', 'gray.750')

  const handleClick = useCallback(() => {
    if (!(featureFlags.FoxLP && featureFlags.FoxFarming)) {
      window.location.replace('https://fox.shapeshift.com/fox-farming')
      return
    }
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        provider: DefiProvider.FoxFarming,
        chainId: ethChainId,
        contractAddress: FOX_FARMING_V4_CONTRACT_ADDRESS,
        assetReference: UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
        rewardId: FOX_TOKEN_CONTRACT_ADDRESS,
        modal: 'overview',
      }),
      state: { background: location },
    })
  }, [history, location, featureFlags.FoxFarming, featureFlags.FoxLP])

  return (
    <Card variant='outline' my={1}>
      <Stack
        as={Link}
        onClick={handleClick}
        direction={{ base: 'column', xl: 'row' }}
        alignItems='center'
        justifyContent='space-between'
        _hover={{ textDecoration: 'none', bgColor: hoverBg }}
        px={{ base: 3, md: 4 }}
        py={4}
      >
        <Flex alignItems='center' mb={{ base: 2, sm: 0 }}>
          <RawText
            alignSelf='flex-end'
            lineHeight={'1.1'}
            fontSize={{ base: 25, sm: 30 }}
            zIndex={1}
          >
            🚜
          </RawText>
          <AssetIcon ml={-3} p={0.5} boxSize='40px' src={ethAssetIcon} />
          <AssetIcon ml={-2} boxSize='40px' src={foxAssetIcon} />
          <CText ml='5' fontWeight='normal' fontSize={{ base: 'md', md: 'lg' }}>
            {translate('defi.clickHereToEarn')}
            <span> </span>
            <Skeleton display='inline-block' isLoaded={isFarmingAprV4Loaded && isLpAprLoaded}>
              <Amount.Percent
                as='span'
                value={bnOrZero(farmingV4Data?.apy)
                  .plus(lpApy ?? 0)
                  .toString()}
              />
            </Skeleton>
            {translate('defi.byFarming')}
          </CText>
        </Flex>
      </Stack>
    </Card>
  )
}

export const StakingVaults = () => {
  return (
    <Main titleComponent={<DefiHeader />}>
      <FoxFarmCTA />
      <AllEarnOpportunities />
    </Main>
  )
}
