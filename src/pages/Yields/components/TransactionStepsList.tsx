import { Box, Flex, Icon, Link, Spinner, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { FaCheck, FaExternalLinkAlt, FaTimes } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import type { TransactionStep } from '@/pages/Yields/hooks/useYieldTransactionFlow'

type TransactionStepStatus = TransactionStep['status']

type TransactionStepsListProps = {
  steps: TransactionStep[]
}

const StepIcon = memo(({ status }: { status: TransactionStepStatus }) => {
  if (status === 'success') {
    return <Icon as={FaCheck} color='green.400' boxSize={4} flexShrink={0} />
  }
  if (status === 'failed') {
    return <Icon as={FaTimes} color='red.400' boxSize={4} flexShrink={0} />
  }
  if (status === 'loading') {
    return <Spinner size='xs' color='blue.400' flexShrink={0} />
  }
  return <Box w={2} h={2} bg='text.subtle' borderRadius='full' ml={1} flexShrink={0} />
})

const getStatusText = (
  step: TransactionStep,
  translate: ReturnType<typeof useTranslate>,
): string | null => {
  if (step.txHash) return null
  if (step.loadingMessage) return step.loadingMessage
  if (step.status === 'pending') return translate('yieldXYZ.loading.waiting')
  if (step.status === 'success') return translate('yieldXYZ.loading.done')
  if (step.status === 'failed') return translate('yieldXYZ.loading.failed')
  return null
}

export const TransactionStepsList = memo(({ steps }: TransactionStepsListProps) => {
  const translate = useTranslate()

  const stepElements = useMemo(() => {
    return steps.map((step, idx) => {
      const statusText = getStatusText(step, translate)
      return (
        <Flex
          key={`${step.title}-${idx}`}
          justify='space-between'
          align='center'
          p={4}
          borderBottomWidth={idx !== steps.length - 1 ? '1px' : '0'}
          borderColor='border.base'
          bg={step.status === 'loading' ? 'background.surface.raised.accent' : 'transparent'}
          transition='all 0.2s'
        >
          <Flex align='center' gap={3} flex={1} minW={0}>
            <StepIcon status={step.status} />
            <Text
              color={
                step.status === 'failed'
                  ? 'red.400'
                  : step.status === 'pending'
                  ? 'text.subtle'
                  : 'text.base'
              }
              fontSize='sm'
              fontWeight={step.status === 'loading' ? 'bold' : 'medium'}
              noOfLines={1}
            >
              {step.title}
            </Text>
          </Flex>
          {step.txHash && step.txUrl ? (
            <Link
              href={step.txUrl}
              isExternal
              color='blue.400'
              fontSize='xs'
              display='flex'
              alignItems='center'
              gap={1}
              flexShrink={0}
              ml={3}
              _hover={{ textDecoration: 'underline' }}
            >
              <MiddleEllipsis value={step.txHash} />
              <Icon as={FaExternalLinkAlt} boxSize={3} />
            </Link>
          ) : statusText ? (
            <Text
              fontSize='xs'
              color={step.status === 'loading' ? 'blue.300' : 'text.subtle'}
              fontWeight='medium'
              flexShrink={0}
              ml={3}
            >
              {statusText}
            </Text>
          ) : null}
        </Flex>
      )
    })
  }, [steps, translate])

  if (!steps.length) return null

  return (
    <Box bg='background.surface.overlay.base' borderRadius='xl' overflow='hidden'>
      {stepElements}
    </Box>
  )
})
