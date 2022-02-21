import { Box, Flex, FlexProps } from '@chakra-ui/layout'
import { Image } from '@chakra-ui/react'
import pending from 'assets/pending.svg'
import { Text } from 'components/Text'

const UnbondingRow = () => (
  <Flex
    bgColor='#222a38'
    pl='8px'
    pr='15px'
    py='10px'
    borderRadius='8px'
    justifyContent='space-between'
    mt='15px'
  >
    <Flex alignItems='center'>
      <Image src={pending} width='40px' height='40px' mr='10px' />
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
)

// TODO: Wire up. UnbondingRow has hardcoded text there for now
// We might want to make this component only export <UnbondingRow />
// and map in `modals/cosmos/staked/views/Staked` instead
export const UnbondingRows = (styleProps?: FlexProps) => (
  <Box {...styleProps}>
    {new Array(2).fill(undefined).map((_, i) => (
      <UnbondingRow key={i} />
    ))}
  </Box>
)
