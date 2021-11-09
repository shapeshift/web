import { Flex, HStack } from '@chakra-ui/layout'
import { Button, Skeleton, SkeletonCircle } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import { ChainTypes } from '@shapeshiftoss/types'
import qs from 'qs'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { YearnVault, YearnVaultApi } from 'context/EarnManagerProvider/providers/yearn/api/api'
import { SupportedYearnVault } from 'context/EarnManagerProvider/providers/yearn/constants/vaults'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'
import { useMarketData } from 'hooks/useMarketData/useMarketData'
import { bnOrZero } from 'lib/bignumber/bignumber'

export const StakingVaultRow = ({
  yearn,
  type,
  provider,
  vaultAddress,
  tokenAddress,
  chain,
  isLoaded
}: SupportedYearnVault & { yearn: YearnVaultApi; isLoaded: boolean }) => {
  const [vault, setVault] = useState<YearnVault | null>(null)
  const [cryptoAmount, setCryptoAmount] = useState<string>('0')
  const location = useLocation()

  // asset
  const asset = useFetchAsset({ chain, tokenId: tokenAddress })
  const marketData = useMarketData({ chain, tokenId: tokenAddress })

  // account info
  const chainAdapterManager = useChainAdapters()
  const chainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
  const {
    state: { wallet }
  } = useWallet()

  useEffect(() => {
    ;(async () => {
      const _vault = yearn.findByDepositTokenId(tokenAddress)
      if (_vault) setVault(_vault)
      try {
        if (!wallet) return
        const userAddress = await chainAdapter.getAddress({ wallet })
        // TODO: currently this is hard coded to yearn vaults only.
        // In the future we should add a hook to get the provider interface by vault provider
        const balance = await yearn.balance({ vaultAddress, userAddress })
        setCryptoAmount(balance.toString())
      } catch (error) {
        console.error('StakingVaultRow useEffect', error)
      }
    })()
  }, [chainAdapter, tokenAddress, vaultAddress, wallet, yearn])

  if (!asset || !vault) return null

  const fiatAmount = bnOrZero(cryptoAmount)
    .div(`1e+${vault.decimals}`)
    .times(marketData.price)
    .toFixed(2)

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
          <Tag colorScheme='green'>
            <Amount.Percent value={bnOrZero(vault?.apy.net_apy).toString()} />
          </Tag>
        </Skeleton>
      </Flex>
      <Flex>
        <Skeleton isLoaded={isLoaded}>
          {!cryptoAmount ? (
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
