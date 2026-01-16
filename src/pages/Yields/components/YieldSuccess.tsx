import { Avatar, Box, Button, Flex, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { memo, useCallback, useEffect, useMemo } from 'react'
import ReactCanvasConfetti from 'react-canvas-confetti'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useConfetti } from '../hooks/useConfetti'
import type { TransactionStep } from '../hooks/useYieldTransactionFlow'
import { TransactionStepsList } from './TransactionStepsList'

type ProviderInfo = {
  name: string
  logoURI: string | undefined
}

type YieldSuccessProps = {
  amount: string
  symbol: string
  providerInfo: ProviderInfo | null
  transactionSteps: TransactionStep[]
  yieldId?: string
  accountId?: AccountId
  onDone: () => void
  showConfetti?: boolean
  successMessageKey?: 'successEnter' | 'successExit' | 'successClaim'
}

export const YieldSuccess = memo(
  ({
    amount,
    symbol,
    providerInfo,
    transactionSteps,
    yieldId,
    accountId,
    onDone,
    showConfetti = true,
    successMessageKey = 'successEnter',
  }: YieldSuccessProps) => {
    const translate = useTranslate()
    const navigate = useNavigate()
    const { getInstance, fireConfetti, confettiStyle } = useConfetti()

    useEffect(() => {
      if (showConfetti) fireConfetti()
    }, [showConfetti, fireConfetti])

    const handleViewPosition = useCallback(() => {
      if (!yieldId) return
      const params = new URLSearchParams()
      if (accountId) params.set('accountId', accountId)
      const queryString = params.toString()
      navigate(queryString ? `/yields/${yieldId}?${queryString}` : `/yields/${yieldId}`)
    }, [yieldId, accountId, navigate])

    const providerPillProps = useMemo(
      () =>
        yieldId
          ? {
              cursor: 'pointer' as const,
              onClick: handleViewPosition,
              _hover: { bg: 'background.surface.raised.hover' },
              transition: 'background 0.2s',
            }
          : {},
      [yieldId, handleViewPosition],
    )

    return (
      <>
        <ReactCanvasConfetti onInit={getInstance} style={confettiStyle} />
        <VStack spacing={6} py={4} textAlign='center' align='center' width='full'>
          <Box
            position='relative'
            w={20}
            h={20}
            borderRadius='full'
            bgGradient='linear(to-br, green.400, green.600)'
            color='white'
            display='flex'
            alignItems='center'
            justifyContent='center'
            boxShadow='0 0 30px rgba(72, 187, 120, 0.5)'
          >
            <Icon as={FaCheck} boxSize={8} />
          </Box>

          <Box>
            <Heading size='lg' mb={2}>
              {translate('yieldXYZ.success')}
            </Heading>
            <Text color='text.subtle' fontSize='md'>
              {translate(`yieldXYZ.${successMessageKey}`, { amount, symbol })}
            </Text>
          </Box>

          {providerInfo && (
            <Flex
              align='center'
              gap={2}
              bg='background.surface.raised.base'
              px={4}
              py={2}
              borderRadius='full'
              {...providerPillProps}
            >
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.via')}
              </Text>
              <Avatar size='xs' src={providerInfo.logoURI} name={providerInfo.name} />
              <Text fontSize='sm' fontWeight='medium'>
                {providerInfo.name}
              </Text>
            </Flex>
          )}

          {transactionSteps.length > 0 && (
            <Box width='full'>
              <TransactionStepsList steps={transactionSteps} />
            </Box>
          )}

          <VStack spacing={3} width='full' pt={2}>
            {yieldId && (
              <Button colorScheme='blue' width='full' size='lg' onClick={handleViewPosition}>
                {translate('yieldXYZ.viewPosition')}
              </Button>
            )}
            <Button
              variant={yieldId ? 'ghost' : 'solid'}
              colorScheme={yieldId ? undefined : 'blue'}
              width='full'
              size='lg'
              onClick={onDone}
            >
              {translate('common.close')}
            </Button>
          </VStack>
        </VStack>
      </>
    )
  },
)
