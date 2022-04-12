import { Box, Grid, Stack } from '@chakra-ui/react'
import { AssetNamespace, CAIP19, caip19 } from '@shapeshiftoss/caip'
import { SupportedYearnVault } from '@shapeshiftoss/investor-yearn'
import { NetworkTypes } from '@shapeshiftoss/types'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import toLower from 'lodash/toLower'
import { useEffect, useMemo, useState } from 'react'
import { AccountRow } from 'components/AccountRow/AccountRow'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useYearnVaults } from 'hooks/useYearnVaults/useYearnVaults'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UnderlyingTokenProps = {
  assetId: CAIP19
  accountId?: AccountSpecifier
}

// TODO: currently this is hard coded to yearn vaults only.
// In the future we should add a hook to get the provider interface by vault provider
export const UnderlyingToken = ({ assetId, accountId }: UnderlyingTokenProps) => {
  const [underlyingCAIP19, setUnderlyingCAIP19] = useState('')
  const { loading, yearn } = useYearn()
  const vaults: SupportedYearnVault[] = useYearnVaults()

  // Get asset from caip19
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))

  const {
    state: { wallet },
  } = useWallet()

  const vault = useMemo(() => {
    return vaults.find(_vault => _vault.vaultAddress === asset.tokenId)
  }, [vaults, asset.tokenId])

  const shouldHide = !asset?.tokenId || !yearn || !vault

  useEffect(() => {
    ;(async () => {
      try {
        if (shouldHide || !wallet) return
        const token = await yearn.token({ vaultAddress: asset.tokenId! })
        const chain = asset.chain
        const network = NetworkTypes.MAINNET
        const assetNamespace = AssetNamespace.ERC20
        const assetReference = toLower(token)
        setUnderlyingCAIP19(caip19.toCAIP19({ chain, network, assetNamespace, assetReference }))
      } catch (error) {
        console.error(error)
      }
    })()
  }, [shouldHide, asset.tokenId, asset.chain, vault, wallet, yearn])

  if (shouldHide || loading || !underlyingCAIP19) return null

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
          <AccountRow allocationValue={100} assetId={underlyingCAIP19} />
        </Stack>
      </Card.Body>
    </Card>
  )
}
