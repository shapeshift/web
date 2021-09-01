import { Box, BoxProps } from '@chakra-ui/react'

export const Rail = (props: BoxProps) => {
  return (
    <Box
      maxWidth={{ base: '100%', lg: '360px' }}
      flexBasis={{ base: '100%', lg: '360px' }}
      width='100%'
      position={{ base: 'static', lg: 'sticky' }}
      top='64px'
      flexDir='column'
      py={4}
      px={{ base: 0, lg: 0 }}
      h={{ base: 'auto', lg: 'calc(100vh - 64px)' }}
      flexShrink={1}
      overflowY='auto'
      role='complementary'
      className='scroll-container'
      willChange='transform, scroll-position'
      sx={{
        overscrollBehavior: 'contain'
      }}
      {...props}
    />
  )
}
