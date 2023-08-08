import { Box, Card, HStack, Image, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { Amount } from 'components/Amount/Amount'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AmountCardProps = {
  value: string
  assetId: AssetId
}

export const AmountCard = ({ assetId, value }: AmountCardProps) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const bgColor = useColorModeValue('white', 'gray.850')
  if (!asset) return null
  return (
    <Card bg={bgColor} py={4} pl={4} pr={2} borderRadius='md'>
      <HStack spacing={0}>
        <Box w={10} h={6} pr={4}>
          <Image borderRadius='full' w='full' h='full' src={asset.icon} />
        </Box>
        <Box flex={1}>
          <Amount.Crypto value={value} symbol={asset.symbol} />
        </Box>
      </HStack>
    </Card>
  )
}
