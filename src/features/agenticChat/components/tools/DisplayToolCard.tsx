import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import type { ReactNode } from 'react'

type DisplayToolCardRootProps = {
  children: ReactNode
}

const DisplayToolCardRoot = ({ children }: DisplayToolCardRootProps) => {
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const bgColor = useColorModeValue('white', 'gray.800')

  return (
    <Box w='full' borderRadius='lg' borderWidth={1} borderColor={borderColor} bg={bgColor} mt={2}>
      {children}
    </Box>
  )
}

type DisplayToolCardHeaderProps = {
  children: ReactNode
}

const DisplayToolCardHeader = ({ children }: DisplayToolCardHeaderProps) => {
  return (
    <Flex direction='column' gap={1} p={4}>
      {children}
    </Flex>
  )
}

type DisplayToolCardHeaderRowProps = {
  children: ReactNode
}

const DisplayToolCardHeaderRow = ({ children }: DisplayToolCardHeaderRowProps) => {
  return (
    <Flex alignItems='center' justifyContent='space-between' gap={4}>
      {children}
    </Flex>
  )
}

type DisplayToolCardContentProps = {
  children: ReactNode
}

const DisplayToolCardContent = ({ children }: DisplayToolCardContentProps) => {
  return (
    <Box px={4} pb={4}>
      {children}
    </Box>
  )
}

type DisplayToolCardDetailsProps = {
  children: ReactNode
}

const DisplayToolCardDetails = ({ children }: DisplayToolCardDetailsProps) => {
  return (
    <Flex direction='column' gap={4} fontSize='sm'>
      {children}
    </Flex>
  )
}

type DisplayToolCardDetailItemProps = {
  label: string
  value: ReactNode
}

const DisplayToolCardDetailItem = ({ label, value }: DisplayToolCardDetailItemProps) => {
  const mutedColor = useColorModeValue('gray.600', 'gray.400')

  return (
    <Flex justifyContent='space-between' color={mutedColor}>
      <Text fontWeight='normal'>{label}</Text>
      <Text fontWeight='medium'>{value}</Text>
    </Flex>
  )
}

export const DisplayToolCard = {
  Root: DisplayToolCardRoot,
  Header: DisplayToolCardHeader,
  HeaderRow: DisplayToolCardHeaderRow,
  Content: DisplayToolCardContent,
  Details: DisplayToolCardDetails,
  DetailItem: DisplayToolCardDetailItem,
}
