import { Box, Button, useColorModeValue } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { RawText } from 'components/Text'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

export const FeaturedCard: React.FC<StakingEarnOpportunityType> = ({
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
}) => {
  const translate = useTranslate()
  const location = useLocation()
  const history = useHistory()
  const textShadow = useColorModeValue('0 2px 2px rgba(255,255,255,.5)', '0 2px 2px rgba(0,0,0,.3)')
  const hoverBgColor = useColorModeValue('gray.100', 'gray.900')
  const backgroundIcons = useMemo(() => {
    return underlyingAssetIds.map(assetId => (
      <AssetIcon size='2xl' key={assetId} assetId={assetId} />
    ))
  }, [underlyingAssetIds])

  const handleClick = useCallback(() => {
    const { assetNamespace, assetReference } = fromAssetId(assetId)

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
  }, [assetId, chainId, contractAddress, history, location, provider, rewardAddress, type])

  const subText = [provider as string]
  if (version) subText.push(version)
  return (
    <Card
      position='relative'
      scrollSnapAlign={{ base: 'center', md: 'start' }}
      overflow='hidden'
      display='flex'
      flexDir='column'
      flex={1}
      width='full'
      transitionProperty='common'
      transitionDuration='normal'
      borderRadius={{ base: 'xl' }}
      _hover={{
        bg: hoverBgColor,
      }}
    >
      <Box filter='blur(30px)' opacity='0.2' position='absolute' left='-10%' top='-10%'>
        {backgroundIcons}
      </Box>
      <Card.Header display='flex' justifyContent='space-between' alignItems='center' gap={4}>
        <PairIcons icons={icons ?? []} iconSize='sm' bg='transparent' />
      </Card.Header>
      <Card.Body py={0}>
        <RawText fontWeight='bold' textShadow={textShadow}>
          {opportunityName}
        </RawText>

        <RawText fontSize='sm' color='gray.500'>
          {subText.join(' • ')}
        </RawText>
      </Card.Body>
      <Card.Footer display='flex' flexDir='column' mt='auto'>
        <Amount.Percent value={apy} fontSize='2xl' autoColor suffix='APY' />
        <Button
          mt={4}
          variant='ghost-filled'
          colorScheme='blue'
          onClick={handleClick}
          data-test={`eligible-${provider}-${assetId}-button`}
        >
          {translate('defi.startEarning')}
        </Button>
      </Card.Footer>
    </Card>
  )
}
