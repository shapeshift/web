import { Card, HStack, VStack } from '@chakra-ui/react'
import { btcChainId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { RawText } from '@/components/Text'
import { fromBaseUnit } from '@/lib/math'
import { ExpandableCell } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/StructuredMessage/ExpandableCell'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type BitcoinSendTransferContentProps = {
  recipientAddress: string
  amount: string
  memo?: string
}

export const BitcoinSendTransferContent: FC<BitcoinSendTransferContentProps> = ({
  recipientAddress,
  amount,
  memo,
}) => {
  const translate = useTranslate()
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, btcChainId))

  const precision = feeAsset?.precision ?? 8
  const symbol = feeAsset?.symbol ?? 'BTC'

  const amountCryptoPrecision = useMemo(() => fromBaseUnit(amount, precision), [amount, precision])

  return (
    <Card borderRadius='2xl' p={4}>
      <VStack spacing={3} align='stretch'>
        <HStack justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('plugins.walletConnectToDapps.modal.sendTransaction.recipientAddress')}
          </RawText>
          <ExpandableCell value={recipientAddress} threshold={20} />
        </HStack>
        <HStack justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('plugins.walletConnectToDapps.modal.sendTransaction.amount')}
          </RawText>
          <Amount.Crypto
            value={amountCryptoPrecision}
            symbol={symbol}
            fontSize='sm'
            fontWeight='bold'
          />
        </HStack>
        {memo && (
          <HStack justify='space-between' align='center' py={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('plugins.walletConnectToDapps.modal.signMessage.memo')}
            </RawText>
            <RawText fontSize='sm' fontWeight='bold'>
              {memo}
            </RawText>
          </HStack>
        )}
      </VStack>
    </Card>
  )
}
