import { ExternalLinkIcon } from '@chakra-ui/icons'
import type { StackProps } from '@chakra-ui/react'
import {
  Box,
  HStack,
  Icon,
  SkeletonCircle,
  SkeletonText,
  Stack,
  useColorModeValue,
  useMediaQuery,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { JSX } from 'react'
import { isValidElement } from 'react'
import { TbAlertTriangle } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { TooltipWithTouch } from '../TooltipWithTouch'

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
  showAssetSymbol?: boolean
  icons?: string[]
  opportunityName?: string
  isExternal?: boolean
  version?: string
  isChainSpecific?: boolean
} & StackProps

const rowTitleBoxAfter = {
  content: 'attr(title)',
  overflow: 'hidden',
  height: 0,
  display: 'block',
}

const rowTitleTextFontSize = { base: 'sm', md: 'md' }

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
  showAssetSymbol,
  postFix,
  icons,
  opportunityName,
  isExternal,
  version,
  isChainSpecific,
  ...rest
}: AssetCellProps) => {
  const translate = useTranslate()
  const linkColor = useColorModeValue('black', 'white')
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const isSpamMarked = useAppSelector(state => selectIsSpamMarkedByAssetId(state, assetId))

  if (!asset) return null

  const rowTitle = opportunityName ?? buildRowTitle(asset, postFix, showAssetSymbol)

  return (
    <HStack width='full' data-test='defi-earn-asset-row' {...rest}>
      <HStack flex={1} width='100%'>
        <SkeletonCircle isLoaded={!!asset} mr={2} width='auto' height='auto'>
          {icons && icons.length > 1 ? (
            <PairIcons icons={icons} iconSize='sm' bg='none' />
          ) : (
            <AssetIcon assetId={asset.assetId} size='md' showNetworkIcon={isChainSpecific} />
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
