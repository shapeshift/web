import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Box, Button, Center, Collapse, Flex, Text as CText, useDisclosure } from '@chakra-ui/react'
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
    return relatedAssetIds.map((assetId, index) => {
      const feeAsset = selectFeeAssetByChainId(store.getState(), fromAssetId(assetId).chainId)
      return (
        <Box
          key={feeAsset?.chainId}
          borderRadius='full'
          display='flex'
          alignItems='center'
          justifyContent='center'
          fontSize='xs'
          boxSize='16px'
          color='white'
          fontWeight='bold'
          zIndex={relatedAssetIds.length - index} // Higher z-index for earlier items
          ml={index > 0 ? -1.5 : 0}
          border='1px solid'
          borderColor='background.surface.overlay.base'
        >
          <LazyLoadAvatar src={feeAsset?.networkIcon ?? feeAsset?.icon} boxSize='100%' />
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
          showChainName
          borderRadius='none'
          // eslint-disable-next-line react-memo/require-usememo
          _last={{ borderBottomRadius: 'lg' }}
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
        borderBottomRadius={isOpen ? 0 : 'lg'}
        bg={isOpen ? 'background.surface.raised.base' : 'transparent'}
      >
        <Flex gap={3} alignItems='center' flex={1} minWidth={0}>
          <AssetIcon assetId={asset.assetId} showNetworkIcon={false} size='md' flexShrink={0} />
          <Flex gap={1} flexDir='column' textAlign='left' flex={1} minWidth={0}>
            <CText
              lineHeight={1}
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              overflow='hidden'
              color='text.base'
              fontWeight='medium'
            >
              {asset.name}
            </CText>
            <Flex alignItems='center' gap={2}>
              {!showPrice &&
              isConnected &&
              (!hideZeroBalanceAmounts ||
                bnOrZero(groupedAssetBalances?.primaryAsset.cryptoAmount).gt(0)) ? (
                <Amount.Crypto
                  color='text.subtle'
                  fontSize='sm'
                  fontWeight='medium'
                  lineHeight={1}
                  value={groupedAssetBalances?.primaryAsset.cryptoAmount}
                  symbol={asset.symbol}
                />
              ) : (
                <CText
                  fontWeight='normal'
                  fontSize='sm'
                  color='text.subtle'
                  textOverflow='ellipsis'
                  whiteSpace='nowrap'
                  maxWidth='150px'
                  overflow='hidden'
                >
                  {asset.symbol}
                </CText>
              )}
            </Flex>
          </Flex>
        </Flex>
        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' flexShrink={0}>
          {showPrice && (
            <Flex gap={1} mt={1}>
              <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' gap={1}>
                <Amount.Fiat
                  fontWeight='semibold'
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
                  fontWeight='medium'
                  color='text.base'
                  lineHeight={1}
                  value={groupedAssetBalances?.primaryAsset.fiatAmount.toString()}
                />
                <Flex>
                  {networksIcons}
                  <Center
                    bg='background.button.secondary.base'
                    borderRightRadius='full'
                    pl={2}
                    ml={-2}
                  >
                    {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </Center>
                </Flex>
              </Flex>
            )}
        </Flex>
      </Button>

      <Collapse in={isOpen} unmountOnExit>
        {relatedAssets}
      </Collapse>
    </Box>
  )
}
