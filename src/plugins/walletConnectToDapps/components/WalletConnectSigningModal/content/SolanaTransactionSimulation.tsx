import { HStack, Image, Skeleton, VStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { RawText } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useSimulateSolanaTransaction } from '@/plugins/walletConnectToDapps/hooks/useSimulateSolanaTransaction'

type SolanaTransactionSimulationProps = {
  transaction: string
}

export const SolanaTransactionSimulation: FC<SolanaTransactionSimulationProps> = ({
  transaction,
}) => {
  const translate = useTranslate()
  const { simulationQuery } = useSimulateSolanaTransaction({ transaction })

  const sendChanges = useMemo(
    () => simulationQuery.data?.balanceChanges.filter(c => c.type === 'send') ?? [],
    [simulationQuery.data],
  )

  const receiveChanges = useMemo(
    () => simulationQuery.data?.balanceChanges.filter(c => c.type === 'receive') ?? [],
    [simulationQuery.data],
  )

  const sendChangeRow = useMemo(
    () =>
      sendChanges.map((change, index) => (
        <HStack key={`send-${index}`} justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('common.send')}
          </RawText>
          <HStack spacing={2}>
            <Amount.Crypto
              value={bnOrZero(change.amount).abs().toString()}
              symbol={change.tokenInfo.symbol}
              omitDecimalTrailingZeros
              fontSize='sm'
              color='red.400'
              fontWeight='bold'
              prefix='-'
            />
            {change.tokenInfo.icon && (
              <Image boxSize='20px' src={change.tokenInfo.icon} alt='' borderRadius='full' />
            )}
          </HStack>
        </HStack>
      )),
    [sendChanges, translate],
  )

  const receiveChangeRow = useMemo(
    () =>
      receiveChanges.map((change, index) => (
        <HStack key={`receive-${index}`} justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('common.receive')}
          </RawText>
          <HStack spacing={2}>
            <Amount.Crypto
              value={bnOrZero(change.amount).abs().toString()}
              symbol={change.tokenInfo.symbol}
              omitDecimalTrailingZeros
              fontSize='sm'
              color='green.400'
              fontWeight='bold'
              prefix='+'
            />
            {change.tokenInfo.icon && (
              <Image boxSize='20px' src={change.tokenInfo.icon} alt='' borderRadius='full' />
            )}
          </HStack>
        </HStack>
      )),
    [receiveChanges, translate],
  )

  const isLoading = simulationQuery.isFetching
  const hasContent = sendChanges.length > 0 || receiveChanges.length > 0

  if (!hasContent && !isLoading) return null

  if (isLoading && !hasContent) {
    return (
      <VStack spacing={2} align='stretch'>
        <HStack justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('common.send')}
          </RawText>
          <Skeleton height='20px' width='120px' />
        </HStack>
        <HStack justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('common.receive')}
          </RawText>
          <Skeleton height='20px' width='120px' />
        </HStack>
      </VStack>
    )
  }

  return (
    <VStack spacing={2} align='stretch'>
      {sendChangeRow}
      {receiveChangeRow}
    </VStack>
  )
}
