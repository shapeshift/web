import { Box, Collapse, Flex, Icon, Text, useColorModeValue } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { memo } from 'react'
import { FaCheck, FaCircle, FaTimes } from 'react-icons/fa'

import { StepStatus } from '../../../lib/stepUtils'

type TxStepCardRootProps = {
  children: ReactNode
  defaultOpen?: boolean
}

const TxStepCardRoot = memo(({ children }: TxStepCardRootProps) => {
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const bgColor = useColorModeValue('white', 'gray.800')

  return (
    <Box
      borderWidth={1}
      borderColor={borderColor}
      borderRadius='lg'
      bg={bgColor}
      maxW='512px'
      w='full'
      mt={2}
    >
      {children}
    </Box>
  )
})

TxStepCardRoot.displayName = 'TxStepCardRoot'

type TxStepCardHeaderProps = {
  children: ReactNode
}

const TxStepCardHeader = memo(({ children }: TxStepCardHeaderProps) => {
  return (
    <Flex direction='column' gap={1} p={4}>
      {children}
    </Flex>
  )
})

TxStepCardHeader.displayName = 'TxStepCardHeader'

type TxStepCardHeaderRowProps = {
  children: ReactNode
}

const TxStepCardHeaderRow = memo(({ children }: TxStepCardHeaderRowProps) => {
  return (
    <Flex alignItems='center' justifyContent='space-between' gap={4}>
      {children}
    </Flex>
  )
})

TxStepCardHeaderRow.displayName = 'TxStepCardHeaderRow'

type TxStepCardContentProps = {
  children: ReactNode
  isOpen?: boolean
}

const TxStepCardContent = memo(({ children, isOpen = true }: TxStepCardContentProps) => {
  return (
    <Collapse in={isOpen}>
      <Box px={4}>{children}</Box>
    </Collapse>
  )
})

TxStepCardContent.displayName = 'TxStepCardContent'

type TxStepCardStepperProps = {
  children: ReactNode
  completedCount?: number
  totalCount?: number
}

const TxStepCardStepper = memo(
  ({ children, completedCount, totalCount }: TxStepCardStepperProps) => {
    const borderColor = useColorModeValue('gray.200', 'gray.600')
    const mutedColor = useColorModeValue('gray.600', 'gray.400')

    return (
      <Box pt={4} borderTopWidth={1} borderColor={borderColor} px={4} pb={4}>
        {completedCount !== undefined && totalCount !== undefined && (
          <Flex alignItems='center' gap={2} fontSize='sm' color={mutedColor} mb={4}>
            <Icon as={FaCircle} boxSize={3} />
            <Text>
              {completedCount} of {totalCount} complete
            </Text>
          </Flex>
        )}
        <Box>{children}</Box>
      </Box>
    )
  },
)

TxStepCardStepper.displayName = 'TxStepCardStepper'

type TxStepCardStepProps = {
  status: StepStatus
  children: ReactNode
  connectorTop?: boolean
  connectorBottom?: boolean
}

const TxStepCardStep = memo(
  ({ status, children, connectorTop = false, connectorBottom = false }: TxStepCardStepProps) => {
    const inProgressBg = useColorModeValue('gray.100', 'whiteAlpha.200')
    const connectorColor = useColorModeValue('gray.300', 'whiteAlpha.200')

    const getStatusColor = () => {
      switch (status) {
        case StepStatus.COMPLETE:
          return 'green.500'
        case StepStatus.IN_PROGRESS:
          return 'purple.500'
        case StepStatus.FAILED:
          return 'red.500'
        case StepStatus.SKIPPED:
        case StepStatus.NOT_STARTED:
        default:
          return 'gray.400'
      }
    }

    const renderIcon = () => {
      switch (status) {
        case StepStatus.COMPLETE:
          return (
            <Flex
              alignItems='center'
              justifyContent='center'
              boxSize={5}
              borderRadius='full'
              bg='green.500'
              color='white'
            >
              <Icon as={FaCheck} boxSize={3} />
            </Flex>
          )
        case StepStatus.IN_PROGRESS:
          return <Icon as={FaCircle} boxSize={5} color='purple.500' />
        case StepStatus.FAILED:
          return (
            <Flex position='relative' alignItems='center' justifyContent='center' boxSize={5}>
              <Icon as={FaCircle} boxSize={5} color='red.500' />
              <Icon as={FaTimes} boxSize={3} color='red.500' position='absolute' />
            </Flex>
          )
        case StepStatus.SKIPPED:
          return (
            <Flex position='relative' alignItems='center' justifyContent='center' boxSize={5}>
              <Icon as={FaCircle} boxSize={5} color='gray.400' />
              <Box h='0.5' w={2} bg='gray.500' position='absolute' />
            </Flex>
          )
        case StepStatus.NOT_STARTED:
        default:
          return <Icon as={FaCircle} boxSize={5} color='gray.400' />
      }
    }

    return (
      <Flex
        position='relative'
        h={10}
        alignItems='center'
        borderRadius='md'
        px={2}
        mx={-2}
        bg={status === StepStatus.IN_PROGRESS ? inProgressBg : 'transparent'}
      >
        <Flex alignItems='center' gap={2} color={getStatusColor()}>
          <Flex
            direction='column'
            alignItems='center'
            flexShrink={0}
            position='relative'
            zIndex={1}
          >
            <Box
              h='2.5'
              w='0.5'
              bg={connectorColor}
              opacity={!connectorTop || status === StepStatus.IN_PROGRESS ? 0 : 1}
            />
            <Flex h={5} w={5} alignItems='center' justifyContent='center'>
              {renderIcon()}
            </Flex>
            <Box
              h='2.5'
              w='0.5'
              bg={connectorColor}
              opacity={!connectorBottom || status === StepStatus.IN_PROGRESS ? 0 : 1}
            />
          </Flex>
          <Text fontSize='sm'>{children}</Text>
        </Flex>
      </Flex>
    )
  },
)

TxStepCardStep.displayName = 'TxStepCardStep'

type TxStepCardAmountProps = {
  value?: string
  symbol?: string
  prefix?: string
}

const TxStepCardAmount = memo(({ value, symbol, prefix }: TxStepCardAmountProps) => {
  if (value === undefined) {
    return (
      <Text fontSize='xl' fontWeight='bold' color='gray.400'>
        —
      </Text>
    )
  }

  const formatted = symbol ? `${value} ${symbol}` : value

  return (
    <Text fontSize='xl' fontWeight='bold' color='green.500'>
      {prefix}
      {formatted}
    </Text>
  )
})

TxStepCardAmount.displayName = 'TxStepCardAmount'

export const TxStepCard = {
  Root: TxStepCardRoot,
  Header: TxStepCardHeader,
  HeaderRow: TxStepCardHeaderRow,
  Content: TxStepCardContent,
  Stepper: TxStepCardStepper,
  Step: TxStepCardStep,
  Amount: TxStepCardAmount,
}
