import { HStack } from '@chakra-ui/react'
import type { WalletConnectEthSendTransactionCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge'
import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText } from 'components/Text'

import type { ConfirmData } from '../../CallRequestCommon'
import { useCallRequestFees } from '../hooks/useCallRequestFees'

type Props = {
  request: WalletConnectEthSendTransactionCallRequest['params'][number]
}

export const GasFeeEstimateLabel = ({ request }: Props) => {
  const { fees, feeAsset } = useCallRequestFees(request)
  const { control } = useFormContext<ConfirmData>()
  const speed = useWatch({ control, name: 'speed' })
  const customFee = useWatch({ control, name: 'customFee' })
  const fee = useMemo(
    () => (speed === 'custom' ? customFee : fees?.[speed]),
    [customFee, fees, speed],
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
