import { Flex, Progress, SimpleGrid, useColorModeValue } from '@chakra-ui/react'
import { ChainTypes } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

const price = '3000'

export const AssetRow = ({
  balance,
  tokenId,
  chain
}: {
  balance: string
  tokenId: string
  chain: ChainTypes
}) => {
  const rowHover = useColorModeValue('gray.100', 'gray.750')
  const contract = useMemo(() => tokenId?.toLowerCase(), [tokenId])
  const url = useMemo(() => {
    let baseUrl = `/assets/${chain}`
    if (contract) baseUrl = baseUrl + `/${contract}`
    return baseUrl
  }, [chain, contract])

  const asset = useFetchAsset({ chain, tokenId: contract })

  const displayValue = useMemo(
    () => (asset ? fromBaseUnit(balance, asset.precision) : 0),
    [asset, balance]
  )

  const fiatValue = useMemo(() => bn(displayValue).times(price).toString(), [displayValue])

  if (!asset || Number(balance) === 0) return null

  return (
    <SimpleGrid
      as={Link}
      to={url}
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
        <AssetIcon src={asset.icon} boxSize='24px' mr={4} />
        <RawText ml={2}>{asset.name}</RawText>
      </Flex>
      <Flex textAlign='left'>
        <RawText>${fiatValue}</RawText>
        <RawText color='gray.500' ml={2}>
          {`${displayValue} ${asset.symbol}`}
        </RawText>
      </Flex>
      <Flex display={{ base: 'none', lg: 'flex' }}>
        <RawText>{price}</RawText>
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
          mr={4}
        />
        <RawText>{'Calculate allocation'}</RawText>
      </Flex>
    </SimpleGrid>
  )
}
