import { Box, Card, CardBody, Flex, Image, Text } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { Amount } from 'components/Amount/Amount'
import { bnOrZero } from 'lib/bignumber/bignumber'

type LpCardProps = {
  asset: Asset
  apy: string
  volume24H: string
}

export const LpCard: React.FC<LpCardProps> = ({ asset, apy, volume24H }) => {
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
        <Flex justify='space-between'>
          <Box>
            <Amount.Percent value={bnOrZero(apy).times(0.01).toString()} fontWeight='medium' />
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
