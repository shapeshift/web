import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Collapse,
  Flex,
  Icon,
  Text as CText,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'

import { AssetRow } from './AssetRow'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { PriceChangeTag } from '@/components/PriceChangeTag/PriceChangeTag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectRelatedAssetIdsInclusiveSorted } from '@/state/slices/related-assets-selectors'
import {
  selectAssets,
  selectFeeAssetByChainId,
  selectGroupedAssetsWithBalances,
} from '@/state/slices/selectors'
import { store, useAppSelector, useSelectorWithArgs } from '@/state/store'

type GroupedAssetRowProps = {
  asset: Asset
  handleClick: (asset: Asset) => void
  disableUnsupported?: boolean
  hideZeroBalanceAmounts?: boolean
  showPrice?: boolean
  onLongPress?: (asset: Asset) => void
}

export const GroupedAssetRow: FC<GroupedAssetRowProps> = ({
  asset,
  handleClick,
  disableUnsupported,
  hideZeroBalanceAmounts,
  showPrice,
  onLongPress,
}) => {
  const { isOpen, onToggle } = useDisclosure()
  const assets = useAppSelector(selectAssets)
  const {
    state: { isConnected },
  } = useWallet()
  const groupedAssetBalances = useAppSelector(state =>
    selectGroupedAssetsWithBalances(state, asset.assetId),
  )

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

  const titleColor = useColorModeValue('black', 'white')

  const handleGroupClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggle()
    },
    [onToggle],
  )

  const handleAssetClick = useCallback(
    (asset: Asset) => {
      handleClick(asset)
    },
    [handleClick],
  )

  const networksIcons = useMemo(() => {
    return relatedAssetIds.map(assetId => {
      const feeAsset = selectFeeAssetByChainId(store.getState(), fromAssetId(assetId).chainId)
      return (
        <Box
          key={feeAsset?.chainId}
          w={2}
          borderRadius='full'
          display='flex'
          alignItems='center'
          justifyContent='center'
          fontSize='xs'
          color='white'
          fontWeight='bold'
        >
          <LazyLoadAvatar src={feeAsset?.networkIcon ?? feeAsset?.icon} boxSize={4} />
        </Box>
      )
    })
  }, [relatedAssetIds])

  const changePercent24Hr = groupedAssetBalances?.primaryAsset.priceChange

  const relatedAssets = useMemo(() => {
    return relatedAssetIds.map(assetId => {
      const relatedAsset = assets[assetId]

      if (!relatedAsset) return null

      return (
        <AssetRow
          key={assetId}
          asset={relatedAsset}
          index={0}
          py={8}
          // eslint-disable-next-line react-memo/require-usememo
          data={{
            assets: [relatedAsset],
            handleClick: handleAssetClick,
            disableUnsupported,
            hideZeroBalanceAmounts,
            handleLongPress: onLongPress,
          }}
        />
      )
    })
  }, [
    assets,
    disableUnsupported,
    relatedAssetIds,
    handleAssetClick,
    hideZeroBalanceAmounts,
    onLongPress,
  ])

  return (
    <Box bg={isOpen ? 'background.surface.raised.base' : 'transparent'} borderRadius='lg' my={2}>
      <Button
        variant='ghost'
        onClick={handleGroupClick}
        justifyContent='space-between'
        width='100%'
        height='auto'
        minHeight='60px'
        padding={4}
        py={2}
        pr={2}
        borderBottomRadius={isOpen ? 0 : 'lg'}
        bg={isOpen ? 'background.surface.raised.base' : 'transparent'}
      >
        <Flex gap={4} alignItems='center' flex={1} minWidth={0}>
          <AssetIcon assetId={asset.assetId} showNetworkIcon={false} size='sm' flexShrink={0} />
          <Box textAlign='left' flex={1} minWidth={0}>
            <CText
              lineHeight={1}
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              overflow='hidden'
              color={titleColor}
            >
              {asset.name}
            </CText>
            <Flex alignItems='center' gap={2}>
              {!showPrice &&
              isConnected &&
              (!hideZeroBalanceAmounts ||
                bnOrZero(groupedAssetBalances?.primaryAsset.cryptoAmount).gt(0)) ? (
                <Amount.Crypto
                  color='text.secondary'
                  fontSize='sm'
                  value={groupedAssetBalances?.primaryAsset.cryptoAmount}
                  symbol={asset.symbol}
                />
              ) : (
                <CText
                  fontWeight='normal'
                  fontSize='sm'
                  color={'text.subtle'}
                  textOverflow='ellipsis'
                  whiteSpace='nowrap'
                  maxWidth='150px'
                  overflow='hidden'
                >
                  {asset.symbol}
                </CText>
              )}
            </Flex>
          </Box>
        </Flex>
        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' flexShrink={0}>
          {showPrice && (
            <Flex gap={1} mt={1}>
              <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' gap={1}>
                <Amount.Fiat
                  fontWeight='semibold'
                  color={titleColor}
                  lineHeight='shorter'
                  height='20px'
                  value={groupedAssetBalances?.primaryAsset.price}
                />
                <PriceChangeTag changePercent24Hr={changePercent24Hr} />
              </Flex>
            </Flex>
          )}

          {!showPrice &&
            isConnected &&
            ((bnOrZero(groupedAssetBalances?.primaryAsset.cryptoAmount).gt(0) &&
              hideZeroBalanceAmounts) ||
              !hideZeroBalanceAmounts) && (
              <Flex gap={1} flexDir='column' justifyContent='flex-end' alignItems='flex-end'>
                <Amount.Fiat
                  color='var(--chakra-colors-chakra-body-text)'
                  value={groupedAssetBalances?.primaryAsset.fiatAmount.toString()}
                />
                <Flex>{networksIcons}</Flex>
              </Flex>
            )}
        </Flex>
        <Icon as={isOpen ? ChevronUpIcon : ChevronDownIcon} ml={2} />
      </Button>

      <Collapse in={isOpen} unmountOnExit>
        {relatedAssets}
      </Collapse>
    </Box>
  )
}
