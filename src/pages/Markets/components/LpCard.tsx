import { Box, Card, CardBody, Flex, Text } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type LpCardProps = {
  assetId: AssetId
  apy: string
  volume24H: string
}

const pairProps = { showFirst: true }

export const LpCard: React.FC<LpCardProps> = ({ assetId, apy, volume24H }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) return null

  return (
    <Card height='180px' width='100%' borderRadius='xl'>
      <CardBody display='flex' flexDirection='column' justifyContent='space-between' p={4}>
        <Flex align='center' mb={4}>
          <AssetIcon assetId={asset.assetId} pairProps={pairProps} />
          <Box>
            <Text fontWeight='bold' fontSize='lg'>
              {asset.name}
            </Text>
            <Text fontSize='sm' color='gray.500'>
              {asset.symbol}
            </Text>
          </Box>
        </Flex>
        <Flex justify='space-between'>
          <Box>
            <Amount.Percent
              autoColor
              value={bnOrZero(apy).times(0.01).toString()}
              fontWeight='medium'
            />
            <Text fontSize='sm' color='gray.500'>
              APY
            </Text>
          </Box>
          <Box textAlign='right'>
            <Amount.Fiat fontWeight='bold' fontSize='xl' value={volume24H} />
            <Text fontSize='sm' color='gray.500'>
              24h Volume
            </Text>
          </Box>
        </Flex>
      </CardBody>
    </Card>
  )
}
