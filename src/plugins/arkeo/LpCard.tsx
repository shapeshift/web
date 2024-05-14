import { Button, CardBody, Flex } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { LpEarnOpportunityType, OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'
import { selectAssetById } from 'state/selectors'
import { useAppSelector } from 'state/store'

import { ArkeoCard } from './ArkeoCard'

type LpCardProps = {
  onClick: (opportunityId: OpportunityId) => void
} & LpEarnOpportunityType

const assetIconLast = { ml: -4 }

export const LpCard: React.FC<LpCardProps> = props => {
  const translate = useTranslate()
  const { onClick, ...opportunity } = props
  const { apy, underlyingAssetIds, provider } = opportunity
  const asset1Id = underlyingAssetIds[0]
  const asset2Id = underlyingAssetIds[1]
  const asset1 = useAppSelector(state => selectAssetById(state, asset1Id ?? ''))
  const asset2 = useAppSelector(state => selectAssetById(state, asset2Id ?? ''))
  const opportunityApy = bnOrZero(apy).times(100).toFixed(2)
  const renderPairIcons = useMemo(() => {
    return underlyingAssetIds.map(assetId => (
      <AssetIcon key={assetId} _last={assetIconLast} assetId={assetId} />
    ))
  }, [underlyingAssetIds])

  const { title, body, cta } = (() => {
    switch (provider) {
      case DefiProvider.UniV2:
        return {
          title: 'arkeo.foxEthProviders.title',
          body: 'arkeo.foxEthProviders.body',
          cta: 'arkeo.foxEthProviders.cta',
        }
      default:
        return {
          title: 'arkeo.lp.title',
          body: 'arkeo.lp.body',
          cta: 'arkeo.lp.cta',
        }
    }
  })()

  const lpCardTitle: TextPropTypes['translation'] = useMemo(
    () => [title, { asset1: asset1?.symbol, asset2: asset2?.symbol }],
    [title, asset1, asset2],
  )
  const lpCardBody: TextPropTypes['translation'] = useMemo(
    () => [body, { asset1: asset1?.symbol, asset2: asset2?.symbol, apy: `${opportunityApy}%` }],
    [body, asset1, asset2, opportunityApy],
  )

  const handleClick = useCallback(() => onClick(opportunity.id), [onClick, opportunity.id])

  return (
    <ArkeoCard>
      <CardBody display='flex' flexDir='column' gap={4} height='100%'>
        <Flex>{renderPairIcons}</Flex>
        <Text fontSize='xl' fontWeight='bold' translation={lpCardTitle} />
        <Text color='text.subtle' translation={lpCardBody} />
        <Button width='full' colorScheme='blue' mt='auto' onClick={handleClick}>
          {translate(cta)}
        </Button>
      </CardBody>
    </ArkeoCard>
  )
}
