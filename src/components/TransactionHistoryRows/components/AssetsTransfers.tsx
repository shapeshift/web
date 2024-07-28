import { Box, Circle, Stack, Text as CText } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { useButtonStyles } from 'hooks/useButtonStyles/useButtonStyles'
import type { Transfer } from 'hooks/useTxDetails/useTxDetails'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

import { FALLBACK_PRECISION, FALLBACK_SYMBOL } from '../constants'

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

  const stackMt = useMemo(() => ({ base: 2, md: 0, xl: compactMode ? 2 : 0 }), [compactMode])

  const assetIconSize = useMemo(
    () => ({ base: 'sm', lg: compactMode ? 'sm' : 'sm' }),
    [compactMode],
  )

  const circleBoxSize = useMemo(
    () => ({ base: '24px', lg: compactMode ? '24px' : '40px' }),
    [compactMode],
  )

  const singleAsset = useMemo(
    () => transfers.every(transfer => transfer.assetId === transfers[0].assetId),
    [transfers],
  )

  const aggregated = useMemo(() => {
    const { cryptoValue, fiatValue } = transfers.reduce(
      (acc, transfer) => {
        const precision = transfer.asset?.precision ?? FALLBACK_PRECISION
        const cryptoValue = fromBaseUnit(transfer.value, precision)

        acc.cryptoValue = acc.cryptoValue.plus(bnOrZero(cryptoValue))
        acc.fiatValue = acc.fiatValue.plus(bnOrZero(cryptoValue).times(transfer.marketData.price))

        return acc
      },
      { cryptoValue: bn(0), fiatValue: bn(0) },
    )

    return {
      cryptoValue: cryptoValue.toFixed(),
      fiatValue: fiatValue.toFixed(),
    }
  }, [transfers])

  return (
    <Stack
      alignItems='center'
      key={index}
      flex={1}
      mt={stackMt}
      direction={index === 0 ? 'row' : 'row-reverse'}
      textAlign={index === 0 ? 'left' : 'right'}
    >
      {singleAsset ? (
        <>
          <AssetIcon asset={transfers[0].asset} size={assetIconSize} />
          <Box flex={1}>
            <Amount.Crypto
              color='inherit'
              fontWeight='medium'
              value={aggregated.cryptoValue}
              symbol={transfers[0].asset?.symbol ?? FALLBACK_SYMBOL}
              maximumFractionDigits={4}
            />
            {transfers[0].marketData.price && (
              <Amount.Fiat
                color='text.subtle'
                fontSize='sm'
                lineHeight='1'
                value={aggregated.fiatValue}
              />
            )}
          </Box>
        </>
      ) : (
        <>
          <Circle
            // @ts-ignore boxSize is a valid prop for <Circle />
            boxSize={circleBoxSize}
            color={circleColor}
            bg={circleBgColor}
          >
            <CText>{transfers.length}</CText>
          </Circle>
          <Box flex={1}>
            <CText fontWeight='bold'>{`${transfers.length} Assets`}</CText>
            <Amount.Fiat
              color='text.subtle'
              fontSize='sm'
              lineHeight='1'
              value={aggregated.fiatValue}
            />
          </Box>
        </>
      )}
    </Stack>
  )
}
