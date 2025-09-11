import { Box, HStack } from '@chakra-ui/react'
import { FaChevronRight } from 'react-icons/fa'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { useToggle } from '@/hooks/useToggle/useToggle'

const hoverSx = { borderColor: 'gray.500' }
const chevronIconSx = { boxSize: '10px', color: 'gray.400' }
const expandedChevronSx = {
  boxSize: '10px',
  transform: 'rotate(90deg)',
  color: 'gray.400',
}
const expandedTextSx = {
  fontSize: 'xs',
  fontFamily: 'mono',
  wordBreak: 'break-all' as const,
  color: 'gray.400',
  pl: 4,
  py: 2,
  mt: 1,
  maxW: '100%',
  textAlign: 'right' as const,
}

type ExpandableHexCellProps = {
  value: string
}

export const ExpandableHexCell: React.FC<ExpandableHexCellProps> = ({ value }) => {
  const [isExpanded, toggleExpanded] = useToggle(false)

  if (!isExpanded) {
    return (
      <HStack
        spacing={2}
        align='center'
        borderWidth={1}
        borderColor='gray.600'
        borderRadius='md'
        px={2}
        py={1}
        cursor='pointer'
        onClick={toggleExpanded}
        _hover={hoverSx}
      >
        <MiddleEllipsis value={value} fontSize='sm' />
        <Box as={FaChevronRight} {...chevronIconSx} />
      </HStack>
    )
  }

  return (
    <Box display='flex' flexDirection='column' alignItems='flex-end'>
      <HStack
        spacing={2}
        align='center'
        borderWidth={1}
        borderColor='gray.600'
        borderRadius='md'
        px={2}
        py={1}
        cursor='pointer'
        onClick={toggleExpanded}
        _hover={hoverSx}
      >
        <MiddleEllipsis value={value} fontSize='sm' />
        <Box as={FaChevronRight} {...expandedChevronSx} />
      </HStack>
      <Box {...expandedTextSx}>{value}</Box>
    </Box>
  )
}
