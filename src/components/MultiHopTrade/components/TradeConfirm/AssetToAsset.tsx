import { ArrowForwardIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import { Box, Circle, Divider, Flex, Spinner, useColorModeValue } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { FC } from 'react'
import { useMemo } from 'react'
import { AssetIcon } from 'components/AssetIcon'

type AssetToAssetProps = {
  buyIcon: string
  sellIcon: string
  status: TxStatus
  isSubmitting?: boolean
  buyColor?: string
  sellColor?: string
} & FlexProps

export const AssetToAsset: FC<AssetToAssetProps> = ({
  buyIcon,
  sellIcon,
  boxSize = '32px',
  sellColor = '#2775CA',
  buyColor = '#2775CA',
  status,
  isSubmitting,
  ...rest
}) => {
  const gray = useColorModeValue('white', 'gray.750')
  const red = useColorModeValue('white', 'red.500')
  const green = useColorModeValue('white', 'green.500')

  const icon = useMemo(() => {
    switch (true) {
      case status === TxStatus.Confirmed:
        return (
          <Circle bg={green} size='100%'>
            <CheckIcon />
          </Circle>
        )
      case status === TxStatus.Failed:
        return (
          <Circle bg={red} size='100%'>
            <CloseIcon p={1} />
          </Circle>
        )
      // when the trade is submitting, treat unknown status as pending so the spinner spins
      case status === TxStatus.Pending || (isSubmitting && status === TxStatus.Unknown):
        return (
          <Circle bg={gray} size='100%'>
            <Spinner />
          </Circle>
        )
      default:
        return (
          <Circle bg={gray} size='100%'>
            <ArrowForwardIcon />
          </Circle>
        )
    }
  }, [gray, green, isSubmitting, red, status])

  return (
    <Flex width='full' justifyContent='space-between' alignItems='stretch' {...rest}>
      <Box flex={1} maxWidth={`calc(50% - ${boxSize} / 2)`}>
        <Flex alignItems='center'>
          <AssetIcon src={sellIcon} boxSize={boxSize} />
          <Divider borderBottomWidth={2} flex={1} bgColor={sellColor} borderColor={sellColor} />
        </Flex>
      </Box>
      <Flex>
        <Circle
          size={boxSize}
          bg='blue.500'
          p='2px'
          background={`linear-gradient(to right, ${sellColor}, ${buyColor})`}
        >
          {icon}
        </Circle>
      </Flex>
      <Flex flexDirection='column' flex={1} maxWidth={`calc(50% - ${boxSize} / 2)`}>
        <Flex alignItems='center' flex={1} justify='flex-start'>
          <Divider borderBottomWidth={2} flex={1} bgColor={buyColor} borderColor={buyColor} />
          <AssetIcon src={buyIcon} boxSize={boxSize} />
        </Flex>
      </Flex>
    </Flex>
  )
}
