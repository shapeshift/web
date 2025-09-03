import type { TextProps } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { RawText } from '@/components/Text'
import type { TranslateFunction } from '@/lib/translate'
import { chainIdToChainDisplayName } from '@/lib/utils'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AssetNameProps = {
  assetId: AssetId
  postFix?: string
  showAssetSymbol?: boolean
  ref?: React.RefObject<HTMLDivElement> | ((el: HTMLElement | null) => void)
} & TextProps

export const buildAssetTitle = (
  asset: Asset,
  translate: TranslateFunction,
  postFix?: string,
  showAssetSymbol?: boolean,
): string => {
  if (showAssetSymbol && postFix) {
    return `${asset.symbol} ${postFix}`
  }

  if (showAssetSymbol) {
    return asset.symbol
  }

  if (postFix) {
    return `${asset.name} ${postFix}`
  }

  if (asset.relatedAssetKey && asset.relatedAssetKey !== asset.assetId) {
    return translate('common.assetOnChain', {
      assetName: asset.name,
      chainName: chainIdToChainDisplayName(asset.chainId),
    })
  }

  return asset.name
}

export const AssetName = ({
  assetId,
  postFix,
  showAssetSymbol,
  children,
  ref,
  ...props
}: AssetNameProps) => {
  const assets = useAppSelector(selectAssets)
  const asset = assets[assetId]
  const translate = useTranslate()

  const assetTitle = useMemo(() => {
    if (!asset) return ''

    return buildAssetTitle(asset, translate, postFix, showAssetSymbol)
  }, [asset, translate, postFix, showAssetSymbol])

  return (
    <RawText {...props} ref={ref}>
      {assetTitle}
      {children}
    </RawText>
  )
}
