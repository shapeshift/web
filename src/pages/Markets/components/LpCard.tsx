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

import { colSpanSx } from '../constants'

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
        py={5}
        px={5}
        width='100%'
        height='100%'
      >
        <Flex align='center'>
          <AssetIcon assetId={asset.assetId} pairProps={pairProps} flexShrink={0} mr={3} />
          <Box textAlign='left' overflow='hidden' width='100%'>
            <Tooltip label={asset.name} placement='top-start'>
              <CText
                fontWeight='bold'
                fontSize='lg'
                whiteSpace='nowrap'
                textOverflow='ellipsis'
                overflow='hidden'
                width='100%'
                mb={1}
              >
                {asset.name}
              </CText>
            </Tooltip>
            <Tooltip label={asset.symbol} placement='bottom-start'>
              <CText
                fontSize='sm'
                color='text.subtle'
                whiteSpace='nowrap'
                textOverflow='ellipsis'
                overflow='hidden'
                width='100%'
              >
                {asset.symbol}
              </CText>
            </Tooltip>
          </Box>
          <WatchAssetButton assetId={assetId} alignSelf='flex-start' />
        </Flex>
        <Flex justify='space-between'>
          <Box textAlign='left'>
            <Amount.Percent
              autoColor
              value={bnOrZero(apy).times(0.01).toString()}
              fontWeight='bold'
              fontSize='2xl'
              mb={1}
            />
            <Text translation='common.apy' color='text.subtle' />
          </Box>
          <Box textAlign='right'>
            {bnOrZero(volume24H).isPositive() ? (
              <Amount.Fiat fontWeight='bold' fontSize='2xl' value={volume24H} />
            ) : (
              <CText fontWeight='bold' fontSize='2xl'>
                N/A
              </CText>
            )}
            <Text
              translation='assets.assetDetails.assetHeader.24HrVolume'
              color='text.subtle'
              mt={1}
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

  return (
    <GridItem key={index} colSpan={colSpanSx}>
      <LpCard assetId={assetId} apy={apy ?? '0'} volume24H={volume24H ?? '0'} onClick={onClick} />
    </GridItem>
  )
}
