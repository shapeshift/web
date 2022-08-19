import { Box, Flex, Heading, Link } from '@chakra-ui/react'
import { YatIcon } from 'components/Icons/YatIcon'
import { Text } from 'components/Text'

export const YatBanner = () => {
  return (
    <Link href='https://y.at' isExternal>
      <Flex w='100%' position='relative' mt='9' p='3' gap='3' overflow='hidden' borderRadius='lg'>
        <Box
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
            Get a Yat
          </Heading>
          <Text
            translation='Your Yat is your universal emoji username, website&nbsp;URL, payment address, and more.'
            fontSize='12px'
            lineHeight='18px'
            fontWeight='medium'
          />
        </Flex>
      </Flex>
    </Link>
  )
}
