import { Box, Button, Card, CardBody, Flex, Text as CText, Tooltip } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { Amount } from 'components/Amount/Amount'
import { WatchAssetButton } from 'components/AssetHeader/WatchAssetButton'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetCardProps = {
  assetId: AssetId
  onClick: (assetId: AssetId) => void
  showMarketCap?: boolean
}

export const AssetCard: React.FC<AssetCardProps> = ({ assetId, showMarketCap, onClick }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const changePercent24Hr = marketData.changePercent24Hr

  const handleClick = useCallback(() => onClick(assetId), [assetId, onClick])

  if (!asset) return null

  return (
    <Card as={Button} height='168px' width='100%' borderRadius='xl' p={0} onClick={handleClick}>
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
          <AssetIcon assetId={asset.assetId} boxSize='40px' mr={3} />
          <Box textAlign='left' overflow='hidden' width='100%'>
            <Tooltip label={asset.name} placement='top-start'>
              <CText fontWeight='bold' fontSize='lg' textOverflow='ellipsis' overflow='hidden'>
                {asset.name}
              </CText>
            </Tooltip>
            <CText
              fontSize='sm'
              color='text.subtle'
              textOverflow='ellipsis'
              overflow='hidden'
              mt={1}
            >
              {asset.symbol}
            </CText>
          </Box>
          <WatchAssetButton assetId={assetId} alignSelf='flex-start' />
        </Flex>
        <Flex justify='space-between'>
          <Box textAlign='left'>
            <Amount.Fiat value={marketData.price} fontWeight='bold' fontSize='2xl' />
            <Amount.Percent
              autoColor
              value={bnOrZero(changePercent24Hr).times(0.01).toString()}
              fontWeight='medium'
              mt={1}
            />
          </Box>
          {showMarketCap && (
            <Box textAlign='right'>
              {bnOrZero(marketData.marketCap).isPositive() ? (
                <Amount.Fiat fontWeight='bold' fontSize='2xl' value={marketData.marketCap} />
              ) : (
                <CText fontWeight='bold' fontSize='2xl'>
                  N/A
                </CText>
              )}
              <Text translation='dashboard.portfolio.marketCap' color='text.subtle' mt={1} />
            </Box>
          )}
        </Flex>
      </CardBody>
    </Card>
  )
}
