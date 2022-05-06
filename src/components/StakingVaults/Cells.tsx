import {
  Box,
  HStack,
  Popover,
  PopoverTrigger,
  SkeletonCircle,
  SkeletonText,
  Stack,
  useColorModeValue,
} from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { debounce } from 'lodash'
import { useState } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetTeaser } from './AssetTeaser'

type AssetCellProps = {
  assetId: AssetId
  subText?: string
  postFix?: string
  showTeaser?: boolean
  showAssetSymbol?: boolean
}

const buildRowTitle = (asset: Asset, postFix?: string, showAssetSymbol?: boolean): string => {
  if (showAssetSymbol && postFix) {
    return `${asset.symbol} ${postFix}`
  }

  if (showAssetSymbol) {
    return asset.symbol
  }

  if (postFix) {
    return `${asset.name} ${postFix}`
  }

  return asset.name
}

export const AssetCell = ({
  assetId,
  subText,
  showTeaser,
  showAssetSymbol,
  postFix,
}: AssetCellProps) => {
  const [showPopover, setShowPopover] = useState(false)
  const linkColor = useColorModeValue('black', 'white')
  const debouncedHandleMouseEnter = debounce(() => setShowPopover(true), 100)
  const handleOnMouseLeave = debouncedHandleMouseEnter.cancel
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  if (!asset) return null

  const rowTitle = buildRowTitle(asset, postFix, showAssetSymbol)

  return (
    <HStack width='full' data-test='defi-earn-asset-row'>
      {showTeaser && (
        <Popover isOpen={showPopover} onClose={() => setShowPopover(false)}>
          <PopoverTrigger>
            <Box onMouseEnter={debouncedHandleMouseEnter} onMouseLeave={handleOnMouseLeave}>
              <FaInfoCircle />
            </Box>
          </PopoverTrigger>
          {showPopover && <AssetTeaser assetId={assetId} />}
        </Popover>
      )}
      <HStack flex={1}>
        <SkeletonCircle isLoaded={!!asset}>
          <AssetIcon src={asset.icon} boxSize='8' />
        </SkeletonCircle>
        <SkeletonText noOfLines={2} isLoaded={!!asset} flex={1}>
          <Stack spacing={0} flex={1}>
            <HStack>
              <Box
                position='relative'
                overflow='hidden'
                height='20px'
                width='full'
                title={rowTitle}
                data-test={`account-row-asset-name-${asset.symbol}`}
                _after={{
                  content: 'attr(title)',
                  overflow: 'hidden',
                  height: 0,
                  display: 'block',
                }}
              >
                <RawText
                  fontWeight='medium'
                  as='span'
                  position='absolute'
                  lineHeight='shorter'
                  isTruncated
                  display='block'
                  maxWidth='100%'
                  color={linkColor}
                >
                  {rowTitle}
                </RawText>
              </Box>
            </HStack>
            {subText && (
              <RawText fontSize='sm' color='gray.500' lineHeight='shorter'>
                {subText}
              </RawText>
            )}
          </Stack>
        </SkeletonText>
      </HStack>
    </HStack>
  )
}
