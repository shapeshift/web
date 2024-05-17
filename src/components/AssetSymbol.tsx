import type { TextProps } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { selectAssetById } from 'state/selectors'
import { useAppSelector } from 'state/store'

import { RawText } from './Text'

type AssetSymbolProps = {
  assetId: AssetId
} & TextProps

export const AssetSymbol: React.FC<AssetSymbolProps> = ({ assetId, ...rest }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) return null
  return <RawText {...rest}>{asset.symbol}</RawText>
}
