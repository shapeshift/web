import { Button, Flex } from '@chakra-ui/react'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { LpEarnOpportunityType, OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ArkeoCard } from './ArkeoCard'

type LpCardProps = {
  onClick: (opportunityId: OpportunityId) => void
} & LpEarnOpportunityType

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
    return underlyingAssetIds.map(assetId => <AssetIcon _last={{ ml: -4 }} assetId={assetId} />)
  }, [underlyingAssetIds])

  const { title, body, cta } = (() => {
    switch (provider) {
      case DefiProvider.FoxFarming:
        return {
          title: 'arkeo.foxEthProviders.title',
          body: 'arkeo.foxEthProviders.body',
          cta: 'arkeo.foxEthProviders.cta',
        }
      case DefiProvider.Osmosis:
        return {
          title: 'arkeo.atomOsmoProviders.title',
          body: 'arkeo.atomOsmoProviders.body',
          cta: 'arkeo.atomOsmoProviders.cta',
        }
      default:
        return {
          title: 'arkeo.lp.title',
          body: 'arkeo.lp.body',
          cta: 'arkeo.lp.cta',
        }
    }
  })()
  return (
    <ArkeoCard>
      <Card.Body display='flex' flexDir='column' gap={4} height='100%'>
        <Flex>{renderPairIcons}</Flex>
        <Text
          fontSize='xl'
          fontWeight='bold'
          translation={[title, { asset1: asset1?.symbol, asset2: asset2?.symbol }]}
        />
        <Text
          color='gray.500'
          translation={[
            body,
            { asset1: asset1?.symbol, asset2: asset2?.symbol, apy: `${opportunityApy}%` },
          ]}
        />
        <Button
          width='full'
          colorScheme='blue'
          mt='auto'
          onClick={() => onClick((opportunity.id ?? opportunity.assetId) as OpportunityId)}
        >
          {translate(cta)}
        </Button>
      </Card.Body>
    </ArkeoCard>
  )
}
