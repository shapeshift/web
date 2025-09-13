import { Card, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { InlineCopyButton } from '@/components/InlineCopyButton'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { fromBaseUnit } from '@/lib/math'
import type { TransactionParams } from '@/plugins/walletConnectToDapps/types'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type SendTransactionContentProps = {
  transaction: TransactionParams
  chainId: ChainId
}

export const SendTransactionContent: FC<SendTransactionContentProps> = ({
  transaction,
  chainId,
}) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'whiteAlpha.50')
  const tagBg = useColorModeValue('gray.100', 'whiteAlpha.200')

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))

  const networkIcon = useMemo(() => {
    return feeAsset?.networkIcon ?? feeAsset?.icon
  }, [feeAsset?.networkIcon, feeAsset?.icon])

  const sendAmountCryptoPrecision = useMemo(() => {
    if (!transaction.value || !feeAsset) return '0'

    return fromBaseUnit(transaction.value, feeAsset.precision)
  }, [transaction.value, feeAsset])

  const isZeroValue = sendAmountCryptoPrecision === '0'

  if (!feeAsset) return null

  return (
    <Card bg={cardBg} borderRadius='2xl' p={4}>
      <HStack justify='space-between' align='center' spacing={4}>
        <HStack spacing={3} align='center'>
          {networkIcon && <Image boxSize='24px' src={networkIcon} borderRadius='full' />}
          <RawText fontSize='md' fontWeight='medium'>
            {translate('common.send')}
          </RawText>
        </HStack>

        <VStack spacing={1} align='flex-end'>
          <HStack spacing={2} align='center'>
            {isZeroValue ? (
              <RawText fontSize='md' fontWeight='bold' color='text.subtle'>
                0 {feeAsset.symbol}
              </RawText>
            ) : (
              <RawText fontSize='md' fontWeight='bold' color='red.500'>
                -{sendAmountCryptoPrecision} {feeAsset.symbol}
              </RawText>
            )}
            {feeAsset.icon && <Image boxSize='20px' src={feeAsset.icon} borderRadius='full' />}
          </HStack>
          <InlineCopyButton value={transaction.to}>
            <HStack spacing={1} bg={tagBg} px={2} py={1} borderRadius='md' align='center'>
              <MiddleEllipsis value={transaction.to} fontSize='xs' color='text.subtle' />
            </HStack>
          </InlineCopyButton>
        </VStack>
      </HStack>
    </Card>
  )
}
