import { Box, Card, CardBody, Flex, Image, Text } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { Amount } from 'components/Amount/Amount'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetCardProps = {
  asset: Asset
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, asset.assetId),
  )
  const changePercent24Hr = marketData.changePercent24Hr

  return (
    <Card height='180px' width='100%' borderRadius='xl'>
      <CardBody display='flex' flexDirection='column' justifyContent='space-between' p={4}>
        <Flex align='center' mb={4}>
          <Image src={asset.icon} alt={asset.name} boxSize='40px' mr={3} />
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
