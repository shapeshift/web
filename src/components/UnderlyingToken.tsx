import { Box, Grid, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import type { SerializableOpportunity } from 'features/defi/providers/yearn/components/YearnManager/Deposit/DepositCommon'
import { useEffect, useMemo, useState } from 'react'
import { AccountRow } from 'components/AccountRow/AccountRow'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useYearnVaults } from 'hooks/useYearnVaults/useYearnVaults'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UnderlyingTokenProps = {
  assetId: AssetId
  accountId?: AccountId
}

// TODO: currently this is hard coded to yearn vaults only.
// In the future we should add a hook to get the provider interface by vault provider
export const UnderlyingToken = ({ assetId }: UnderlyingTokenProps) => {
  const [underlyingAssetId, setUnderlyingAssetId] = useState('')
  const { loading, yearn: yearnInvestor } = useYearn()
  const vaults: SerializableOpportunity[] = useYearnVaults()

  // Get asset from assetId
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const {
    state: { wallet },
  } = useWallet()

  const vault = useMemo(() => {
    return vaults.find(_vault => _vault.positionAsset.assetId === asset.assetId)
  }, [vaults, asset.assetId])

  const shouldHide = !asset?.assetId || !yearnInvestor || !vault

  useEffect(() => {
    ;(async () => {
      try {
        if (shouldHide || !wallet) return
        const opportunity = await yearnInvestor.findByOpportunityId(asset.assetId!)
        if (!opportunity) return
        const assetId = opportunity.underlyingAsset.assetId
        setUnderlyingAssetId(assetId)
      } catch (error) {
        console.error(error)
      }
    })()
  }, [shouldHide, asset.chainId, asset.assetId, vault, wallet, yearnInvestor])

  if (shouldHide || loading || !underlyingAssetId) return null

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
          <AccountRow allocationValue={100} assetId={underlyingAssetId} />
        </Stack>
      </Card.Body>
    </Card>
  )
}
