import { ArrowForwardIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import {
  Box,
  Circle,
  Divider,
  Flex,
  FlexProps,
  Spinner,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/chain-adapters'
import { Trade } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { AssetIcon } from 'components/AssetIcon'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

type AssetToAssetProps<C extends KnownChainIds> = {
  tradeFiatAmount: string
  buyIcon: string
  status?: TxStatus
  trade?: Trade<C>
} & FlexProps

export const AssetToAsset = ({
  tradeFiatAmount,
  buyIcon,
  trade,
  boxSize = '24px',
  status,
  ...rest
}: AssetToAssetProps<KnownChainIds>) => {
  const sellAssetColor = !status ? '#F7931A' : '#2775CA'
  const buyAssetColor = '#2775CA'
  const {
    number: { toCrypto },
  } = useLocaleFormatter({ fiatType: 'USD' })
  const gray = useColorModeValue('white', 'gray.750')
  const red = useColorModeValue('white', 'red.500')
  const green = useColorModeValue('white', 'green.500')

  const renderIcon = () => {
    switch (status) {
      case TxStatus.Confirmed: {
        return (
          <Circle bg={green} size='100%'>
            <CheckIcon />
          </Circle>
        )
      }
      case TxStatus.Failed: {
        return (
          <Circle bg={red} size='100%'>
            <CloseIcon p={1} />
          </Circle>
        )
      }
      case TxStatus.Pending: {
        return (
          <Circle bg={gray} size='100%'>
            <Spinner />
          </Circle>
        )
      }
      default: {
        return (
          <Circle bg={gray} size='100%'>
            <ArrowForwardIcon />
          </Circle>
        )
      }
    }
  }

  return (
    <Flex width='full' justifyContent='space-between' alignItems='stretch' {...rest}>
      <Box flex={1} maxWidth={`calc(50% - ${boxSize} / 2)`}>
        <Flex alignItems='center'>
          <AssetIcon src={trade?.sellAsset.icon} boxSize={boxSize} />
          <Divider flex={1} bgColor={sellAssetColor} />
        </Flex>
        <Box mt={2}>
          <Text fontWeight='medium'>
            {toCrypto(
              Number(fromBaseUnit(bnOrZero(trade?.sellAmount), trade?.sellAsset?.precision ?? 0)),
              trade?.sellAsset.symbol,
            )}
          </Text>
          <Text color='gray.500'>{tradeFiatAmount}</Text>
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
          <AssetIcon src={buyIcon} boxSize={boxSize} />
        </Flex>
        <Flex
          flexDirection='column'
          justifyContent='space-between'
          textAlign='right'
          height='100%'
          mt={2}
        >
          <Text fontWeight='medium'>
            {toCrypto(
              Number(fromBaseUnit(bnOrZero(trade?.buyAmount), trade?.buyAsset?.precision ?? 0)),
              trade?.buyAsset.symbol,
            )}
          </Text>
          <Text color='gray.500'>{tradeFiatAmount}</Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
