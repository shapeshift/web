import { Box, Stack } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/investor-yearn'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { Transfer } from 'hooks/useTxDetails/useTxDetails'
import { fromBaseUnit } from 'lib/math'

import { FALLBACK_PRECISION, FALLBACK_SYMBOL } from '../constants'

type AssetTransferProps = {
  compactMode?: boolean
  transfer: Transfer
  index: number
}

export const AssetTransfer: React.FC<AssetTransferProps> = ({ index, compactMode, transfer }) => (
  <Stack
    alignItems='center'
    key={index}
    flex={1}
    mt={{ base: 2, md: 0, xl: compactMode ? 2 : 0 }}
    direction={index === 0 ? 'row' : 'row-reverse'}
    textAlign={index === 0 ? 'left' : 'right'}
  >
    <AssetIcon
      assetId={transfer.asset?.assetId}
      boxSize={{ base: '24px', lg: compactMode ? '24px' : '40px' }}
    />
    <Box flex={1}>
      <Amount.Crypto
        color='inherit'
        fontWeight='medium'
        value={fromBaseUnit(transfer.value, transfer.asset?.precision ?? FALLBACK_PRECISION)}
        symbol={transfer.asset?.symbol ?? FALLBACK_SYMBOL}
        maximumFractionDigits={4}
      />
      {transfer.marketData.price && (
        <Amount.Fiat
          color='gray.500'
          fontSize='sm'
          lineHeight='1'
          value={bnOrZero(
            fromBaseUnit(transfer.value, transfer.asset?.precision ?? FALLBACK_PRECISION),
          )
            .times(transfer.marketData.price)
            .toString()}
        />
      )}
    </Box>
  </Stack>
)
