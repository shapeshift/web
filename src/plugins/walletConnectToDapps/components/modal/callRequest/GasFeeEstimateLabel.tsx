import { HStack } from '@chakra-ui/react'
import type { WalletConnectEthSendTransactionCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge/dist/types'
import type { FC } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { RawText } from 'components/Text'

import type { ConfirmData } from './SendTransactionConfirmation'
import { useCallRequestFees } from './useCallRequestFees'

type Props = {
  request: WalletConnectEthSendTransactionCallRequest['params'][number]
}

export const GasFeeEstimateLabel: FC<Props> = ({ request }) => {
  const fees = useCallRequestFees(request)
  const { control } = useFormContext<ConfirmData>()
  const speed = useWatch({ control, name: 'speed' })
  if (!fees) return null
  return (
    <HStack spacing={1}>
      <RawText fontWeight='medium'>{`$${fees[speed].fiatFee}`}</RawText>
      <RawText color='gray.500'>≈ {fees[speed].txFee} ETH</RawText>
    </HStack>
  )
}
