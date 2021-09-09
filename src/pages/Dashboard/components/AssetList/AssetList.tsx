import { Flex, Image, Progress, SimpleGrid, useColorModeValue } from '@chakra-ui/react'
import { BalanceResponse } from '@shapeshiftoss/chain-adapters'
import BigNumber from 'bignumber.js'
import { RawText } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { Link } from 'react-router-dom'

type AssetListProps = {
  balances: Record<string, BalanceResponse>
}

type Asset = {
  icon: string
  displayName: string
  symbol: string
  fiatPrice: string
  fiatValue: string
  displayBalance: string
}

export const AssetList = ({ balances }: AssetListProps) => {
  const rowHover = useColorModeValue('gray.100', 'gray.750')

  const assets: Asset[] = Object.entries(balances).reduce((acc: Asset[], [_, value]) => {
    const price = '3000' // TODO: get real pricing data for asset

    const asset = {
      icon: 'https://static.coincap.io/assets/icons/256/btc.png', // TODO: get asset icon
      displayName: value.network,
      symbol: value.symbol,
      fiatPrice: price,
      fiatValue: new BigNumber(fromBaseUnit(value.balance, 18)).times(price).toString(),
      displayBalance: fromBaseUnit(value.balance, 18)
    }

    if (value.tokens?.length) {
      value.tokens.forEach(token => {
        if (token.balance !== '0') {
          acc.push({
            icon: 'https://static.coincap.io/assets/icons/256/btc.png',
            displayName: token.name,
            symbol: token.symbol ?? '',
            fiatPrice: price,
            fiatValue: new BigNumber(fromBaseUnit(token.balance ?? '0', token.decimals ?? 18))
              .times(price)
              .toString(),
            displayBalance: fromBaseUnit(token.balance ?? '0', token.decimals ?? 18)
          })
        }
      })
    }

    acc.push(asset)

    return acc
  }, [])

  return (
    <>
      {assets.map((asset, index) => {
        return (
          <SimpleGrid
            key={index}
            as={Link}
            to='/assets/ethereum'
            _hover={{ bg: rowHover }}
            templateColumns={{ base: '1fr auto', lg: '250px 1fr auto 1fr' }}
            py={4}
            pl={4}
            pr={4}
            rounded='lg'
            gridGap={0}
            alignItems='center'
          >
            <Flex alignItems='center'>
              <Image src={asset.icon} boxSize='10' />
              <RawText ml={2}>{asset.displayName}</RawText>
            </Flex>
            <Flex textAlign='left'>
              <RawText>${asset.fiatValue}</RawText>
              <RawText color='gray.500' ml={2}>
                {`${asset.displayBalance} ${asset.symbol}`}
              </RawText>
            </Flex>
            <Flex display={{ base: 'none', lg: 'flex' }}>
              <RawText>{asset.fiatPrice}</RawText>
            </Flex>
            <Flex
              display={{ base: 'none', lg: 'flex' }}
              alignItems='center'
              justifyContent='flex-end'
            >
              <Progress
                bg='transparent'
                variant='right-aligned'
                colorScheme='green'
                size='sm'
                value={100}
                rounded='full'
                width='100px'
                mr={4}
              />
              <RawText>{'Calculate allocation'}</RawText>
            </Flex>
          </SimpleGrid>
        )
      })}
    </>
  )
}
