import type { TagProps } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'

import { PairIcons } from '../PairIcons/PairIcons'
import type { AssetWithBalance } from './Overview'

type UnderlyingAssetsTagProps = {
  asset: AssetWithBalance
  showPercentage?: boolean
  children?: any
}

type UnderlyingAssetsTagsProps = {
  underlyingAssets: AssetWithBalance[]
  showPercentage?: boolean
  children?: any
}

const UnderlyingAssetTag = ({
  asset,
  children,
  showPercentage,
  ...styleProps
}: UnderlyingAssetsTagProps & TagProps) => (
  <Tag variant='xs-subtle' columnGap={2} key={asset.symbol} {...styleProps}>
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
  showPercentage = true,
  children,
  ...styleProps
}: UnderlyingAssetsTagsProps & TagProps) => (
  <>
    {underlyingAssets.map(asset => (
      <UnderlyingAssetTag
        asset={asset}
        children={children}
        showPercentage={showPercentage}
        {...styleProps}
      />
    ))}
  </>
)
