import { Box, Flex, Icon, Link, Spinner, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { FaCheck, FaExternalLinkAlt } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import type { TransactionStep } from '@/pages/Yields/hooks/useYieldTransactionFlow'

export type { TransactionStep }
type TransactionStepStatus = TransactionStep['status']

type TransactionStepsListProps = {
  steps: TransactionStep[]
}

const StepIcon = memo(({ status }: { status: TransactionStepStatus }) => {
  if (status === 'success') {
    return <Icon as={FaCheck} color='green.400' boxSize={4} flexShrink={0} />
  }
  if (status === 'loading') {
    return <Spinner size='xs' color='blue.400' flexShrink={0} />
  }
  return <Box w={2} h={2} bg='gray.600' borderRadius='full' ml={1} flexShrink={0} />
})

const getStatusLabel = (
  status: TransactionStepStatus,
  translate: ReturnType<typeof useTranslate>,
): string => {
  if (status === 'success') return translate('yieldXYZ.loading.done')
  if (status === 'loading') return ''
  return translate('yieldXYZ.loading.waiting')
}

export const TransactionStepsList = memo(({ steps }: TransactionStepsListProps) => {
  const translate = useTranslate()

  const stepElements = useMemo(() => {
    return steps.map((step, idx) => (
      <Flex
        key={`${step.title}-${idx}`}
        justify='space-between'
        align='center'
        p={4}
        borderBottomWidth={idx !== steps.length - 1 ? '1px' : '0'}
        borderColor='whiteAlpha.50'
        bg={step.status === 'loading' ? 'whiteAlpha.50' : 'transparent'}
        transition='all 0.2s'
      >
        <Flex align='center' gap={3} flex={1} minW={0}>
          <StepIcon status={step.status} />
          <Text
            color={step.status === 'pending' ? 'gray.500' : 'text.base'}
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
        ) : (
          <Text
            fontSize='xs'
            color={step.status === 'loading' ? 'blue.300' : 'gray.600'}
            fontWeight='medium'
            flexShrink={0}
            ml={3}
          >
            {getStatusLabel(step.status, translate)}
          </Text>
        )}
      </Flex>
    ))
  }, [steps, translate])

  if (!steps.length) return null

  return (
    <Box bg='blackAlpha.300' borderRadius='xl' overflow='hidden'>
      {stepElements}
    </Box>
  )
})
