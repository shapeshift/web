import { Flex, Tag } from '@chakra-ui/react'
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
    <Flex columnGap={2} flexWrap='wrap' flex={1} justifyContent='space-between'>
      <Amount.Crypto
        whiteSpace='nowrap'
        fontSize='sm'
        value={asset.cryptoBalancePrecision}
        symbol={asset.symbol}
      />
      {showPercentage && asset.allocationPercentage && (
        <Amount.Percent color='text.subtle' value={asset.allocationPercentage} />
      )}
      {children}
    </Flex>
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
