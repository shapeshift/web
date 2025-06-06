import { Search2Icon } from '@chakra-ui/icons'
import { Circle, Flex, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'

import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'

export const SearchEmpty = ({ searchQuery }: { searchQuery?: string }) => {
  const bgColor = useColorModeValue('gray.100', 'gray.750')
  const noResultsBodyTranslation: TextPropTypes['translation'] = useMemo(
    () => ['common.noResultsBody', { searchQuery: `"${searchQuery}"` }],
    [searchQuery],
  )
  return (
    <Flex p={6} textAlign='center' alignItems='center' width='full' flexDir='column' gap={4}>
      <Flex>
        <Circle bg={bgColor} size='40px'>
          <Search2Icon />
        </Circle>
      </Flex>
      <Flex alignItems='center' textAlign='center' flexDir='column' gap={2}>
        <Text
          fontWeight='bold'
          fontSize='lg'
          letterSpacing='0.02em'
          translation='common.noResultsFound'
        />
        <Text color='text.subtle' letterSpacing='0.012em' translation={noResultsBodyTranslation} />
      </Flex>
    </Flex>
  )
}
