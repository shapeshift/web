import { Box, Card, CardBody, Flex, Link, Text } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import noop from 'lodash/noop'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { ParsedHtml } from 'components/ParsedHtml/ParsedHtml'
import { PriceChart } from 'components/PriceChart/PriceChart'
import { markdownLinkToHTML } from 'lib/utils'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const CardWithSparkline: React.FC<{
  assetId: AssetId
  onClick: (assetId: AssetId) => void
}> = ({ assetId, onClick: handleClick }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  if (!asset || !marketData) return null

  const changePercent24Hr = marketData.changePercent24Hr

  return (
    <Card height='380px' width='100%' borderRadius='xl' onClick={() => handleClick(assetId)}>
      <CardBody display='flex' flexDirection='column' justifyContent='space-between' p={4}>
        <Flex align='center' mb={2}>
          <AssetIcon assetId={assetId} size='md' mr={3} />
          <Box>
            <Text fontWeight='bold' fontSize='lg'>
              {asset.name}
            </Text>
            <Text fontSize='sm' color='gray.500'>
              {asset.symbol}
            </Text>
          </Box>
        </Flex>
        <Box mb={2}>
          <Amount.Fiat value={marketData.price} fontWeight='bold' fontSize='2xl' />
          <Flex align='center' mt={1}>
            <Amount.Percent
              autoColor
              value={bnOrZero(changePercent24Hr).times(0.01).toString()}
              fontWeight='medium'
            />
          </Flex>
        </Box>
        <Box mb={4} flex={1} overflow='hidden'>
          <Text fontSize='sm' color='gray.500' noOfLines={3}>
            <ParsedHtml
              color='text.subtle'
              innerHtml={markdownLinkToHTML(asset.description || '')}
            />
          </Text>
        </Box>
        <Box height='120px'>
          <PriceChart
            assetId={assetId}
            timeframe={HistoryTimeframe.DAY}
            percentChange={changePercent24Hr}
            setPercentChange={noop}
            chartHeight='120px'
            hideAxis={true}
          />
        </Box>
      </CardBody>
    </Card>
  )
}
