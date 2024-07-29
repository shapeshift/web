import { Box, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { Transfer } from 'hooks/useTxDetails/useTxDetails'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

import { FALLBACK_PRECISION, FALLBACK_SYMBOL } from '../constants'

type AssetTransferProps = {
  compactMode?: boolean
  transfer: Transfer
  index: number
}

export const AssetTransfer: React.FC<AssetTransferProps> = ({ index, compactMode, transfer }) => {
  const cryptoAmount = useMemo(() => {
    const precision = transfer.asset?.precision ?? FALLBACK_PRECISION
    return fromBaseUnit(transfer.value, precision)
  }, [transfer.asset?.precision, transfer.value])
  const fiatAmount = useMemo(
    () => bnOrZero(cryptoAmount).times(transfer.marketData.price).toString(),
    [cryptoAmount, transfer.marketData.price],
  )
  const key = useMemo(
    () => `${transfer.type}*${transfer.assetId}*${transfer.value}`,
    [transfer.type, transfer.assetId, transfer.value],
  )

  const stackMt = useMemo(() => ({ base: 2, md: 0, xl: compactMode ? 2 : 0 }), [compactMode])
  const assetIconSize = useMemo(
    () => ({ base: 'sm', lg: compactMode ? 'sm' : 'sm' }),
    [compactMode],
  )

  return (
    <Stack
      alignItems='center'
      key={key}
      flex={1}
      mt={stackMt}
      direction={index === 0 ? 'row' : 'row-reverse'}
      textAlign={index === 0 ? 'left' : 'right'}
    >
      <AssetIcon asset={transfer.asset} size={assetIconSize} />
      <Box flex={1}>
        <Amount.Crypto
          color='inherit'
          fontWeight='medium'
          value={cryptoAmount}
          symbol={transfer.asset?.symbol ?? FALLBACK_SYMBOL}
          maximumFractionDigits={4}
        />
        {transfer.marketData.price && (
          <Amount.Fiat color='text.subtle' fontSize='sm' lineHeight='1' value={fiatAmount} />
        )}
      </Box>
    </Stack>
  )
}
