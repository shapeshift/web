import { ChevronRightIcon } from '@chakra-ui/icons'
import { Avatar, Box, Button, Flex, useColorModeValue } from '@chakra-ui/react'
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

      results.filter(function (item: { ticker: any }) {
        var i = filteredResults.findIndex(x => x.ticker === item.ticker)
        if (i <= -1) {
          filteredResults.push(item)
        }
      })
      return filteredResults
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
            justifyContent='center'
            alignItems='center'
            mt={'20%'}
            minWidth={'60%'}
            maxWidth={'70%'}
            ml={'60%'}
          >
            <Card textAlign='center' py={6} boxShadow='none' borderWidth={0}>
              <Card.Header>
                <Card.Heading>
                  <Text translation='buysell.page.title' />
                </Card.Heading>
              </Card.Header>
              <Card.Body>
                <Text lineHeight={1} translation='buysell.page.titleMessage' />
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
                      minWidth={'117%'}
                    >
                      <Avatar src={gemlogo} bg={useColorModeValue('gray.200', 'gray.700')} />
                      <Box textAlign='left'>
                        <Text lineHeight={1} translation='buysell.page.gem' />
                        <Text
                          fontWeight='normal'
                          fontSize='sm'
                          translation='buysell.page.gemMessage'
                        />
                      </Box>
                      <Flex flexDirection={'row'} ml={'15%'}>
                        <Text
                          fontSize={'sm'}
                          color={'green.400'}
                          borderRadius={'10%'}
                          bg={useColorModeValue('green.200', 'green.800')}
                          padding={'2px'}
                          translation='buysell.page.buy'
                        />
                        <Text
                          ml={'15%'}
                          fontSize={'sm'}
                          color={'red.400'}
                          bg={useColorModeValue('red.200', 'red.800')}
                          borderRadius={'10%'}
                          p={'2px'}
                          translation='buysell.page.sell'
                        />
                        <Box marginLeft={'15%'}>
                          <ChevronRightIcon w={5} h={5} color='blue.500' />
                        </Box>
                      </Flex>
                    </Button>
                  </Box>
                  <Box mt={'5%'}>
                    <Button
                      variant='ghost'
                      onClick={() => {}}
                      isActive={false}
                      justifyContent='flex-start'
                      _focus={{
                        shadow: 'outline-inset'
                      }}
                      p={'25px'}
                      minWidth={'115%'}
                    >
                      <Avatar src={onjunologo} bg={useColorModeValue('gray.200', 'gray.700')} />
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
