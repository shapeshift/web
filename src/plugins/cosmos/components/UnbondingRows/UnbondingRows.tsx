import { Box, Flex, FlexProps } from '@chakra-ui/layout'
import { Text } from 'components/Text'

export const UnbondingRows = (styleProps?: FlexProps) => (
  <Box {...styleProps}>
    {new Array(2).fill(undefined).map((_, i) => (
      <Flex
        key={i}
        bgColor='#222a38'
        px='15px'
        py='10px'
        borderRadius='8px'
        justifyContent='space-between'
        mt='15px'
      >
        <Flex alignItems='center'>
          <Box bgColor='#FFF24A' width='28px' height='28px' borderRadius='50%' mr='17px' />
          <Flex direction='column'>
            <Text translation={'defi.unstaking'} fontWeight='bold' color='white' />
            <Text translation={'Available in 8 days'} color='gray.400' />
          </Flex>
        </Flex>
        <Flex direction='column' alignItems='flex-end'>
          <Text translation={'$420.65'} fontWeight='bold' color='white' />
          <Text translation={'850 OSMO'} color='gray.400' />
        </Flex>
      </Flex>
    ))}
  </Box>
)
