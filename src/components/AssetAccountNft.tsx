import { Grid, GridItem, Image, Stack } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import type { ethereum } from '@keepkey/chain-adapters'
import { KnownChainIds } from '@keepkey/types'
import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Route } from 'Routes/helpers'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { colors } from 'theme/colors'

import { Card } from './Card/Card'

type AssetDetailsProps = {
  assetId: AssetId
  accountId?: AccountSpecifier
  route?: Route
}

const moduleLogger = logger.child({
  namespace: ['AssetAccountNft'],
})

export const AssetAccountNft = ({ assetId }: AssetDetailsProps) => {
  const [nfts, setNfts] = useState([])
  const translate = useTranslate()
  const adapterManager = useMemo(() => getChainAdapterManager(), [])
  const { state: walletState } = useWallet()

  useEffect(() => {
    ;(async (): Promise<unknown> => {
      try {
        const adapter = adapterManager.get(
          KnownChainIds.EthereumMainnet,
        ) as unknown as ethereum.ChainAdapter

        if (!walletState.wallet) return
        const bip44Params = adapter.getBIP44Params({ accountNumber: 0 })
        const address = await adapter.getAddress({ wallet: walletState.wallet, bip44Params })
        if (!address) throw new Error(`Can't get address`)

        const { data } = await axios.get(`https://api.opensea.io/api/v1/assets?owner=${address}`)
        if (data?.assets.length > 0) setNfts(data.assets)
      } catch (e) {
        moduleLogger.error(e, `Failed to get NFT's`)
        return null
      }
    })()
  }, [adapterManager, walletState])

  if (assetId !== 'eip155:1/slip44:60' || nfts.length === 0) return null

  return (
    <Card>
      <Card.Header>
        <Card.Heading>{translate('assets.assetDetails.nft.nftAllocation')}</Card.Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          <Grid templateColumns='repeat(auto-fit,minmax(200px,1fr))' gap='1rem'>
            {nfts.map((nft: any) => (
              <GridItem
                key={nft.permalink}
                cursor='pointer'
                onClick={() => window.open(nft.permalink, '_blank')}
              >
                <Image
                  height='100%'
                  style={{ background: nft.background_color ?? colors.gray[100] }}
                  src={
                    nft.image_thumbnail_url ?? 'https://opensea.io/static/images/placeholder.png'
                  }
                />
              </GridItem>
            ))}
          </Grid>
        </Stack>
      </Card.Body>
    </Card>
  )
}
