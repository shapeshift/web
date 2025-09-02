import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, Flex, Tag, TagLeftIcon, Text, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { RiArrowLeftDownLine, RiArrowRightUpLine } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { useLongPress } from 'use-long-press'

import type { AssetData } from './AssetList'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { GroupedAssetRow } from '@/components/AssetSearch/components/GroupedAssetRow'
import { defaultLongPressConfig } from '@/constants/longPress'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { firstNonZeroDecimal } from '@/lib/math'
import { middleEllipsis } from '@/lib/utils'
import { vibrate } from '@/lib/vibrate'
import { isAssetSupportedByWallet } from '@/state/slices/portfolioSlice/utils'
import { selectRelatedAssetIdsInclusiveSorted } from '@/state/slices/related-assets-selectors'
import {
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByAssetId
} from '@/state/slices/selectors'
import { useAppSelector, useSelectorWithArgs } from '@/state/store'

const focus = {
  shadow: 'outline-inset',
}

export type AssetRowProps = {
  asset: Asset
  index: number
  data: AssetData
  py?: number
  showPrice?: boolean
  onImportClick?: (asset: Asset) => void
  shouldDisplayRelatedAssets?: boolean
} & ButtonProps

export const AssetRow: FC<AssetRowProps> = memo(
  ({
    asset,
    data: { handleClick, handleLongPress, disableUnsupported, hideZeroBalanceAmounts },
    showPrice = false,
    onImportClick,
    shouldDisplayRelatedAssets = false,
    ...props
  }) => {
    const translate = useTranslate()
    const assetNameColor = useColorModeValue('black', 'white')
    const color = useColorModeValue('text.subtle', 'whiteAlpha.500')
    const {
      state: { isConnected, wallet },
    } = useWallet()
    const textColor = useColorModeValue('black', 'white')

    const assetId = asset?.assetId
    const relatedAssetIdsFilter = useMemo(
      () => ({
        assetId: asset.assetId,
        // We want all related assetIds, and conditionally mark the disconnected/unsupported ones as
        // disabled in the UI. This allows users to see our product supports more assets than they
        // have connected chains for.
        onlyConnectedChains: false,
      }),
      [asset],
    )
    const relatedAssetIds = useSelectorWithArgs(
      selectRelatedAssetIdsInclusiveSorted,
      relatedAssetIdsFilter,
    )

    const filter = useMemo(() => ({ assetId }), [assetId])
    const isSupported = wallet && isAssetSupportedByWallet(assetId, wallet)
    const cryptoHumanBalance = useAppSelector(s =>
      selectPortfolioCryptoPrecisionBalanceByFilter(s, filter),
    )
    const userCurrencyBalance =
      useAppSelector(s => selectPortfolioUserCurrencyBalanceByAssetId(s, filter)) ?? '0'

    const assetFromStore = useAppSelector(s => selectAssetById(s, assetId))

    const handleOnClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        handleClick(asset)
      },
      [asset, handleClick],
    )

    const isCustomAsset = !assetFromStore

    const handleImportClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onImportClick) {
          onImportClick(asset)
        }
      },
      [asset, onImportClick],
    )

    const longPressHandlers = useLongPress((_, { context: row }) => {
      vibrate('heavy')
      handleLongPress?.(row as Asset)
    }, defaultLongPressConfig)

    const hideAssetBalance = !!(hideZeroBalanceAmounts && bnOrZero(cryptoHumanBalance).isZero())

    const marketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, assetId ?? ''),
    )

    const changePercent24Hr = marketData?.changePercent24Hr

    const changePercentTagColorsScheme = useMemo(() => {
      if (bnOrZero(changePercent24Hr).gt(0)) {
        return 'green'
      }

      if (bnOrZero(changePercent24Hr).lt(0)) {
        return 'red'
      }

      return 'gray'
    }, [changePercent24Hr])

    const priceChange = useMemo(() => {
      if (!changePercent24Hr) return null

      return (
        <Tag colorScheme={changePercentTagColorsScheme} width='max-content' px={1} size='sm'>
          {changePercentTagColorsScheme !== 'gray' ? (
            <TagLeftIcon
              as={
                changePercentTagColorsScheme === 'green' ? RiArrowRightUpLine : RiArrowLeftDownLine
              }
              me={1}
            />
          ) : null}
          <Amount.Percent
            value={bnOrZero(changePercent24Hr).times('0.01').toString()}
            fontSize='xs'
          />
        </Tag>
      )
    }, [changePercent24Hr, changePercentTagColorsScheme])

    const rightContent = useMemo(() => {
      if (isCustomAsset) {
        return (
          <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' gap={1}>
            <Button colorScheme='blue' onClick={handleImportClick}>
              {translate('common.import')}
            </Button>
          </Flex>
        )
      }

      if (showPrice) {
        return (
          <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' gap={1}>
            <Amount.Fiat
              fontWeight='semibold'
              color={textColor}
              lineHeight='shorter'
              height='20px'
              value={marketData?.price}
            />
            {priceChange}
          </Flex>
        )
      }

      if (isConnected && !hideAssetBalance && !isCustomAsset)
        return (
          <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' flexShrink={0}>
            <Amount.Fiat
              color='var(--chakra-colors-chakra-body-text)'
              value={userCurrencyBalance}
            />
            <Amount.Crypto
              fontSize='sm'
              fontWeight='normal'
              value={firstNonZeroDecimal(bnOrZero(cryptoHumanBalance)) ?? '0'}
              symbol={asset.symbol}
            />
          </Flex>
        )

      return null
    }, [
      marketData?.price,
      priceChange,
      textColor,
      userCurrencyBalance,
      cryptoHumanBalance,
      asset.symbol,
      handleImportClick,
      hideAssetBalance,
      isConnected,
      isCustomAsset,
      showPrice,
      translate,
    ])

    if (shouldDisplayRelatedAssets && relatedAssetIds.length > 0) {
      return (
        <GroupedAssetRow
          asset={asset}
          handleClick={handleClick}
          disableUnsupported={disableUnsupported}
          hideZeroBalanceAmounts={hideZeroBalanceAmounts}
          showPrice={showPrice}
          onLongPress={handleLongPress}
        />
      )
    }

    return (
      <Button
        variant='ghost'
        onClick={handleOnClick}
        justifyContent='space-between'
        isDisabled={!isSupported && disableUnsupported}
        _focus={focus}
        width='100%'
        py={8}
        {...props}
        {...longPressHandlers(asset)}
      >
        <Flex gap={4} alignItems='center' flex={1} minWidth={0}>
          <AssetIcon assetId={asset.assetId} size='sm' flexShrink={0} />
          <Box textAlign='left' flex={1} minWidth={0}>
            <Text
              color={assetNameColor}
              lineHeight={1}
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              overflow='hidden'
            >
              {asset.name}
            </Text>
            <Flex alignItems='center' gap={2}>
              <Text fontWeight='normal' fontSize='sm' color={color}>
                {asset.symbol}
              </Text>
              {asset.id && (
                <Text fontWeight='normal' fontSize='sm' color={color}>
                  {middleEllipsis(asset.id)}
                </Text>
              )}
            </Flex>
          </Box>
        </Flex>
        {rightContent}
      </Button>
    )
  },
)
