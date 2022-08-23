import { Box, Flex, Heading, Link } from '@chakra-ui/react'
import { YatIcon } from 'components/Icons/YatIcon'
import { Text } from 'components/Text'

export const YatBanner = () => {
  return (
    <Link
      href='https://y.at'
      isExternal
      mt='9'
      _hover={{ '[id^="yat-banner-gradient"]': { filter: 'blur(30px)' } }}
    >
      <Flex w='100%' position='relative' p='3' gap='3' overflow='hidden' borderRadius='lg'>
        <Box
          id='yat-banner-gradient-1'
          left='-33px'
          top='45px'
          w='214px'
          h='119px'
          filter='blur(40px)'
          position='absolute'
          zIndex='hide'
          bgImage='radial-gradient(circle at center,#00C1C1, transparent)'
        />
        <Box
          id='yat-banner-gradient-2'
          left='256px'
          top='-26px'
          w='211px'
          h='100px'
          filter='blur(40px)'
          position='absolute'
          zIndex='hide'
          bgImage='radial-gradient(circle at center,#7B61FF, transparent)'
        />
        <YatIcon w='29px' h='36px' />
        <Flex flexDir='column' gap='1.5'>
          <Heading as='h2' size='24px' lineHeight='24px' fontWeight='semibold'>
            <Text translation='features.yat.banner.title' />
          </Heading>
          <Text
            translation='features.yat.banner.description'
            fontSize='12px'
            lineHeight='18px'
            fontWeight='medium'
          />
        </Flex>
      </Flex>
    </Link>
  )
}
