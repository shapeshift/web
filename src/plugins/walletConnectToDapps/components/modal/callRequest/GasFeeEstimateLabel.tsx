import { HStack } from '@chakra-ui/react'
import type { WalletConnectEthSendTransactionCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge'
import type { FC } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText } from 'components/Text'

import type { ConfirmData } from './SendTransactionConfirmation'
import { useCallRequestFees } from './useCallRequestFees'

type Props = {
  request: WalletConnectEthSendTransactionCallRequest['params'][number]
}

export const GasFeeEstimateLabel: FC<Props> = ({ request }) => {
  const { fees, feeAsset } = useCallRequestFees(request)
  const { control } = useFormContext<ConfirmData>()
  const speed = useWatch({ control, name: 'speed' })
  if (!fees) return <CircularProgress size='20px' color='gray.500' />
  return (
    <HStack spacing={1}>
      <RawText fontWeight='medium'>
        <Amount.Fiat value={fees[speed].fiatFee} />
      </RawText>
      <RawText color='gray.500'>
        <Amount.Crypto prefix='≈' value={fees[speed].txFee} symbol={feeAsset?.symbol ?? ''} />
      </RawText>
    </HStack>
  )
}
