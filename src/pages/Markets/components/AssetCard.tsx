import { Box, Card, CardBody, Flex, Text } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetCardProps = {
  assetId: AssetId
  onClick: (assetId: AssetId) => void
}

export const AssetCard: React.FC<AssetCardProps> = ({ assetId, onClick }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const changePercent24Hr = marketData.changePercent24Hr

  const handleClick = useCallback(() => onClick(assetId), [assetId, onClick])

  if (!asset) return null

  return (
    <Card height='180px' width='100%' borderRadius='xl' onClick={handleClick}>
      <CardBody display='flex' flexDirection='column' justifyContent='space-between' p={4}>
        <Flex align='center' mb={4}>
          <AssetIcon src={asset.icon} boxSize='40px' mr={3} />
          <Box>
            <Text fontWeight='bold' fontSize='lg'>
              {asset.name}
            </Text>
            <Text fontSize='sm' color='gray.500'>
              {asset.symbol}
            </Text>
          </Box>
        </Flex>
        <Box>
          <Amount.Fiat value={marketData.price} fontWeight='bold' fontSize='2xl' />
          <Flex align='center' mt={1}>
            <Amount.Percent
              autoColor
              value={bnOrZero(changePercent24Hr).times(0.01).toString()}
              fontWeight='medium'
            />
          </Flex>
        </Box>
      </CardBody>
    </Card>
  )
}
