import { Box, Grid, Stack } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import { useYearn } from 'features/earn/contexts/YearnProvider/YearnProvider'
import toLower from 'lodash/toLower'
import { useEffect, useState } from 'react'
import { AccountRow } from 'components/AccountRow/AccountRow'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { SUPPORTED_VAULTS } from 'context/EarnManagerProvider/providers/yearn/constants/vaults'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useFeature } from 'hooks/useFeature/useFeature'

type UnderlyingTokenProps = {
  asset: Asset
}

// TODO: currently this is hard coded to yearn vaults only.
// In the future we should add a hook to get the provider interface by vault provider
export const UnderlyingToken = ({ asset }: UnderlyingTokenProps) => {
  const earnFeature = useFeature(FeatureFlagEnum.Yearn)
  const [tokenId, setTokenId] = useState('')
  const [balance, setBalance] = useState('')
  const yearn = useYearn()

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
        setTokenId(toLower(token))
      } catch (error) {
        console.error(error)
      }
    })()
  }, [shouldHide, asset.tokenId, chainAdapter, vault, wallet, yearn])

  if (shouldHide) return null

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
            py={4}
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
          <AccountRow
            allocationValue={100}
            balance={balance}
            chain={asset.chain}
            tokenId={tokenId}
          />
        </Stack>
      </Card.Body>
    </Card>
  )
}
