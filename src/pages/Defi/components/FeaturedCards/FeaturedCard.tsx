import { Box } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { RawText } from 'components/Text'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

export const FeaturedCard: React.FC<StakingEarnOpportunityType> = ({
  underlyingAssetIds,
  opportunityName,
  apy,
}) => {
  const renderIcons = useMemo(() => {
    return underlyingAssetIds.map(assetId => <AssetIcon size='sm' assetId={assetId} />)
  }, [underlyingAssetIds])
  const bgIcons = useMemo(() => {
    return underlyingAssetIds.map(assetId => <AssetIcon size='2xl' assetId={assetId} />)
  }, [underlyingAssetIds])
  return (
    <Card flex='0 0 25%' overflow='hidden' position='relative' display='flex' flexDir='column'>
      <Box filter='blur(30px)' opacity='0.2' position='absolute' right='-10%' top='-10%'>
        {bgIcons}
      </Box>
      <Card.Header display='flex' justifyContent='space-between' alignItems='center'>
        <RawText fontWeight='bold' textShadow='0 2px 5px rgba(0,0,0,.8)'>
          {opportunityName}
        </RawText>
        {renderIcons}
      </Card.Header>
      <Card.Body py={0}>
        <RawText>Current APY</RawText>
        <Amount.Percent value={apy} fontSize='2xl' autoColor />
      </Card.Body>
      <Card.Footer display='flex' justifyContent='space-between' mt='auto'>
        <RawText fontSize='sm' color='gray.500'>
          Current TVL
        </RawText>
        <Amount.Fiat value={211} fontSize='sm' fontWeight='medium' />
      </Card.Footer>
    </Card>
  )
}
