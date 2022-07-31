import { Box, Center, Stack } from '@chakra-ui/layout'
import { Image, useMediaQuery } from '@chakra-ui/react'
import ogLogo from 'assets/og-logo.png'
import { Text } from 'components/Text'
import { breakpoints } from 'theme/theme'

import { OG_COLORS } from '../constants'

export const OGHeader = () => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  return (
    <Center display='flex' height='300px' pt={9} bg={OG_COLORS.darkBlue}>
      <Stack>
        <Image
          src={ogLogo}
          alt=''
          htmlWidth={isLargerThanMd ? '550px' : '340px'}
          margin='0 auto'
          mt={{ base: '-10px', md: '0' }}
        />
        <Box>
          <Stack mt='0' textAlign='center' alignItems='center'>
            <Box fontSize={{ base: 'sm', md: 'l' }}>
              <Text as='i' translation='simpleSwap.classic.buyInstantly' />
              &nbsp;
              <Text
                as='i'
                color={OG_COLORS.orange}
                translation='simpleSwap.classic.noAccountNeeded'
              />
            </Box>
            <Text
              as='i'
              width={{ base: '300px', md: '100%' }}
              margin='0 auto'
              fontSize='xs'
              translation='simpleSwap.classic.testimonial'
            />
          </Stack>
        </Box>
      </Stack>
    </Center>
  )
}
