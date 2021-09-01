import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  AvatarProps,
  Box,
  Circle,
  Divider,
  Flex,
  FlexProps,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { AssetIcon } from 'components/AssetIcon'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'

type AssetToAssetProps = {
  sellAsset: {
    symbol: string
    amount: Number
    icon: string
  }
  buyAsset: {
    symbol: string
    amount: Number
    icon: string
  } & Pick<AvatarProps, 'boxSize'>
} & FlexProps

export const AssetToAsset = ({
  sellAsset,
  buyAsset,
  boxSize = '24px',
  ...rest
}: AssetToAssetProps) => {
  const sellAssetColor = '#F7931A'
  const buyAssetColor = '#2775CA'
  const {
    number: { toCrypto }
  } = useLocaleFormatter({ fiatType: 'USD' })
  return (
    <Flex width='full' justifyContent='space-between' {...rest}>
      <Box flex={1}>
        <Flex alignItems='center'>
          <AssetIcon src={sellAsset.icon} boxSize={boxSize} />
          <Divider flex={1} bgColor={sellAssetColor} />
        </Flex>
        <Box mt={2}>
          <Text fontWeight='medium'>{toCrypto(Number(sellAsset.amount), sellAsset.symbol)}</Text>
          <Text color='gray.500'>$1.01</Text>
        </Box>
      </Box>
      <Flex>
        <Circle
          size={boxSize}
          bg='blue.500'
          p='1px'
          background={`linear-gradient(to right, ${sellAssetColor}, ${buyAssetColor})`}
        >
          <Circle bg={useColorModeValue('white', 'gray.750')} w='100%' h='100%'>
            <ArrowForwardIcon />
          </Circle>
        </Circle>
      </Flex>
      <Flex flexDir='column' flex={1}>
        <Flex alignItems='center' flex={1} justify='flex-start'>
          <Divider flex={1} bgColor={buyAssetColor} />
          <AssetIcon src={buyAsset.icon} boxSize={boxSize} />
        </Flex>
        <Box textAlign='right' mt={2}>
          <Text fontWeight='medium'>{toCrypto(Number(buyAsset.amount), buyAsset.symbol)}</Text>
          <Text color='gray.500'>$1.01</Text>
        </Box>
      </Flex>
    </Flex>
  )
}
