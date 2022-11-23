import { Tag } from '@chakra-ui/react'
import React from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'

import { PairIcons } from '../PairIcons/PairIcons'
import type { AssetWithBalance } from './Overview'

type UnderlyingAssetsTagProps = {
  asset: AssetWithBalance
  showPercentage?: boolean
  children?: React.ReactNode
}

type UnderlyingAssetsTagsProps = {
  underlyingAssets: AssetWithBalance[]
  showPercentage?: boolean
  children?: React.ReactNode
}

export const UnderlyingAssetTag = ({
  asset,
  children,
  showPercentage = false,
}: UnderlyingAssetsTagProps) => (
  <Tag variant='xs-subtle' columnGap={2} key={asset.symbol}>
    {asset.icons ? (
      <PairIcons icons={asset.icons} iconSize='2xs' bg='transparent' />
    ) : (
      <AssetIcon src={asset.icon} size='2xs' />
    )}
    <Amount.Crypto fontSize='sm' value={asset.cryptoBalance} symbol={asset.symbol} />
    {showPercentage && asset.allocationPercentage && (
      <Amount.Percent color='gray.500' value={asset.allocationPercentage} />
    )}
    {children}
  </Tag>
)
export const UnderlyingAssetsTags = ({
  underlyingAssets,
  showPercentage = false,
  children,
}: UnderlyingAssetsTagsProps) => (
  <>
    {underlyingAssets.map(asset => (
      <UnderlyingAssetTag
        key={asset.assetId}
        asset={asset}
        children={children}
        showPercentage={showPercentage}
      />
    ))}
  </>
)
