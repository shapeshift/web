import { Center, CenterProps, useColorModeValue } from '@chakra-ui/react'

export const IconCircle: React.FC<CenterProps> = ({ children, ...rest }) => {
  return (
    <Center
      borderRadius='full'
      px={2}
      py={2}
      boxSize='40px'
      fontSize='md'
      bg={useColorModeValue('blackAlpha.200', 'whiteAlpha.200')}
      {...rest}
    >
      {children}
    </Center>
  )
}
