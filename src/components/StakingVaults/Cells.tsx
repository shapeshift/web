import { ExternalLinkIcon } from '@chakra-ui/icons'
import type { StackProps } from '@chakra-ui/react'
import {
  Box,
  HStack,
  Icon,
  Popover,
  PopoverTrigger,
  SkeletonCircle,
  SkeletonText,
  Stack,
  useColorModeValue,
  useMediaQuery,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { debounce } from 'lodash'
import type { JSX } from 'react'
import { isValidElement, useCallback, useState } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { TbAlertTriangle } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { TooltipWithTouch } from '../TooltipWithTouch'
import { AssetTeaser } from './AssetTeaser'

import { AssetIcon } from '@/components/AssetIcon'
import { RawText } from '@/components/Text'
import { PairIcons } from '@/features/defi/components/PairIcons/PairIcons'
import { selectAssetById, selectIsSpamMarkedByAssetId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

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
  isGrouped?: boolean
} & StackProps

const rowTitleBoxAfter = {
  content: 'attr(title)',
  overflow: 'hidden',
  height: 0,
  display: 'block',
}

const rowTitleTextFontSize = { base: 'sm', md: 'md' }

const buildRowTitle = (
  asset: Asset,
  postFix?: string,
  showAssetSymbol?: boolean,
  isGrouped?: boolean,
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

  if (isGrouped) {
    return asset.name.split(' on ')[0] ?? asset.name
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
  isGrouped,
  ...rest
}: AssetCellProps) => {
  const translate = useTranslate()
  const [showPopover, setShowPopover] = useState(false)
  const linkColor = useColorModeValue('black', 'white')
  const debouncedHandleMouseEnter = debounce(() => setShowPopover(true), 100)
  const handleOnMouseLeave = debouncedHandleMouseEnter.cancel
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const isSpamMarked = useAppSelector(state => selectIsSpamMarkedByAssetId(state, assetId))

  const handlePopoverClose = useCallback(() => setShowPopover(false), [])

  if (!asset) return null

  const rowTitle = opportunityName ?? buildRowTitle(asset, postFix, showAssetSymbol, isGrouped)

  return (
    <HStack width='full' data-test='defi-earn-asset-row' {...rest}>
      {showTeaser && (
        <Popover isOpen={showPopover} onClose={handlePopoverClose}>
          <PopoverTrigger>
            <Box onMouseEnter={debouncedHandleMouseEnter} onMouseLeave={handleOnMouseLeave}>
              <FaInfoCircle />
            </Box>
          </PopoverTrigger>
          {showPopover && <AssetTeaser assetId={assetId} />}
        </Popover>
      )}
      <HStack flex={1} width='100%'>
        <SkeletonCircle isLoaded={!!asset} mr={2} width='auto' height='auto'>
          {icons && icons.length > 1 ? (
            <PairIcons icons={icons} iconSize='sm' bg='none' />
          ) : (
            <AssetIcon assetId={asset.assetId} size='md' showNetworkIcon={!isGrouped} />
          )}
        </SkeletonCircle>
        <SkeletonText noOfLines={2} isLoaded={!!asset} flex={1} width='50%'>
          <Stack spacing={0} flex={1} alignItems='flex-start' width='full'>
            <HStack alignItems='center' width='full'>
              <Box
                position='relative'
                overflow='hidden'
                height='20px'
                width='full'
                title={rowTitle}
                wordBreak='break-all'
                data-test={`account-row-asset-name-${asset.symbol}`}
                _after={rowTitleBoxAfter}
              >
                <RawText
                  fontWeight='semibold'
                  as='span'
                  position='absolute'
                  lineHeight='shorter'
                  whiteSpace='nowrap'
                  noOfLines={1}
                  display='block'
                  maxWidth='100%'
                  color={linkColor}
                  fontSize={rowTitleTextFontSize}
                >
                  {rowTitle}
                </RawText>
              </Box>
              {isExternal && <ExternalLinkIcon boxSize={4} />}
              {isSpamMarked && !isLargerThanMd && (
                <TooltipWithTouch label={translate('assets.spam.marked')}>
                  <Icon as={TbAlertTriangle} boxSize={4} color='yellow' />
                </TooltipWithTouch>
              )}
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
