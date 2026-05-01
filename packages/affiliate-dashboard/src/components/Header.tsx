import { Flex, Heading, Stack } from '@chakra-ui/react'

import { ShapeShiftLogo } from './ShapeShiftLogo'

export const Header = (): React.JSX.Element => (
  <Stack as='header' spacing={{ base: 6, md: 8 }} mb={{ base: 6, md: 8 }}>
    <Flex justify='space-between' align='center' gap={4} wrap='wrap'>
      <ShapeShiftLogo />
      <appkit-button />
    </Flex>
    <Stack spacing={1}>
      <Heading
        as='h1'
        fontSize={{ base: '2xl', md: '3xl' }}
        fontWeight={700}
        color='fg.bright'
        letterSpacing='-0.02em'
      >
        Affiliate Dashboard
      </Heading>
    </Stack>
  </Stack>
)
