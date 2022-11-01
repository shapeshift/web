import { Center, Link, Stack } from '@chakra-ui/react'
import { Button } from '@chakra-ui/react'
import { RawText } from 'components/Text'
import type { KKAsset } from 'context/WalletProvider/KeepKeyProvider'

import { Main } from '../Layout/Main'
import { AssetHeader } from './AssetHeader/AssetHeader'
type AssetDetailsProps = {
  asset: KKAsset
}

export const KKAssetAccountDetails = ({ asset }: AssetDetailsProps) => {
  return (
    <Main titleComponent={<AssetHeader asset={asset} />}>
      <Center>
        <Stack>
          <RawText>RANK: {`${asset.rank}`}</RawText>
          <RawText>MARKET CAP: {`$${asset.marketCap}`}</RawText>
          <Link color='blue.400' isExternal href={asset.link}>
            Visit Coingecko Page
          </Link>
          <Button>VOTE</Button>
        </Stack>
      </Center>
    </Main>
  )
}
