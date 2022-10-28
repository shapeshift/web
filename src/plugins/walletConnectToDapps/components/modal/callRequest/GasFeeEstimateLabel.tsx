import { HStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { RawText } from 'components/Text'

export const GasFeeEstimateLabel: FC = () => {
  const { control } = useFormContext<any>()
  const currentFeeAmount = useWatch({ control, name: 'currentFeeAmount' })

  // TODO figure out how to convert rates
  const currentFiatFee = '$4.20'

  return (
    <HStack spacing={1}>
      <RawText fontWeight='medium'>{currentFiatFee}</RawText>
      <RawText color='gray.500'>≈ {currentFeeAmount} ETH</RawText>
    </HStack>
  )
}
