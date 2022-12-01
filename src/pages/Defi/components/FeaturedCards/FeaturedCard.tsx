import { Box, Flex, Tag, useColorModeValue } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
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
  tvl,
  icons,
  provider,
  chainId,
  contractAddress,
  highestBalanceAccountAddress,
  rewardAddress,
  version,
}) => {
  const location = useLocation()
  const history = useHistory()
  const hoverBorderColor = useColorModeValue('blue.500', 'blue.200')
  const textShadow = useColorModeValue('0 2px 2px rgba(255,255,255,.5)', '0 2px 2px rgba(0,0,0,.3)')
  const hoverBgColor = useColorModeValue('gray.100', 'gray.900')
  const bgIcons = useMemo(() => {
    return underlyingAssetIds.map(assetId => <AssetIcon size='2xl' assetId={assetId} />)
  }, [underlyingAssetIds])

  const handleClick = useCallback(() => {
    const assetReference = fromAssetId(assetId).assetReference

    history.push({
      pathname: `/defi/earn`,
      search: qs.stringify({
        provider,
        chainId,
        contractAddress,
        assetReference,
        highestBalanceAccountAddress: highestBalanceAccountAddress ?? '',
        rewardId: rewardAddress,
        modal: 'overview',
      }),
      state: { background: location },
    })
  }, [
    assetId,
    chainId,
    contractAddress,
    highestBalanceAccountAddress,
    history,
    location,
    provider,
    rewardAddress,
  ])
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
      onClick={handleClick}
      _hover={{
        borderColor: hoverBorderColor,
        cursor: 'pointer',
        bg: hoverBgColor,
      }}
    >
      <Box filter='blur(30px)' opacity='0.2' position='absolute' left='-10%' top='-10%'>
        {bgIcons}
      </Box>
      <Card.Header display='flex' justifyContent='space-between' alignItems='center' gap={4}>
        <PairIcons icons={icons ?? []} iconSize='sm' bg='transparent' />
        <Tag mt={2}>{provider}</Tag>
      </Card.Header>
      <Card.Body py={0}>
        <RawText fontWeight='bold' textShadow={textShadow}>
          {opportunityName}
        </RawText>
        <RawText fontSize='sm' color='gray.500'>
          {version}
        </RawText>
      </Card.Body>
      <Card.Footer display='flex' flexDir='column' mt='auto'>
        <Amount.Percent value={apy} fontSize='2xl' autoColor suffix='APY' />
        <Flex fontSize='sm' gap={1} color='gray.500'>
          <RawText>Current TVL</RawText>
          <Amount.Fiat value={tvl} fontWeight='bold' />
        </Flex>
      </Card.Footer>
    </Card>
  )
}
