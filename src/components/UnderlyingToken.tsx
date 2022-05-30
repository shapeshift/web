import { Box, Grid, Stack } from '@chakra-ui/react'
import { AssetId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { SupportedYearnVault } from '@shapeshiftoss/investor-yearn'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import toLower from 'lodash/toLower'
import { useEffect, useMemo, useState } from 'react'
import { AccountRow } from 'components/AccountRow/AccountRow'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useYearnVaults } from 'hooks/useYearnVaults/useYearnVaults'
import { logger } from 'lib/logger'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UnderlyingTokenProps = {
  assetId: AssetId
  accountId?: AccountSpecifier
}

const moduleLogger = logger.child({ namespace: ['UnderlyingToken'] })
// TODO: currently this is hard coded to yearn vaults only.
// In the future we should add a hook to get the provider interface by vault provider
export const UnderlyingToken = ({ assetId }: UnderlyingTokenProps) => {
  const [underlyingAssetId, setUnderlyingAssetId] = useState('')
  const { loading, yearn } = useYearn()
  const vaults: SupportedYearnVault[] = useYearnVaults()

  // Get asset from assetId
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { assetReference } = fromAssetId(assetId)

  const {
    state: { wallet },
  } = useWallet()

  const vault = useMemo(() => {
    return vaults.find(_vault => _vault.vaultAddress === assetReference)
  }, [vaults, assetReference])

  const shouldHide = !assetReference || !yearn || !vault

  useEffect(() => {
    ;(async () => {
      try {
        if (shouldHide || !wallet) return
        moduleLogger.trace(
          { tokenId: assetReference, chain: asset.chainId, fn: 'yearn.token' },
          'Get Yearn Token',
        )
        const token = await yearn.token({ vaultAddress: assetReference })
        const chainId = asset.chainId
        const assetNamespace = 'erc20'
        const yearnAssetReference = toLower(token)
        const assetId = toAssetId({ chainId, assetNamespace, assetReference: yearnAssetReference })
        moduleLogger.trace({ assetId, fn: 'yearn.token' }, 'Yearn Asset')
        setUnderlyingAssetId(assetId)
      } catch (error) {
        moduleLogger.error(error, 'yearn.token() failed')
      }
    })()
  }, [shouldHide, assetReference, vault, wallet, yearn, asset.chainId])

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
