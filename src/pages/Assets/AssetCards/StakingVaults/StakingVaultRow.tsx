import { Flex, HStack } from '@chakra-ui/layout'
import { Button, Skeleton, SkeletonCircle } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import qs from 'qs'
import { Link, useLocation } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'
import { SupportedYearnVault } from 'context/EarnManagerProvider/providers/yearn/constants/vaults'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'

export const StakingVaultRow = ({
  type,
  provider,
  vaultAddress,
  tokenAddress,
  chain,
  isLoaded
}: SupportedYearnVault & { isLoaded: boolean }) => {
  const location = useLocation()
  const asset = useFetchAsset({ chain, tokenId: tokenAddress })

  /* @TODO: Get this from somewhere */
  const apy = '0.05'
  const cryptoAmount = '100'
  const fiatAmount = '100'
  if (!asset) return null
  return (
    <Button
      as={Link}
      width='full'
      height='auto'
      justifyContent='space-between'
      variant='ghost'
      fontWeight='normal'
      py={2}
      to={{
        pathname: `/earn/${type}/${provider}/deposit`,
        search: qs.stringify({
          chain,
          contractAddress: vaultAddress,
          tokenId: tokenAddress
        }),
        state: { background: location }
      }}
    >
      <Flex alignItems='center'>
        <Flex mr={4}>
          <SkeletonCircle boxSize='8' isLoaded={isLoaded}>
            <AssetIcon src={asset?.icon} boxSize='8' />
          </SkeletonCircle>
        </Flex>
        <Skeleton isLoaded={isLoaded}>
          <RawText size='lg' fontWeight='bold'>{`${asset.symbol} ${type}`}</RawText>
        </Skeleton>
        <Skeleton isLoaded={isLoaded} ml={4}>
          <Tag colorScheme='blue' size='sm' fontWeight='bold'>
            <Amount.Percent value={apy} />
          </Tag>
        </Skeleton>
      </Flex>
      <Flex>
        <Skeleton isLoaded={isLoaded}>
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
        </Skeleton>
      </Flex>
    </Button>
  )
}
