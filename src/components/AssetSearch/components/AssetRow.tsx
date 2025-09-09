import type { ButtonProps } from '@chakra-ui/react'
import { Button, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { isToken } from '@shapeshiftoss/utils'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLongPress } from 'use-long-press'

import type { AssetData } from './AssetList'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { GroupedAssetRow } from '@/components/AssetSearch/components/GroupedAssetRow'
import { PriceChangeTag } from '@/components/PriceChangeTag/PriceChangeTag'
import { defaultLongPressConfig } from '@/constants/longPress'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { firstNonZeroDecimal } from '@/lib/math'
import { chainIdToChainDisplayName, middleEllipsis } from '@/lib/utils'
import { vibrate } from '@/lib/vibrate'
import { isAssetSupportedByWallet } from '@/state/slices/portfolioSlice/utils'
import { selectRelatedAssetIdsInclusiveSorted } from '@/state/slices/related-assets-selectors'
import {
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByAssetId,
} from '@/state/slices/selectors'
import { useAppSelector, useSelectorWithArgs } from '@/state/store'

const focus = {
  shadow: 'outline-inset',
}

export type AssetRowData = {
  asset: Asset
  index: number
  data: AssetData
  showPrice?: boolean
  showChainName?: boolean
  onImportClick?: (asset: Asset) => void
  showRelatedAssets?: boolean
}

export type AssetRowProps = AssetRowData & ButtonProps

export const AssetRow: FC<AssetRowProps> = memo(
  ({
    asset,
    data: { handleClick, handleLongPress, disableUnsupported, hideZeroBalanceAmounts },
    showPrice = false,
    onImportClick,
    showRelatedAssets = false,
    showChainName = false,
    ...props
  }) => {
    const translate = useTranslate()
    const assetNameColor = useColorModeValue('black', 'white')
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

    const knownAsset = useAppSelector(s => selectAssetById(s, assetId))

    const { assetReference: contractAddress } = fromAssetId(assetId)

    const isAssetToken = isToken(assetId)

    const chainName = chainIdToChainDisplayName(asset.chainId) ?? ''

    const handleOnClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        handleClick(asset)
      },
      [asset, handleClick],
    )

    const isCustomAsset = !knownAsset

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
              fontWeight='medium'
              color={textColor}
              lineHeight={1}
              value={marketData?.price}
            />
            <PriceChangeTag changePercent24Hr={changePercent24Hr} />
          </Flex>
        )
      }

      if (
        isConnected &&
        !hideAssetBalance &&
        !isCustomAsset &&
        (!hideZeroBalanceAmounts || bnOrZero(userCurrencyBalance).gt(0))
      )
        return (
          <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' flexShrink={0}>
            <Amount.Fiat
              color='var(--chakra-colors-chakra-body-text)'
              value={userCurrencyBalance}
            />
          </Flex>
        )

      return null
    }, [
      marketData?.price,
      textColor,
      userCurrencyBalance,
      handleImportClick,
      hideAssetBalance,
      isConnected,
      isCustomAsset,
      showPrice,
      translate,
      hideZeroBalanceAmounts,
      changePercent24Hr,
    ])

    if (showRelatedAssets && relatedAssetIds.length > 1) {
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
        <Flex gap={3} alignItems='center' flex={1} minWidth={0}>
          <AssetIcon assetId={asset.assetId} size='md' flexShrink={0} />
          <Flex gap={1} flexDir='column' textAlign='left' flex={1} minWidth={0}>
            <Text
              color={assetNameColor}
              lineHeight={1}
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              overflow='hidden'
            >
              {showChainName ? `${chainName} (${asset.symbol})` : asset.name}
            </Text>
            <Flex alignItems='center' gap={2}>
              {bnOrZero(cryptoHumanBalance).gt(0) ? (
                <Amount.Crypto
                  fontSize='sm'
                  fontWeight='medium'
                  value={firstNonZeroDecimal(bnOrZero(cryptoHumanBalance)) ?? '0'}
                  symbol={asset.symbol}
                />
              ) : (
                <>
                  <Text fontWeight='medium' fontSize='sm' color='text.subtle'>
                    {asset.symbol}
                  </Text>
                  {isAssetToken && (
                    <Text fontWeight='medium' fontSize='sm' color='text.subtle' opacity={0.75}>
                      {middleEllipsis(contractAddress)}
                    </Text>
                  )}
                </>
              )}
              {asset.id && (
                <Text fontWeight='medium' fontSize='sm' color='text.subtle'>
                  {middleEllipsis(asset.id)}
                </Text>
              )}
            </Flex>
          </Flex>
        </Flex>
        {rightContent}
      </Button>
    )
  },
)
