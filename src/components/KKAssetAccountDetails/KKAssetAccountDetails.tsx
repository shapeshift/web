import { Textarea } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'

import { Main } from '../Layout/Main'
import { AssetHeader } from './AssetHeader/AssetHeader'
type AssetDetailsProps = {
  asset: Asset
}

export const KKAssetAccountDetails = ({ asset }: AssetDetailsProps) => {
  return (
    <Main titleComponent={<AssetHeader asset={asset} />}>
      <Textarea placeholder={`${JSON.stringify(asset, null, 2)}`} h='400px' />
    </Main>
  )
}
