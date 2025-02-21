import type { TextProps } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftmonorepo/caip'

import { RawText } from './Text'

import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AssetSymbolProps = {
  assetId: AssetId
} & TextProps

export const AssetSymbol: React.FC<AssetSymbolProps> = ({ assetId, ...rest }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) return null
  return <RawText {...rest}>{asset.symbol}</RawText>
}
