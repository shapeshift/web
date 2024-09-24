import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  GridItem,
  Text as CText,
  Tooltip,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { WatchAssetButton } from 'components/AssetHeader/WatchAssetButton'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectStakingOpportunityByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CardWithSparkline } from './CardWithSparkline'

const rowSpanSparklineSx = { base: 1, md: 2 }
const colSpanSparklineSx = { base: 1, md: 3 }
const colSpanSx = { base: 1, md: 2 }

type LpCardProps = {
  assetId: AssetId
  apy: string
  volume24H: string
  onClick: (assetId: AssetId) => void
}

const pairProps = { showFirst: true }

export const LpCard: React.FC<LpCardProps> = ({ assetId, apy, volume24H, onClick }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const handleClick = useCallback(() => onClick(assetId), [assetId, onClick])

  if (!asset) return null

  return (
    <Card height='168px' width='100%' borderRadius='xl' p={0} as={Button} onClick={handleClick}>
      <CardBody
        as={Flex}
        flexDirection='column'
        justifyContent='space-between'
        p={2}
        width='100%'
        height='100%'
      >
        <Flex align='center' mb={4}>
          <AssetIcon assetId={asset.assetId} pairProps={pairProps} flexShrink={0} />
          <Box textAlign='left' ml={3} overflow='hidden' width='100%'>
            <Tooltip label={asset.name} placement='top-start'>
              <CText
                fontWeight='bold'
                fontSize='lg'
                whiteSpace='nowrap'
                textOverflow='ellipsis'
                overflow='hidden'
                width='100%'
              >
                {asset.name}
              </CText>
            </Tooltip>
            <Tooltip label={asset.symbol} placement='bottom-start'>
              <CText
                fontSize='sm'
                color='gray.500'
                whiteSpace='nowrap'
                textOverflow='ellipsis'
                overflow='hidden'
                width='100%'
              >
                {asset.symbol}
              </CText>
            </Tooltip>
          </Box>
          <WatchAssetButton assetId={assetId} />
        </Flex>
        <Flex justify='space-between'>
          <Box textAlign='left'>
            <Amount.Percent
              autoColor
              value={bnOrZero(apy).times(0.01).toString()}
              fontWeight='medium'
            />
            <Text translation='common.apy' fontSize='sm' color='gray.500' />
          </Box>
          <Box textAlign='right'>
            {bnOrZero(volume24H).isPositive() ? (
              <Amount.Fiat fontWeight='bold' fontSize='md' value={volume24H} />
            ) : (
              <CText fontSize='sm' color='gray.500'>
                N/A
              </CText>
            )}
            <Text
              translation='assets.assetDetails.assetHeader.24HrVolume'
              fontSize='sm'
              color='gray.500'
            />
          </Box>
        </Flex>
      </CardBody>
    </Card>
  )
}

export const LpGridItem = ({
  assetId,
  apy: _apy,
  volume,
  onClick,
  index,
}: {
  assetId: AssetId
  apy: string | undefined
  volume: string | undefined
  onClick: (assetId: AssetId) => void
  index: number
}) => {
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const volume24H = volume ?? marketData?.volume ?? 0

  // TODO(gomes): remove weird branching between THOR and Portals - Portals assets should be upserted as a DeFi Opportunity, so we can select them from the same slice
  const opportunityMetadataFilter = useMemo(() => ({ assetId }), [assetId])
  const opportunityData = useAppSelector(state =>
    selectStakingOpportunityByFilter(state, opportunityMetadataFilter),
  )

  const apy =
    _apy ??
    bnOrZero(opportunityData?.apy)
      .times(100)
      .toString()

  if (index === 0) {
    return (
      <GridItem rowSpan={rowSpanSparklineSx} colSpan={colSpanSparklineSx}>
        <CardWithSparkline assetId={assetId} onClick={onClick} />
      </GridItem>
    )
  } else {
    return (
      <GridItem colSpan={colSpanSx}>
        <LpCard assetId={assetId} apy={apy ?? '0'} volume24H={volume24H ?? '0'} onClick={onClick} />
      </GridItem>
    )
  }
}
