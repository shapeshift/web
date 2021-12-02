import { Box, Grid, Stack } from '@chakra-ui/react'
import { caip19 } from '@shapeshiftoss/caip'
import { Asset, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import { useYearn } from 'features/earn/contexts/YearnProvider/YearnProvider'
import { SUPPORTED_VAULTS } from 'features/earn/providers/yearn/constants/vaults'
import toLower from 'lodash/toLower'
import { useEffect, useState } from 'react'
import { AccountRow } from 'components/AccountRow/AccountRow'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useFeature } from 'hooks/useFeature/useFeature'

type UnderlyingTokenProps = {
  asset: Asset
}

// TODO: currently this is hard coded to yearn vaults only.
// In the future we should add a hook to get the provider interface by vault provider
export const UnderlyingToken = ({ asset }: UnderlyingTokenProps) => {
  const earnFeature = useFeature(FeatureFlagEnum.Yearn)
  const [underlyingCAIP19, setUnderlyingCAIP19] = useState('')
  const [balance, setBalance] = useState('')
  const { loading, yearn } = useYearn()

  // account info
  const chainAdapterManager = useChainAdapters()
  const chainAdapter = chainAdapterManager.byChain(asset.chain)
  const {
    state: { wallet }
  } = useWallet()

  const vault = SUPPORTED_VAULTS.find(_vault => _vault.vaultAddress === asset.tokenId)
  const shouldHide = !earnFeature || !asset.tokenId || !yearn || !vault

  useEffect(() => {
    ;(async () => {
      try {
        if (shouldHide || !wallet) return
        const [token, userAddress] = await Promise.all([
          yearn.token({ vaultAddress: asset.tokenId! }),
          chainAdapter.getAddress({ wallet })
        ])
        const _balance = await yearn.balance({
          vaultAddress: asset.tokenId!,
          userAddress
        })
        setBalance(_balance.toString())
        const chain = asset.chain
        const network = NetworkTypes.MAINNET
        const contractType = ContractTypes.ERC20
        const tokenId = toLower(token)
        setUnderlyingCAIP19(caip19.toCAIP19({ chain, network, contractType, tokenId }))
      } catch (error) {
        console.error(error)
      }
    })()
  }, [shouldHide, asset.tokenId, asset.chain, chainAdapter, vault, wallet, yearn])

  if (shouldHide || loading) return null

  return (
    <Card>
      <Card.Header flexDir='row' display='flex'>
        <Box>
          <Card.Heading>
            <Text translation='assets.assetCards.underlyingAssets' />
          </Card.Heading>
        </Box>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          <Grid
            templateColumns={{ base: '1fr repeat(2, 1fr)', lg: '2fr repeat(3, 1fr) 150px' }}
            gap='1rem'
            pl={4}
            pr={4}
          >
            <Text translation='dashboard.portfolio.asset' color='gray.500' />
            <Text translation='dashboard.portfolio.balance' color='gray.500' textAlign='right' />
            <Text
              translation='dashboard.portfolio.price'
              color='gray.500'
              textAlign='right'
              display={{ base: 'none', lg: 'block' }}
            />
            <Text translation='dashboard.portfolio.value' textAlign='right' color='gray.500' />
            <Text
              translation='dashboard.portfolio.allocation'
              color='gray.500'
              textAlign='right'
              display={{ base: 'none', lg: 'block' }}
            />
          </Grid>
          <AccountRow allocationValue={100} balance={balance} CAIP19={underlyingCAIP19} />
        </Stack>
      </Card.Body>
    </Card>
  )
}
