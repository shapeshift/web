import type { Asset } from '@shapeshiftoss/asset-service'

import { Main } from '../Layout/Main'
import { RawText } from '../Text'
import { AssetHeader } from './AssetHeader/AssetHeader'
type AssetDetailsProps = {
  asset: Asset
}

export const KKAssetAccountDetails = ({ asset }: AssetDetailsProps) => {
  return (
    <Main titleComponent={<AssetHeader asset={asset} />}>
      <RawText>Unsupported asset, vote!!!</RawText>
      <RawText>blahblah buy tokens mint nfts </RawText>
    </Main>
  )
}
