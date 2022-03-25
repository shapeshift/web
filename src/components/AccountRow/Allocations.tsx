import { Box, Flex, useColorModeValue } from '@chakra-ui/react'

export const Allocations = ({ value, color }: { value: number; color?: string }) => {
  return (
    <Flex
      height='8px'
      width='100px'
      bg={useColorModeValue('gray.100', 'gray.700')}
      borderRadius='full'
      overflow='hidden'
      position='relative'
      justifyContent='flex-end'
      ml='auto'
    >
      <Box
        width={`${value < 5 ? 10 : value}%`}
        backgroundColor='blue.500'
        height='8px'
        position='absolute'
        borderRadius='full'
      />
    </Flex>
  )
}
