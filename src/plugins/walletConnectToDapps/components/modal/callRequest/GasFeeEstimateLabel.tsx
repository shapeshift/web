import { HStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import type { BN } from 'lib/bignumber/bignumber'

type GasFeeEstimateLabelType = {
  symbol: string
  fiatRate: BN
}

export const GasFeeEstimateLabel: FC<GasFeeEstimateLabelType> = ({ symbol, fiatRate }) => {
  const { control } = useFormContext<any>()
  const currentFeeAmount = useWatch({ control, name: 'currentFeeAmount' })
  const {
    number: { toFiat },
  } = useLocaleFormatter()
  const currentFiatFee = fiatRate.times(currentFeeAmount)

  return (
    <HStack spacing={1}>
      <RawText fontWeight='medium'>{toFiat(currentFiatFee.toNumber()).toString()}</RawText>
      <RawText color='gray.500'>
        ≈ {currentFeeAmount} {symbol}
      </RawText>
    </HStack>
  )
}
