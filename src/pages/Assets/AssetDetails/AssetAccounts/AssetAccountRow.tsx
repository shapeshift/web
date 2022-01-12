import { Flex, SimpleGrid, useColorModeValue } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { Allocations } from 'components/AccountRow/Allocations'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'

// This can maybe be combined with the other AccountRow component once we know how the data works
// src/components/AccountRow
// Link url should be the account page /Accounts/[account] or whatever the route is

export const AssetAccountRow = () => {
  const rowHover = useColorModeValue('gray.100', 'gray.750')
  return (
    <SimpleGrid
      as={Link}
      to={''}
      _hover={{ bg: rowHover }}
      templateColumns={{
        base: 'minmax(0, 2fr) repeat(1, 1fr)',
        md: '1fr repeat(2, 1fr)',
        lg: 'minmax(0, 2fr) 150px repeat(2, 1fr)'
      }}
      py={4}
      pl={4}
      pr={4}
      rounded='lg'
      gridGap='1rem'
      alignItems='center'
    >
      <Flex alignItems='center'>
        <AssetIcon
          src={'https://assets.coincap.io/assets/icons/256/btc.png'}
          boxSize='30px'
          mr={2}
        />
        <Flex flexDir='column' ml={2} maxWidth='100%'>
          <RawText
            fontWeight='medium'
            lineHeight='short'
            mb={1}
            textOverflow='ellipsis'
            whiteSpace='nowrap'
            overflow='hidden'
            display='inline-block'
          >
            Bitcoin (segwit)
          </RawText>
        </Flex>
      </Flex>
      <Flex display={{ base: 'none', lg: 'flex' }} alignItems='center' justifyContent='flex-end'>
        <Allocations value={10} color={'#000'} />
      </Flex>
      <Flex justifyContent='flex-end' textAlign='right' display={{ base: 'none', md: 'flex' }}>
        <Amount.Crypto value={'100'} symbol={'BTC'} />
      </Flex>
      <Flex justifyContent='flex-end' flexWrap='nowrap' whiteSpace='nowrap'>
        <Flex flexDir='column' textAlign='right'>
          <Amount.Fiat value={'100'} />
          <Amount.Crypto
            display={{ base: 'block', md: 'none' }}
            color='gray.500'
            value={'100'}
            symbol={'BTC'}
          />
        </Flex>
      </Flex>
    </SimpleGrid>
  )
}
