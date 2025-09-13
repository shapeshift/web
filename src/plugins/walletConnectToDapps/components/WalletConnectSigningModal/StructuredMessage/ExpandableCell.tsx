import { Box, HStack, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaChevronRight } from 'react-icons/fa'

import { InlineCopyButton } from '@/components/InlineCopyButton'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { useToggle } from '@/hooks/useToggle/useToggle'

type ExpandableCellProps = {
  value: string
  threshold?: number
}

export const ExpandableCell: React.FC<ExpandableCellProps> = ({ value, threshold = 30 }) => {
  const [isExpanded, toggleExpanded] = useToggle(false)

  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const hoverBorderColor = useColorModeValue('gray.300', 'gray.500')
  const chevronColor = useColorModeValue('gray.500', 'gray.400')
  const expandedTextColor = useColorModeValue('gray.600', 'gray.400')

  const containerProps = useMemo(
    () => ({ spacing: 2, align: 'center' as const, justify: 'flex-end' as const }),
    [],
  )

  const hoverSx = useMemo(() => ({ borderColor: hoverBorderColor }), [hoverBorderColor])
  const chevronIconSx = { boxSize: '10px', color: chevronColor }
  const expandedChevronSx = {
    boxSize: '10px',
    transform: 'rotate(90deg)',
    color: chevronColor,
  }
  const expandedTextSx = {
    fontSize: 'xs',
    fontFamily: 'mono',
    wordBreak: 'break-all' as const,
    color: expandedTextColor,
    pl: 4,
    py: 2,
    mt: 1,
    maxW: '100%',
    textAlign: 'right' as const,
  }

  if (value.length <= threshold) {
    return (
      <HStack {...containerProps}>
        <InlineCopyButton value={value}>
          <Box fontSize='sm' fontWeight='bold' textAlign='right'>
            {value}
          </Box>
        </InlineCopyButton>
      </HStack>
    )
  }

  if (!isExpanded) {
    return (
      <HStack {...containerProps}>
        <InlineCopyButton value={value}>
          <HStack
            spacing={2}
            align='center'
            borderWidth={1}
            borderColor={borderColor}
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
        </InlineCopyButton>
      </HStack>
    )
  }

  return (
    <Box display='flex' flexDirection='column' alignItems='flex-end'>
      <HStack {...containerProps}>
        <InlineCopyButton value={value}>
          <HStack
            spacing={2}
            align='center'
            borderWidth={1}
            borderColor={borderColor}
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
        </InlineCopyButton>
      </HStack>
      <Box {...expandedTextSx}>{value}</Box>
    </Box>
  )
}
