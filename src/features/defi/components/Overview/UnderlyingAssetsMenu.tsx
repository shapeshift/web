import { ChevronDownIcon } from '@chakra-ui/icons'
import { Box, Flex, Popover, PopoverBody, PopoverContent, PopoverTrigger } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'

import { PairIcons } from '../PairIcons/PairIcons'
import type { AssetWithBalance } from './Overview'
import { UnderlyingAssetsTags } from './UnderlyingAssetsTags'

type UnderlyingAssetsMenuProps = {
  underlyingAsset: AssetWithBalance
  underlyingAssets: AssetWithBalance[]
}
export const UnderlyingAssetsMenu = ({
  underlyingAsset,
  underlyingAssets,
}: UnderlyingAssetsMenuProps) => (
  <Box>
    <Popover matchWidth>
      <PopoverTrigger>
        <Box cursor='pointer'>
          <UnderlyingAssetsTags underlyingAssets={[underlyingAsset]} showPercentage={false}>
            <ChevronDownIcon />
          </UnderlyingAssetsTags>
        </Box>
      </PopoverTrigger>
      <PopoverContent minWidth='200px'>
        <PopoverBody>
          {underlyingAssets.map(asset => (
            <Flex key={asset.symbol} columnGap={2} alignItems='center'>
              {asset.icons ? (
                <PairIcons icons={asset.icons} iconSize='2xs' bg='transparent' />
              ) : (
                <AssetIcon src={asset.icon} size='2xs' />
              )}
              <Amount.Crypto fontSize='sm' value={asset.cryptoBalance} symbol={asset.symbol} />
              {asset.allocationPercentage && (
                <Amount.Percent
                  color='gray.500'
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
