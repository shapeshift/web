import {
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Tag,
  useColorModeValue,
} from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'
import { makeDefiProviderDisplayName } from 'state/slices/opportunitiesSlice/utils'
import { selectAssetById, selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const scrollSnapAlign = { base: 'center', md: 'start' }
const cardBorderRadius = { base: 'xl' }

export const FeaturedCard: React.FC<StakingEarnOpportunityType> = opportunity => {
  const {
    underlyingAssetIds,
    assetId,
    opportunityName,
    apy,
    icons,
    provider,
    type,
    chainId,
    contractAddress,
    rewardAddress,
    version,
  } = opportunity
  const translate = useTranslate()
  const location = useLocation()
  const history = useHistory()
  const textShadow = useColorModeValue('0 2px 2px rgba(255,255,255,.5)', '0 2px 2px rgba(0,0,0,.3)')
  const hoverBgColor = useColorModeValue('gray.100', 'gray.900')

  const cardHover = useMemo(
    () => ({
      bg: hoverBgColor,
    }),
    [hoverBgColor],
  )

  const backgroundIcons = useMemo(() => {
    return underlyingAssetIds.map(assetId => (
      <AssetIcon size='2xl' key={assetId} assetId={assetId} />
    ))
  }, [underlyingAssetIds])

  const assets = useAppSelector(selectAssets)
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const assetName = asset?.name ?? ''
  const providerDisplayName = makeDefiProviderDisplayName({ provider, assetName })

  const handleClick = useCallback(() => {
    const { assetNamespace, assetReference } = fromAssetId(assetId)
    trackOpportunityEvent(
      MixPanelEvent.ClickOpportunity,
      {
        opportunity,
        element: 'Featured Card',
      },
      assets,
    )

    if (provider === DefiProvider.rFOX) {
      return history.push('/rfox')
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
        rewardId: rewardAddress,
        modal: 'overview',
      }),
      state: { background: location },
    })
  }, [
    assetId,
    assets,
    chainId,
    contractAddress,
    history,
    location,
    opportunity,
    provider,
    rewardAddress,
    type,
  ])

  const subText = [provider as string]
  if (version) subText.push(version)
  return (
    <Card
      position='relative'
      scrollSnapAlign={scrollSnapAlign}
      overflow='hidden'
      display='flex'
      flexDir='column'
      flex={1}
      width='full'
      transitionProperty='common'
      transitionDuration='normal'
      borderRadius={cardBorderRadius}
      _hover={cardHover}
    >
      <Box filter='blur(30px)' opacity='0.2' position='absolute' left='-10%' top='-10%'>
        {backgroundIcons}
      </Box>
      <CardHeader display='flex' justifyContent='space-between' alignItems='center' gap={4}>
        <PairIcons showFirst={true} icons={icons ?? []} iconSize='sm' bg='transparent' />
        <Tag mt={2} textTransform='capitalize'>
          {providerDisplayName}
        </Tag>
      </CardHeader>
      <CardBody py={0}>
        <RawText fontWeight='bold' textShadow={textShadow}>
          {opportunityName}
        </RawText>

        <RawText fontSize='sm' color='text.subtle'>
          {subText.join(' • ')}
        </RawText>
      </CardBody>
      <CardFooter display='flex' flexDir='column' mt='auto'>
        {apy ? <Amount.Percent value={apy} fontSize='2xl' autoColor suffix='APY' /> : null}
        <Button
          mt={4}
          variant='ghost-filled'
          colorScheme='blue'
          onClick={handleClick}
          data-test={`eligible-${provider}-${assetId}-button`}
        >
          {translate('defi.startEarning')}
        </Button>
      </CardFooter>
    </Card>
  )
}
