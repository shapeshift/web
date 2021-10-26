import { Flex, Progress, SimpleGrid, useColorModeValue } from '@chakra-ui/react'
import { ChainTypes } from '@shapeshiftoss/types'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import { useGetAssetData } from 'hooks/useAsset/useAsset'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

export const AssetRow = ({
  balance,
  tokenId,
  chain
}: {
  balance: string
  tokenId: string
  chain: ChainTypes
}) => {
  const [price, setPrice] = useState('0')
  const rowHover = useColorModeValue('gray.100', 'gray.750')
  const contract = useMemo(() => tokenId?.toLowerCase(), [tokenId])
  const url = useMemo(() => {
    let baseUrl = `/assets/${chain}`
    if (contract) baseUrl = baseUrl + `/${contract}`
    return baseUrl
  }, [chain, contract])

  const asset = useFetchAsset({ chain, tokenId: contract })
  const fetchMarketData = useGetAssetData({ chain, tokenId: contract })

  useEffect(() => {
    ;(async () => {
      if (asset) {
        const marketData = await fetchMarketData({ chain: asset.chain, tokenId: asset.tokenId })
        setPrice(marketData?.price)
      }
    })()
  }, [asset, fetchMarketData])

  const displayValue = useMemo(
    () => (asset ? fromBaseUnit(balance, asset.precision) : 0),
    [asset, balance]
  )

  const fiatValue = useMemo(
    () => bn(displayValue).times(price).toFixed(4).toString(),
    [displayValue, price]
  )

  if (!asset || Number(balance) === 0) return null

  return (
    <SimpleGrid
      as={Link}
      to={url}
      _hover={{ bg: rowHover }}
      templateColumns={{ base: '1fr auto', lg: '2fr repeat(3, 1fr)' }}
      py={4}
      pl={4}
      pr={4}
      rounded='lg'
      gridGap={0}
      alignItems='center'
    >
      <Flex alignItems='center'>
        <AssetIcon src={asset.icon} boxSize='24px' mr={4} />
        <RawText ml={2}>{asset.name}</RawText>
      </Flex>
      <Flex justifyContent='flex-end'>
        <RawText>${fiatValue}</RawText>
        <RawText color='gray.500' ml={2}>
          {`${displayValue} ${asset.symbol}`}
        </RawText>
      </Flex>
      <Flex display={{ base: 'none', lg: 'flex' }} justifyContent='flex-end'>
        <RawText>{`$${price}`}</RawText>
      </Flex>
      <Flex display={{ base: 'none', lg: 'flex' }} alignItems='center' justifyContent='flex-end'>
        <Progress
          bg='transparent'
          variant='right-aligned'
          colorScheme='green'
          size='sm'
          value={100}
          rounded='full'
          width='100px'
        />
      </Flex>
    </SimpleGrid>
  )
}
