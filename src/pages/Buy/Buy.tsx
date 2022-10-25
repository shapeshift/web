import { Button, Stack } from '@chakra-ui/react'
import { Box, Flex, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import AuroraBg from 'assets/aurorabg.jpg'
import FoxPane from 'assets/fox-cta-pane.png'
import { Main } from 'components/Layout/Main'
import { Text } from 'components/Text'

import { PageContainer } from './components/PageContainer'
import { TopAssets } from './TopAssets'

export const Buy = () => {
  const translate = useTranslate()
  return (
    <Main p={0}>
      <Box bgImg={AuroraBg} backgroundSize='cover' backgroundPosition='top center'>
        <PageContainer>
          <Flex alignItems='center' justifyContent='space-between' width='full' gap={6}>
            <Flex flexDir='column' gap={4}>
              <Heading fontSize='6xl' lineHeight='shorter'>
                {translate('buyPage.title.first')}{' '}
                <Text
                  as='span'
                  background='linear-gradient(97.53deg, #F687B3 5.6%, #7B61FF 59.16%, #16D1A1 119.34%)'
                  backgroundClip='text'
                  translation='buyPage.title.second'
                />
              </Heading>
              <Text fontSize='lg' translation='buyPage.body' />
              <Text fontSize='sm' color='gray.500' translation='buyPage.disclaimer' />
            </Flex>
            <Box>
              <Box bg='gray.700' width='350px' height='444px'></Box>
            </Box>
          </Flex>
        </PageContainer>
        <Flex backgroundImage='linear-gradient(0deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)), linear-gradient(180deg, rgba(55, 97, 249, 0) -67.75%, #3761F9 100%)'>
          <PageContainer display='flex' py={0}>
            <Stack spacing={4} py='6rem' flex={1} alignItems='flex-start'>
              <Heading fontSize='xl' fontWeight='bold' as='h4' color='whiteAlpha.500'>
                {translate('buyPage.cta.title.first')}{' '}
                <Text as='span' color='white' translation='buyPage.cta.title.second' />
              </Heading>
              <Button size='lg' variant='solid' colorScheme='blue'>
                Connect Wallet
              </Button>
            </Stack>
            <Box width='300px' bgImage={FoxPane} backgroundSize='cover' />
          </PageContainer>
        </Flex>
      </Box>
      <TopAssets />
    </Main>
  )
}
