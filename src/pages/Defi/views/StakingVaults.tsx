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
import { ethAssetId, ethChainId, foxAssetId } from '@keepkey/caip'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { UNISWAP_V2_WETH_FOX_POOL_ADDRESS } from 'features/defi/providers/fox-eth-lp/constants'
import { FOX_FARMING_V4_CONTRACT_ADDRESS } from 'features/defi/providers/fox-farming/constants'
import { FOX_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import { useFarmingApr } from 'plugins/foxPage/hooks/useFarmingApr'
import { useLpApr } from 'plugins/foxPage/hooks/useLpApr'
import qs from 'qs'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { AllEarnOpportunities } from 'components/StakingVaults/AllEarnOpportunities'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectFeatureFlags } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const DefiHeader = () => {
  const translate = useTranslate()
  return (
    <Box>
      <Heading>{translate('defi.defi')}</Heading>
    </Box>
  )
}

const FoxFarmCTA = () => {
  const translate = useTranslate()
  const history = useHistory()
  const location = useLocation()
  const featureFlags = useAppSelector(selectFeatureFlags)
  const { farmingAprV4, isFarmingAprV4Loaded } = useFarmingApr({ skip: !featureFlags.FoxFarming })
  const { lpApr, isLpAprLoaded } = useLpApr({ skip: !featureFlags.FoxLP })
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
                value={bnOrZero(farmingAprV4)
                  .plus(lpApr ?? 0)
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
