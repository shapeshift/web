import { ArrowForwardIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { Box, Circle, Divider, Flex, FlexProps, Text, useColorModeValue } from '@chakra-ui/react'
import { chainAdapters } from '@shapeshiftoss/types'
import { AssetIcon } from 'components/AssetIcon'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bn } from 'lib/bignumber/bignumber'

import { TradeAsset } from '../Trade'

type AssetToAssetProps = {
  sellAsset: TradeAsset
  buyAsset: TradeAsset
  status?: chainAdapters.TxStatus
} & FlexProps

export const AssetToAsset = ({
  sellAsset,
  buyAsset,
  boxSize = '24px',
  status,
  ...rest
}: AssetToAssetProps) => {
  const sellAssetColor = !status ? '#F7931A' : '#2775CA'
  const buyAssetColor = '#2775CA'
  const {
    number: { toCrypto, toFiat },
  } = useLocaleFormatter({ fiatType: 'USD' })
  const gray = useColorModeValue('white', 'gray.750')
  const red = useColorModeValue('white', 'red.500')
  const green = useColorModeValue('white', 'green.500')

  const renderIcon = () => {
    return status === chainAdapters.TxStatus.Confirmed ? (
      <Circle bg={green} size='100%'>
        <CheckIcon />
      </Circle>
    ) : status === chainAdapters.TxStatus.Failed ? (
      <Circle bg={red} size='100%'>
        <CloseIcon p={1} />
      </Circle>
    ) : (
      <Circle bg={gray} size='100%'>
        <ArrowForwardIcon />
      </Circle>
    )
  }

  return (
    <Flex width='full' justifyContent='space-between' alignItems='stretch' {...rest}>
      <Box flex={1} maxWidth={`calc(50% - ${boxSize} / 2)`}>
        <Flex alignItems='center'>
          <AssetIcon src={sellAsset.currency.icon} boxSize={boxSize} />
          <Divider flex={1} bgColor={sellAssetColor} />
        </Flex>
        <Box mt={2}>
          <Text fontWeight='medium'>
            {toCrypto(Number(sellAsset.amount), sellAsset.currency.symbol)}
          </Text>
          <Text color='gray.500'>
            {toFiat(
              bn(sellAsset.amount || '0')
                .times(sellAsset.fiatRate || '0')
                .toNumber(),
            )}
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
          {renderIcon()}
        </Circle>
      </Flex>
      <Flex flexDirection='column' flex={1} maxWidth={`calc(50% - ${boxSize} / 2)`}>
        <Flex alignItems='center' flex={1} justify='flex-start'>
          <Divider flex={1} bgColor={buyAssetColor} />
          <AssetIcon src={buyAsset.currency.icon} boxSize={boxSize} />
        </Flex>
        <Flex
          flexDirection='column'
          justifyContent='space-between'
          textAlign='right'
          height='100%'
          mt={2}
        >
          <Text fontWeight='medium'>
            {toCrypto(Number(buyAsset.amount), buyAsset.currency.symbol)}
          </Text>
          <Text color='gray.500'>
            {toFiat(
              bn(sellAsset.amount || '0')
                .times(sellAsset.fiatRate || '0')
                .toNumber(),
            )}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
