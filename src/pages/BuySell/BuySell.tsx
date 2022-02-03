import { ChevronRightIcon } from '@chakra-ui/icons'
import { Avatar, Box, Button, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import  { useCallback, useEffect, useState } from 'react'
import { Redirect } from 'react-router-dom'
import gemlogo from 'assets/gem-mark.png'
import onjunologo from 'assets/onjuno.png'
import { Card } from 'components/Card/Card'
import { Page } from 'components/Layout/Page'

export const BuySell = () => {
  const [supportedCoins, SetSupportedCoins] = useState([])
  const [supportedSellCoins, SetSupportedSellCoins] = useState([])
  const [redirectToGem, setRiderectToGem] = useState(false)

  const getCoinifySupportedCurrencies = async () => {
    try {
      let coinifyResponse = await (
        await fetch('https://api.gem.co/institutions/coinify/supported_currencies')
      ).json()

      return coinifyResponse
    } catch (ex: any) {
        console.log(ex)
  }

  const getWyreSupportedCurrencies = async () => {
    try {
      let wyreResponse = await (
        await fetch('https://api.gem.co/institutions/wyre/supported_currencies')
      ).json()

      return wyreResponse
    } catch (ex: any) {
       console.log(ex)
    }
  }
  //Filter for the assets you can buy
  const buyFilter = arg =>
    arg.transaction_direction === 'bank_blockchain' ||
    arg.transaction_direction === 'card_blockchain'

  // Filter for the assets you can sell
  const sellFilter = arg => arg.transaction_direction === 'blockchain_bank'

  //Filter and merge function
  const filterAndMerge = (arr1, arr2, key, filter) => {
    const list1 = arr1.filter(filter).map(list => list[key].currencies)
    const list2 = arr2.filter(filter).map(list => list[key].currencies)
    const results = list1.concat(list2).flat()
    let filteredResults = []

    results.filter(function (item) {
      var i = filteredResults.findIndex(x => x.ticker == item.ticker)
      if (i <= -1) {
        filteredResults.push(item)
      }
    })
    return filteredResults
  }

  const ridirectToGem = () => {

    setRiderectToGem(true)
  }

  //Fetch supported coins and set them to state
  const fetchSupportedCoins = useCallback(async () => {
    try {
      //const res = await getCoinifySupportedCurrencies();
      const coinifyList = await getCoinifySupportedCurrencies()
      const wyreList = await getWyreSupportedCurrencies()
      const buyList = filterAndMerge(coinifyList, wyreList, 'destination', buyFilter)
      const sellList = filterAndMerge(coinifyList, wyreList, 'source', sellFilter)
      SetSupportedCoins(buyList)
      SetSupportedSellCoins(sellList)
    } catch (e) {
      console.log(e)
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    fetchSupportedCoins()
    setIsLoading(false)
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
            marginTop={'20%'}
            minWidth={'60%'}
            maxWidth={'70%'}
            marginLeft={'60%'}
          >
            <Card textAlign='center' py={6} boxShadow='none' borderWidth={0}>
              <Card.Header>
                <Card.Heading>Buy or Sell Crypto</Card.Heading>
              </Card.Header>
              <Card.Body>
                <Text lineHeight={1}>
                  ShapeShift has Partnered with several fiat ramp providers for buying and selling
                  cryptocurrencies.
                </Text>
                <Flex
                  flexDirection={'column'}
                  justifyContent={'flex-start'}
                  marginTop={'5%'}
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
                      padding={'25px'}
                      minWidth={'117%'}
                    >
                      <Avatar src={gemlogo} bg={useColorModeValue('gray.200', 'gray.700')} />
                      <Box textAlign='left'>
                        <Text lineHeight={1}>GEM</Text>
                        <Text fontWeight='normal' fontSize='sm'>
                          Buy or sell Crypto with Gem
                        </Text>
                      </Box>
                      <Flex flexDirection={'row'} marginLeft={'15%'}>
                        <Text
                          fontSize={'sm'}
                          color={'green.400'}
                          borderRadius={'10%'}
                          bg={useColorModeValue('green.200', 'green.800')}
                          padding={'2px'}
                        >
                          BUY
                        </Text>
                        <Text
                          marginLeft={'15%'}
                          fontSize={'sm'}
                          color={'red.400'}
                          bg={useColorModeValue('red.200', 'red.800')}
                          borderRadius={'10%'}
                          padding={'2px'}
                        >
                          SELL
                        </Text>
                        <Box marginLeft={'15%'}>
                          <ChevronRightIcon w={5} h={5} color='blue.500' />
                        </Box>
                      </Flex>
                    </Button>
                  </Box>
                  <Box marginTop={'5%'}>
                    <Button
                      variant='ghost'
                      onClick={() => {}}
                      isActive={false}
                      justifyContent='flex-start'
                      _focus={{
                        shadow: 'outline-inset'
                      }}
                      padding={'25px'}
                      minWidth={'115%'}
                    >
                      <Avatar src={onjunologo} bg={useColorModeValue('gray.200', 'gray.700')} />
                      <Box textAlign='left'>
                        <Text lineHeight={1}>OnJuno</Text>
                        <Text fontWeight='normal' fontSize='sm'>
                          Coming soon ...
                        </Text>
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
