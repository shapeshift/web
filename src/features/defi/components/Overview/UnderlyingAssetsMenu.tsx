import { ChevronDownIcon } from '@chakra-ui/icons'
import { Box, Flex, Popover, PopoverBody, PopoverContent, PopoverTrigger } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'

import { PairIcons } from '../PairIcons/PairIcons'
import type { AssetWithBalance } from './Overview'
import { UnderlyingAssetTag } from './UnderlyingAssetsTags'

type UnderlyingAssetsMenuProps = {
  lpAsset: AssetWithBalance
  underlyingAssets: AssetWithBalance[]
}
export const UnderlyingAssetsMenu = ({ lpAsset, underlyingAssets }: UnderlyingAssetsMenuProps) => (
  <Box>
    <Popover matchWidth>
      <PopoverTrigger>
        <Box cursor='pointer'>
          <UnderlyingAssetTag asset={lpAsset}>
            <ChevronDownIcon />
          </UnderlyingAssetTag>
        </Box>
      </PopoverTrigger>
      <PopoverContent minWidth='200px'>
        <PopoverBody>
          {underlyingAssets.map(asset => (
            <Flex key={asset.symbol} columnGap={2} alignItems='center'>
              {asset.icons ? (
                <PairIcons icons={asset.icons} iconSize='2xs' bg='transparent' />
              ) : (
                <AssetIcon assetId={asset.assetId} size='2xs' />
              )}
              <Amount.Crypto
                fontSize='sm'
                value={asset.cryptoBalancePrecision}
                symbol={asset.symbol}
              />
              {asset.allocationPercentage && (
                <Amount.Percent
                  color='text.subtle'
                  fontSize='sm'
                  ml='auto'
                  value={asset.allocationPercentage}
                />
              )}
            </Flex>
          ))}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  </Box>
)
