import { ChevronRightIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, Stack, Tag } from '@chakra-ui/react'
import {
  BuySellParams,
  BuySellQueryParams
} from 'features/buysell/contexts/BuySellManagerProvider/BuySellManagerProvider'
import gemlogo from 'assets/gem-mark.png'
import onjunologo from 'assets/onjuno.png'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'

export const BuySellProviders = () => {
  const { location, history } = useBrowserRouter<BuySellQueryParams, BuySellParams>()

  return (
    <Flex justifyContent='center' alignItems='center'>
      <Card boxShadow='none' borderWidth={0} maxWidth='500px'>
        <Card.Header>
          <Card.Heading>
            <Text translation='buysell.page.title' />
          </Card.Heading>
        </Card.Header>
        <Card.Body>
          <Text lineHeight={1.2} color='gray.500' translation='buysell.page.titleMessage' />
          <Stack spacing={2} mt={2} mx={-4}>
            <Button
              width='full'
              height='auto'
              justifyContent='space-between'
              variant='ghost'
              fontWeight='normal'
              py={2}
              onClick={() =>
                history.replace({
                  ...location,
                  pathname: `/buysell/gem/buy`
                })
              }
              rightIcon={<ChevronRightIcon boxSize={6} />}
            >
              <Flex flexDirection='row' justifyContent='center' alignItems='center'>
                <AssetIcon src={gemlogo} />
                <Box textAlign='left' ml={2}>
                  <Text fontWeight='bold' color='white' translation='buysell.page.gem' />
                  <Text translation='buysell.page.gemMessage' />
                </Box>
              </Flex>
              <Tag colorScheme='green'>
                <Text translation='buysell.page.buy' />
              </Tag>
              <Tag colorScheme='gray'>
                <Text translation='buysell.page.sell' />
              </Tag>
            </Button>
            <Button
              width='full'
              height='auto'
              justifyContent='flex-start'
              variant='ghost'
              fontWeight='normal'
              py={2}
            >
              <Flex flexDirection='row' justifyContent='center' alignItems='center'>
                <AssetIcon src={onjunologo} />
                <Box textAlign='left' ml={2}>
                  <Text fontWeight='bold' color='white' translation='buysell.page.onJuno' />
                  <Text translation='buysell.page.comingSoon' />
                </Box>
              </Flex>
            </Button>
          </Stack>
        </Card.Body>
      </Card>
    </Flex>
  )
}
