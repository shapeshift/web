import { Box, Circle, Stack, Text as CText, useColorModeValue } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import type { Transfer } from 'hooks/useTxDetails/useTxDetails'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

import { FALLBACK_PRECISION } from '../constants'

type AssetsTransfersProps = {
  compactMode?: boolean
  transfers: Transfer[]
  index: number
}

export const AssetsTransfers: React.FC<AssetsTransfersProps> = ({
  index,
  compactMode,
  transfers,
}) => {
  const circleBgColor = '#333d59' // TODO: can we reuse the Button.theme here?
  const circleColor = useColorModeValue('blue.100', 'blue.200')
  const aggregatedFiatValue = transfers
    .reduce((acc, transfer) => {
      if (!transfer) return acc
      return acc.plus(
        bnOrZero(
          fromBaseUnit(transfer.value, transfer.asset?.precision ?? FALLBACK_PRECISION),
        ).times(transfer.marketData.price),
      )
    }, bn(0))
    .toString()

  return (
    <Stack
      alignItems='center'
      key={index}
      flex={1}
      mt={{ base: 2, md: 0, xl: compactMode ? 2 : 0 }}
      direction={index === 0 ? 'row' : 'row-reverse'}
      textAlign={index === 0 ? 'left' : 'right'}
    >
      <Circle
        boxSize={{ base: '24px', lg: compactMode ? '24px' : '40px' }}
        color={circleColor}
        bg={circleBgColor}
      >
        <CText>{transfers.length}</CText>
      </Circle>
      <Box flex={1}>
        <CText fontWeight='bold'>{`${transfers.length} Assets`}</CText>
        <Amount.Fiat color='gray.500' fontSize='sm' lineHeight='1' value={aggregatedFiatValue} />
      </Box>
    </Stack>
  )
}
