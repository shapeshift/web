import { Flex, HStack } from '@chakra-ui/layout'
import { Button, Skeleton, SkeletonCircle } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import { caip19 } from '@shapeshiftoss/caip'
import { ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useYearn } from 'features/earn/contexts/YearnProvider/YearnProvider'
import { YearnVault } from 'features/earn/providers/yearn/api/api'
import { SupportedYearnVault } from 'features/earn/providers/yearn/constants/vaults'
import qs from 'qs'
import { useEffect, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'
import { useMarketData } from 'hooks/useMarketData/useMarketData'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'

export const StakingVaultRow = ({
  type,
  provider,
  vaultAddress,
  tokenAddress,
  chain,
  symbol,
  isLoaded
}: SupportedYearnVault & { isLoaded: boolean }) => {
  const [vault, setVault] = useState<YearnVault | null>(null)
  const [cryptoAmount, setCryptoAmount] = useState<BigNumber>(bnOrZero(0))
  const [fiatAmount, setFiatAmount] = useState<BigNumber>(bnOrZero(0))
  const { yearn, loading } = useYearn()
  const history = useHistory()
  const location = useLocation()

  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20
  // asset
  const assetCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId: tokenAddress })
  const asset = useFetchAsset(assetCAIP19)
  const marketData = useMarketData(assetCAIP19)

  // account info
  const chainAdapterManager = useChainAdapters()
  const chainAdapter = chainAdapterManager.byChain(chain)
  const {
    state: { isConnected, wallet },
    dispatch
  } = useWallet()

  const handleClick = () => {
    isConnected
      ? history.push({
          pathname: `/earn/${type}/${provider}/deposit`,
          search: qs.stringify({
            chain,
            contractAddress: vaultAddress,
            tokenId: tokenAddress
          }),
          state: { background: location }
        })
      : dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }

  useEffect(() => {
    ;(async () => {
      if (!yearn || !wallet || loading) return null
      try {
        const _vault = yearn.findByDepositTokenId(tokenAddress)
        if (_vault) setVault(_vault)
        const userAddress = await chainAdapter.getAddress({ wallet })
        // TODO: currently this is hard coded to yearn vaults only.
        // In the future we should add a hook to get the provider interface by vault provider
        const [balance, pricePerShare] = await Promise.all([
          yearn.balance({ vaultAddress, userAddress }),
          yearn.pricePerShare({ vaultAddress })
        ])
        const amount = bnOrZero(balance).div(`1e+${vault?.decimals}`)
        const price = pricePerShare.div(`1e+${vault?.decimals}`).times(marketData?.price)
        setCryptoAmount(amount)
        setFiatAmount(amount.times(price))
      } catch (error) {
        console.error('StakingVaultRow useEffect', error)
      }
    })()
  }, [
    chainAdapter,
    loading,
    marketData?.price,
    tokenAddress,
    vault?.decimals,
    vaultAddress,
    wallet,
    yearn
  ])

  if (!asset || !vault || !yearn || loading) return null

  return (
    <Button
      width='full'
      height='auto'
      justifyContent='space-between'
      variant='ghost'
      fontWeight='normal'
      py={2}
      onClick={handleClick}
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
          {cryptoAmount.gt(0) ? (
            <HStack>
              <Amount.Fiat value={fiatAmount.toString()} color='green.500' />
              <Amount.Crypto value={cryptoAmount.toString()} symbol={symbol} prefix='≈' />
            </HStack>
          ) : (
            <Button as='span' colorScheme='blue' variant='ghost-filled' size='sm'>
              <Text translation='common.getStarted' />
            </Button>
          )}
        </Skeleton>
      </Flex>
    </Button>
  )
}
