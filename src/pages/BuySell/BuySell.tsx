import { ChevronRightIcon } from '@chakra-ui/icons'
import { Avatar, Box, Button, Flex, useColorModeValue, useMediaQuery } from '@chakra-ui/react'
import { getConfig } from 'config'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Redirect } from 'react-router-dom'
import gemlogo from 'assets/gem-mark.png'
import onjunologo from 'assets/onjuno.png'
import { Card } from 'components/Card/Card'
import { Page } from 'components/Layout/Page'
import { Text } from 'components/Text'

export const BuySell = () => {
  const [supportedCoins, setSupportedCoins] = useState<any[]>([])
  const [supportedSellCoins, setSupportedSellCoins] = useState<any[]>([])
  const [redirectToGem, setRedirectToGem] = useState(false)

  const bgGray = useColorModeValue('gray.200', 'gray.700')
  const bgRed = useColorModeValue('red.100', 'red.800')
  const bgGreen = useColorModeValue('green.100', 'green.800')
  const [isLargerThan550] = useMediaQuery('(min-width: 550px)')

  const getCoinifySupportedCurrencies = async () => {
    try {
      let coinifyResponse = await (
        await fetch(getConfig().REACT_APP_GEM_COINIFY_SUPPORTED_COINS)
      ).json()

      return coinifyResponse
    } catch (ex: any) {
      console.error(ex)
    }
  }

  const getWyreSupportedCurrencies = async () => {
    try {
      let wyreResponse = await (await fetch(getConfig().REACT_APP_GEM_WYRE_SUPPORTED_COINS)).json()
      return wyreResponse
    } catch (ex: any) {
      console.error(ex)
    }
  }
  //Filter for the assets you can buy
  const buyFilter = (arg: { transaction_direction: string }) =>
    arg.transaction_direction === 'bank_blockchain' ||
    arg.transaction_direction === 'card_blockchain'

  // Filter for the assets you can sell
  const sellFilter = (arg: { transaction_direction: string }) =>
    arg.transaction_direction === 'blockchain_bank'

  //Filter and merge function
  const filterAndMerge = useMemo(
    () => (arr1: any[], arr2: any[], key: string | number, filter: any) => {
      const list1 = arr1
        .filter(filter)
        .map((list: { [x: string]: { currencies: any } }) => list[key].currencies)
      const list2 = arr2
        .filter(filter)
        .map((list: { [x: string]: { currencies: any } }) => list[key].currencies)
      const results = list1.concat(list2).flat()
      let filteredResults: any[] = []

      filteredResults = results.map(result => {
        var i = filteredResults.findIndex((x: { ticker: any }) => x.ticker === result.ticker)
        if (i <= -1) {
          return result
        }
        return undefined
      })

      return filteredResults.filter(x => !!x)
    },
    []
  )

  const ridirectToGem = () => {
    setRedirectToGem(true)
  }

  //Fetch supported coins and set them to state
  const fetchSupportedCoins = useCallback(async () => {
    try {
      //const res = await getCoinifySupportedCurrencies();
      const coinifyList = await getCoinifySupportedCurrencies()
      const wyreList = await getWyreSupportedCurrencies()
      const buyList = filterAndMerge(coinifyList, wyreList, 'destination', buyFilter)
      const sellList = filterAndMerge(coinifyList, wyreList, 'source', sellFilter)
      setSupportedCoins(buyList)
      setSupportedSellCoins(sellList)
    } catch (e) {
      console.error(e)
    }
  }, [filterAndMerge])

  useEffect(() => {
    fetchSupportedCoins()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {redirectToGem && (
        <Redirect
          to={{
            pathname: '/buysell/gem',
            state: { buyCoinList: supportedCoins, sellCoinList: supportedSellCoins }
          }}
        />
      )}
      {!redirectToGem && (
        <Page>
          <Flex
            position={'absolute'}
            top='50%'
            left='50%'
            marginRight={'-50%'}
            transform={'translate(-35%,-50%)'}
          >
            <Card
              textAlign='center'
              alignSelf={'center'}
              boxShadow='none'
              borderWidth={0}
              minWidth={'60%'}
              maxWidth={isLargerThan550 ? '70%' : '120%'}
            >
              <Card.Header>
                <Card.Heading>
                  <Text translation='buysell.page.title' />
                </Card.Heading>
              </Card.Header>
              <Card.Body>
                <Text lineHeight={1.2} translation='buysell.page.titleMessage' />
                <Flex
                  flexDirection={'column'}
                  justifyContent={'flex-start'}
                  mt={'5%'}
                  alignItems={'flex-start'}
                >
                  <Box>
                    <Button
                      variant='ghost'
                      onClick={() => {
                        ridirectToGem()
                      }}
                      isActive={true}
                      justifyContent='flex-start'
                      _focus={{
                        shadow: 'outline-inset'
                      }}
                      p={'25px'}
                      wordBreak={'break-word'}
                      minWidth={isLargerThan550 ? '120%' : '100%'}
                    >
                      <Avatar src={gemlogo} bg={bgGray} />
                      <Box textAlign='left'>
                        <Text lineHeight={1} translation='buysell.page.gem' />
                        <Text
                          fontWeight='normal'
                          fontSize='sm'
                          translation='buysell.page.gemMessage'
                          wordBreak={'break-word'}
                        />
                      </Box>
                      <Flex flexDirection={'row'} ml={isLargerThan550 ? '15%' : '5%'}>
                        <Text
                          fontSize={'sm'}
                          color={'green.400'}
                          borderRadius={'10%'}
                          bg={bgGreen}
                          padding={'2px'}
                          translation='buysell.page.buy'
                        />
                        <Text
                          ml={isLargerThan550 ? '10%' : '5%'}
                          fontSize={'sm'}
                          color={'red.400'}
                          bg={bgRed}
                          borderRadius={'10%'}
                          p={'2px'}
                          translation='buysell.page.sell'
                        />
                        <Box marginLeft={isLargerThan550 ? '10%' : '5%'}>
                          <ChevronRightIcon w={5} h={5} color='blue.500' />
                        </Box>
                      </Flex>
                    </Button>
                  </Box>
                  <Box mt={'5%'}>
                    <Button
                      variant='ghost'
                      onClick={() => {}}
                      isActive={true}
                      justifyContent='flex-start'
                      _focus={{
                        shadow: 'outline-inset'
                      }}
                      p={'25px'}
                      minWidth={'100%'}
                    >
                      <Avatar src={onjunologo} bg={bgGray} />
                      <Box textAlign='left'>
                        <Text lineHeight={1} translation='buysell.page.onJuno' />
                        <Text
                          fontWeight='normal'
                          fontSize='sm'
                          translation='buysell.page.comingSoon'
                        />
                      </Box>
                    </Button>
                  </Box>
                </Flex>
              </Card.Body>
            </Card>
          </Flex>
        </Page>
      )}
    </>
  )
}
