import { HStack } from '@chakra-ui/react'
import type { WalletConnectEthSendTransactionCallRequest } from 'plugins/walletConnectToDapps/bridge/types'
import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

import type { ConfirmData } from '../../CallRequestCommon'
import { useCallRequestFees } from '../hooks/useCallRequestFees'

type Props = {
  request: WalletConnectEthSendTransactionCallRequest['params'][number]
}

export const GasFeeEstimateLabel = ({ request }: Props) => {
  const { fees, feeAsset, feeAssetPrice, gasPrice } = useCallRequestFees(request)
  const { control } = useFormContext<ConfirmData>()
  const speed = useWatch({ control, name: 'speed' })
  const customFee = useWatch({ control, name: 'customFee' })
  const customFeeValue = useMemo(
    () =>
      bnOrZero(customFee?.baseFee).plus(bnOrZero(customFee?.priorityFee)).times(bnOrZero(gasPrice)),
    [customFee?.baseFee, customFee?.priorityFee, gasPrice],
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
  if (!fee) return <CircularProgress size='18px' color='gray.500' />
  return (
    <HStack spacing={1}>
      <RawText fontWeight='medium'>
        <Amount.Fiat value={fee.fiatFee} />
      </RawText>
      <RawText color='gray.500'>
        <Amount.Crypto prefix='≈' value={fee.txFee} symbol={feeAsset?.symbol ?? ''} />
      </RawText>
    </HStack>
  )
}
