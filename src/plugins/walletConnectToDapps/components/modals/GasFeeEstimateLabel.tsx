import { HStack } from '@chakra-ui/react'
import type { ConfirmData } from 'plugins/walletConnectToDapps/v1/components/modals/callRequest/CallRequestCommon'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { FeePrice } from 'components/Modals/Send/views/Confirm'
import { RawText } from 'components/Text'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'

type GasFeeEstimateLabelProps = {
  fees: FeePrice | undefined
  feeAsset: Asset | null
  feeAssetPrice: string
}

export const GasFeeEstimateLabel: FC<GasFeeEstimateLabelProps> = ({
  fees,
  feeAsset,
  feeAssetPrice,
}) => {
  const { control } = useFormContext<ConfirmData>()
  const speed = useWatch({ control, name: 'speed' })
  const gasLimit = useWatch({ control, name: 'gasLimit' })
  const customFee = useWatch({ control, name: 'customFee' })
  const customFeeValue = useMemo(
    () =>
      bnOrZero(customFee?.baseFee)
        .plus(bnOrZero(customFee?.priorityFee))
        .times(bnOrZero(gasLimit))
        .div(1e9),
    [customFee?.baseFee, customFee?.priorityFee, gasLimit],
  )
  const fee = useMemo(
    () =>
      speed === 'custom'
        ? {
            fiatFee: customFeeValue.times(feeAssetPrice).toString(),
            txFee: customFeeValue.toString(),
          }
        : fees?.[speed],
    [customFeeValue, feeAssetPrice, fees, speed],
  )
  if (!fee) return <CircularProgress size='18px' color='text.subtle' />
  return (
    <HStack spacing={1}>
      <RawText fontWeight='medium'>
        <Amount.Fiat value={fee.fiatFee} />
      </RawText>
      <RawText color='text.subtle'>
        <Amount.Crypto prefix='≈' value={fee.txFee} symbol={feeAsset?.symbol ?? ''} />
      </RawText>
    </HStack>
  )
}
