import { Box, HStack } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { FaChevronRight } from 'react-icons/fa'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'

type ExpandableAddressCellProps = {
  address: string
  onClick?: () => void
  isExpanded?: boolean
  onToggleExpanded?: (expanded: boolean) => void
  fontSize?: string
}

export const ExpandableAddressCell: React.FC<ExpandableAddressCellProps> = ({
  address,
  onClick,
  isExpanded: controlledExpanded,
  onToggleExpanded,
  fontSize = 'sm',
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const isControlled = controlledExpanded !== undefined
  const isExpanded = isControlled ? controlledExpanded : internalExpanded

  const handleToggle = useCallback(() => {
    const newExpanded = !isExpanded
    if (isControlled && onToggleExpanded) {
      onToggleExpanded(newExpanded)
    } else {
      setInternalExpanded(newExpanded)
    }
    onClick?.()
  }, [isExpanded, isControlled, onToggleExpanded, onClick])

  const hoverStyle = useMemo(() => ({ borderColor: 'gray.500' }), [])

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
        onClick={handleToggle}
        _hover={hoverStyle}
      >
        <MiddleEllipsis value={address} fontSize={fontSize} />
        <Box as={FaChevronRight} boxSize='10px' color='gray.400' />
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
        onClick={handleToggle}
        _hover={hoverStyle}
      >
        <MiddleEllipsis value={address} fontSize={fontSize} />
        <Box as={FaChevronRight} boxSize='10px' transform='rotate(90deg)' color='gray.400' />
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
        {address}
      </Box>
    </Box>
  )
}
