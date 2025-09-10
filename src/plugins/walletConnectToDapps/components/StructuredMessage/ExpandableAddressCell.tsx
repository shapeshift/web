import { Box, HStack } from '@chakra-ui/react'
import { FaChevronRight } from 'react-icons/fa'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { useToggle } from '@/hooks/useToggle/useToggle'

type ExpandableAddressCellProps = {
  address: string
  fontSize?: string
}

export const ExpandableAddressCell: React.FC<ExpandableAddressCellProps> = ({
  address,
  fontSize = 'sm',
}) => {
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
        _hover={{ borderColor: 'gray.500' }}
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
        onClick={toggleExpanded}
        _hover={{ borderColor: 'gray.500' }}
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
