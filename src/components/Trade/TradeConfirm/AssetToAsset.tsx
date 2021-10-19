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
import { BigNumber } from 'lib/bignumber/bignumber'

type AssetToAssetProps = {
  sellAsset: TradeAsset
  buyAsset: TradeAsset & Pick<AvatarProps, 'boxSize'>
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
    number: { toCrypto, toFiat }
  } = useLocaleFormatter({ fiatType: 'USD' })
  return (
    <Flex width='full' justifyContent='space-between' {...rest}>
      <Box flex={1}>
        <Flex alignItems='center'>
          <AssetIcon src={sellAsset.currency.icon} boxSize={boxSize} />
          <Divider flex={1} bgColor={sellAssetColor} />
        </Flex>
        <Box mt={2}>
          <Text fontWeight='medium'>
            {toCrypto(Number(sellAsset.amount), sellAsset.currency.symbol)}
          </Text>
          <Text color='gray.500'>
            {toFiat(new BigNumber(sellAsset.amount).times(sellAsset.fiatRate).toNumber())}
          </Text>
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
          <AssetIcon src={buyAsset.currency.icon} boxSize={boxSize} />
        </Flex>
        <Box textAlign='right' mt={2}>
          <Text fontWeight='medium'>
            {toCrypto(Number(buyAsset.amount), buyAsset.currency.symbol)}
          </Text>
          <Text color='gray.500'>
            {toFiat(new BigNumber(sellAsset.amount).times(sellAsset.fiatRate))}
          </Text>
        </Box>
      </Flex>
    </Flex>
  )
}
