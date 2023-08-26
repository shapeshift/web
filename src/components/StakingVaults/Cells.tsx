import { ExternalLinkIcon } from '@chakra-ui/icons'
import type { StackProps } from '@chakra-ui/react'
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
import type { AssetId } from '@shapeshiftoss/caip'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { debounce } from 'lodash'
import { isValidElement, useState } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import type { Asset } from 'lib/asset-service'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetTeaser } from './AssetTeaser'

type AssetCellProps = {
  assetId: AssetId
  subText?: string | JSX.Element
  postFix?: string
  showTeaser?: boolean
  showAssetSymbol?: boolean
  icons?: string[]
  opportunityName?: string
  isExternal?: boolean
  version?: string
} & StackProps

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
  icons,
  opportunityName,
  isExternal,
  version,
  ...rest
}: AssetCellProps) => {
  const [showPopover, setShowPopover] = useState(false)
  const linkColor = useColorModeValue('black', 'white')
  const debouncedHandleMouseEnter = debounce(() => setShowPopover(true), 100)
  const handleOnMouseLeave = debouncedHandleMouseEnter.cancel
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  if (!asset) return null

  const rowTitle = opportunityName ?? buildRowTitle(asset, postFix, showAssetSymbol)

  return (
    <HStack width='full' data-test='defi-earn-asset-row' {...rest}>
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
        <SkeletonCircle isLoaded={!!asset} mr={2} width='auto'>
          {icons && icons.length > 1 ? (
            <PairIcons icons={icons} iconSize='sm' bg='none' />
          ) : (
            <AssetIcon assetId={asset.assetId} size='sm' />
          )}
        </SkeletonCircle>
        <SkeletonText noOfLines={2} isLoaded={!!asset} flex={1}>
          <Stack spacing={0} flex={1} alignItems='flex-start' width='full'>
            <HStack alignItems='center' width='full'>
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
                  noOfLines={1}
                  display='block'
                  maxWidth='100%'
                  color={linkColor}
                  fontSize={{ base: 'sm', md: 'md' }}
                >
                  {rowTitle}
                </RawText>
              </Box>
              {isExternal && <ExternalLinkIcon boxSize={3} />}
            </HStack>
            {typeof subText === 'string' && (
              <RawText fontSize='sm' color='text.subtle' lineHeight='shorter'>
                {subText}
              </RawText>
            )}
            {isValidElement(subText) && subText}
            {version && <RawText>{version}</RawText>}
          </Stack>
        </SkeletonText>
      </HStack>
    </HStack>
  )
}
