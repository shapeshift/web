import { Flex, HStack } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import { ChainTypes } from '@shapeshiftoss/types'
import qs from 'qs'
import { Link, useLocation } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'

export type StakingVaultRowProps = {
  type: string
  provider: string
  contractAddress: string
  tokenId: string
  chain: ChainTypes
  apr: string
  fiatAmount?: string | null
  cryptoAmount?: string | null
}

export const StakingVaultRow = ({
  apr,
  type,
  provider,
  contractAddress,
  tokenId,
  chain,
  cryptoAmount,
  fiatAmount
}: StakingVaultRowProps) => {
  const asset = useFetchAsset({ chain, tokenId })
  const location = useLocation()
  return (
    <Button
      as={Link}
      width='full'
      height='auto'
      justifyContent='space-between'
      variant='ghost'
      py={2}
      to={{
        pathname: `/earn/${type}/${provider}/deposit`,
        search: qs.stringify({
          chain,
          contractAddress,
          tokenId
        }),
        state: { background: location }
      }}
    >
      <Flex alignItems='center'>
        <Flex>
          <AssetIcon src={asset.icon} boxSize='8' mr={2} />
        </Flex>
        <RawText size='lg'>{`${asset.symbol} ${type}`}</RawText>
        <Tag colorScheme='green' ml={4}>
          <Amount.Percent value={apr} />
        </Tag>
      </Flex>
      <Flex>
        {cryptoAmount && fiatAmount ? (
          <HStack>
            <Amount.Fiat value={fiatAmount} color='green.500' />
            <Amount.Crypto value={cryptoAmount} symbol={asset.symbol} prefix='≈' />
          </HStack>
        ) : (
          <Button colorScheme='blue' variant='ghost-filled' size='sm'>
            <Text translation='common.getStarted' />
          </Button>
        )}
      </Flex>
    </Button>
  )
}
