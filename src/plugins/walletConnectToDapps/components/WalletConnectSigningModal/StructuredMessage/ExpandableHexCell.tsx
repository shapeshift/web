import { Box, HStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaChevronRight } from 'react-icons/fa'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { useToggle } from '@/hooks/useToggle/useToggle'

type ExpandableHexCellProps = {
  value: string
  fontSize?: string
}

export const ExpandableHexCell: React.FC<ExpandableHexCellProps> = ({ value, fontSize = 'sm' }) => {
  const [isExpanded, toggleExpanded] = useToggle(false)

  const hoverStyle = useMemo(() => ({ borderColor: 'gray.500' }), [])
  const chevronIconStyle = useMemo(() => ({ boxSize: '10px', color: 'gray.400' }), [])
  const expandedChevronStyle = useMemo(
    () => ({
      boxSize: '10px',
      transform: 'rotate(90deg)',
      color: 'gray.400',
    }),
    [],
  )

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
        _hover={hoverStyle}
      >
        <MiddleEllipsis value={value} fontSize={fontSize} />
        <Box as={FaChevronRight} {...chevronIconStyle} />
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
        _hover={hoverStyle}
      >
        <MiddleEllipsis value={value} fontSize={fontSize} />
        <Box as={FaChevronRight} {...expandedChevronStyle} />
      </HStack>
      <Box
        fontSize='xs'
        fontFamily='mono'
        wordBreak='break-all'
        color='gray.400'
        pl={4}
        py={2}
        mt={1}
        maxW='100%'
        textAlign='right'
      >
        {value}
      </Box>
    </Box>
  )
}
