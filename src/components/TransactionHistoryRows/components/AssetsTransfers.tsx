import { Box, Circle, Stack, Text as CText } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { useButtonStyles } from 'hooks/useButtonStyles/useButtonStyles'
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
  const { bg: circleBgColor, color: circleColor } = useButtonStyles({
    colorScheme: 'blue',
    variant: 'ghost-filled',
  })

  const aggregatedFiatValue = transfers
    .reduce(
      (acc, transfer) =>
        acc.plus(
          bnOrZero(
            fromBaseUnit(transfer.value, transfer.asset?.precision ?? FALLBACK_PRECISION),
          ).times(transfer.marketData.price),
        ),
      bn(0),
    )
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
        // @ts-ignore boxSize is a valid prop for <Circle />
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
