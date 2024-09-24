import { Box, Button, Card, CardBody, Flex, Text } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import noop from 'lodash/noop'
import { useCallback } from 'react'
import { Amount } from 'components/Amount/Amount'
import { WatchAssetButton } from 'components/AssetHeader/WatchAssetButton'
import { AssetIcon } from 'components/AssetIcon'
import { ParsedHtml } from 'components/ParsedHtml/ParsedHtml'
import { PriceChart } from 'components/PriceChart/PriceChart'
import { markdownLinkToHTML } from 'lib/utils'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const assetPairProps = { showFirst: true }

export const CardWithSparkline: React.FC<{
  assetId: AssetId
  onClick: (assetId: AssetId) => void
}> = ({ assetId, onClick }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const selectedLocale = useAppSelector(selectSelectedLocale)
  useGetAssetDescriptionQuery({ assetId, selectedLocale }, { skip: !!asset?.description })
  const handleClick = useCallback(() => onClick(assetId), [assetId, onClick])

  const changePercent24Hr = marketData.changePercent24Hr

  if (!asset || !marketData) return null

  return (
    <Card height='352px' width='100%' borderRadius='xl' p={0} as={Button} onClick={handleClick}>
      <CardBody
        as={Flex}
        flexDirection='column'
        justifyContent='space-between'
        py={6}
        width='100%'
        height='100%'
      >
        <Box>
          <Flex width='100%' justify='space-between' mt={4}>
            <Flex alignItems='center' justifyContent='space-between' flexWrap='wrap' mb={4}>
              <Flex align='center' mb={2}>
                <AssetIcon pairProps={assetPairProps} assetId={assetId} size='md' mr={3} />
                <Box textAlign='left'>
                  <Text fontWeight='bold' fontSize='lg'>
                    {asset.name}
                  </Text>
                  <Text fontSize='sm' color='gray.500'>
                    {asset.symbol}
                  </Text>
                  <Amount.Fiat value={marketData.price} fontWeight='bold' fontSize='2xl' />
                  <Flex align='center' mt={1}>
                    <Amount.Percent
                      autoColor
                      value={bnOrZero(changePercent24Hr).times(0.01).toString()}
                      fontWeight='medium'
                    />
                  </Flex>
                </Box>
              </Flex>
            </Flex>
            <WatchAssetButton assetId={assetId} />
          </Flex>
          <Box mb={4} overflow='hidden' textAlign='left'>
            <Text
              fontSize='sm'
              color='gray.500'
              lineHeight='19px'
              whiteSpace='break-spaces'
              noOfLines={3}
            >
              <ParsedHtml
                color='text.subtle'
                innerHtml={markdownLinkToHTML(asset.description || '')}
              />
            </Text>
          </Box>
        </Box>
        <Box height='50%' m={-6}>
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
