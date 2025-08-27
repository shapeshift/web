import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import type { ListProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  Center,
  Collapse,
  Text as CText,
  Flex,
  Icon,
  Skeleton,
  useDisclosure,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { range } from 'lodash'
import type { CSSProperties, FC } from 'react'
import { useCallback, useMemo } from 'react'
import { FaRegCompass } from 'react-icons/fa6'
import { Virtuoso } from 'react-virtuoso'

import { AssetRow } from './AssetRow'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { Text } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { PortalsAssets } from '@/pages/Markets/hooks/usePortalsAssetsQuery'
import {
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByAssetId,
} from '@/state/slices/selectors'
import { store } from '@/state/store'

export type MixedAssetList = { type: 'group' | 'individual'; data: Asset[] }[]

export type AssetData = {
  assets: Asset[]
  groupedAssets?: MixedAssetList
  handleClick: (asset: Asset) => void
  handleLongPress?: (asset: Asset) => void
  disableUnsupported?: boolean
  hideZeroBalanceAmounts?: boolean
  rowComponent?: FC<{ asset: Asset; index: number; data: AssetData }>
  isLoading?: boolean
  portalsAssets?: PortalsAssets
}

export type GroupedAssetData = {
  groupedAssets: Asset[][]
  handleClick: (asset: Asset) => void
  handleLongPress?: (asset: Asset) => void
  disableUnsupported?: boolean
  hideZeroBalanceAmounts?: boolean
  rowComponent?: FC<{ asset: Asset; index: number; data: AssetData }>
  isLoading?: boolean
  portalsAssets?: PortalsAssets
}

type AssetListProps = AssetData & ListProps

const scrollbarStyle: CSSProperties = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
}

const INCREASE_VIEWPORT_BY = { top: 100, bottom: 100 } as const

const virtuosoStyle = {
  height: '50vh',
  ...scrollbarStyle,
}

// New component for grouped asset rows
const GroupedAssetRow: FC<{
  assets: Asset[]
  handleClick: (asset: Asset) => void
  disableUnsupported?: boolean
  hideZeroBalanceAmounts?: boolean
}> = ({ assets, handleClick, disableUnsupported, hideZeroBalanceAmounts }) => {
  const { isOpen, onToggle } = useDisclosure()
  const primaryAsset = assets[0] // Use the first asset as primary

  // Calculate total balance across all assets in the group
  const totalBalance = useMemo(() => {
    return assets.reduce((sum, asset) => {
      const filter = { assetId: asset.assetId }
      const balance = selectPortfolioUserCurrencyBalanceByAssetId(store.getState(), filter) ?? '0'
      return sum + bnOrZero(balance).toNumber()
    }, 0)
  }, [assets])

  const totalBalanceBaseUnit = useMemo(() => {
    return assets.reduce((sum, asset) => {
      const filter = { assetId: asset.assetId }
      const balance = selectPortfolioCryptoPrecisionBalanceByFilter(store.getState(), filter) ?? '0'
      return bnOrZero(balance).plus(sum).toFixed()
    }, '0')
  }, [assets])

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

  return (
    <Box>
      <Button
        variant='ghost'
        onClick={handleGroupClick}
        justifyContent='space-between'
        width='100%'
        height='auto'
        minHeight='60px'
        padding={4}
      >
        <Flex gap={4} alignItems='center' flex={1} minWidth={0}>
          <AssetIcon assetId={primaryAsset.assetId} size='sm' flexShrink={0} />
          <Box textAlign='left' flex={1} minWidth={0}>
            <CText lineHeight={1} textOverflow='ellipsis' whiteSpace='nowrap' overflow='hidden'>
              {primaryAsset.name}
            </CText>
            <Flex alignItems='center' gap={2}>
              <Amount.Crypto
                color='text.secondary'
                fontSize='sm'
                value={totalBalanceBaseUnit}
                symbol={primaryAsset.symbol}
              />
            </Flex>
          </Box>
        </Flex>
        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' flexShrink={0}>
          <Amount.Fiat
            color='var(--chakra-colors-chakra-body-text)'
            value={totalBalance.toString()}
          />

          <Flex gap={1} mt={1}>
            {assets.map(asset => (
              <Box
                key={asset.chainId}
                w={2}
                borderRadius='full'
                display='flex'
                alignItems='center'
                justifyContent='center'
                fontSize='xs'
                color='white'
                fontWeight='bold'
              >
                <LazyLoadAvatar src={asset.networkIcon ?? asset?.icon} boxSize={4} />
              </Box>
            ))}
          </Flex>
        </Flex>
        <Icon as={isOpen ? ChevronUpIcon : ChevronDownIcon} ml={2} />
      </Button>

      <Collapse in={isOpen}>
        <Box pl={8}>
          {assets.map(asset => (
            <AssetRow
              key={asset.assetId}
              asset={asset}
              index={0}
              // eslint-disable-next-line react-memo/require-usememo
              data={{
                assets: [asset],
                handleClick: handleAssetClick,
                disableUnsupported,
                hideZeroBalanceAmounts,
              }}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}

export const AssetList: FC<AssetListProps> = ({
  assets,
  handleClick,
  handleLongPress,
  disableUnsupported = false,
  hideZeroBalanceAmounts = true,
  rowComponent = AssetRow,
  isLoading = false,
  portalsAssets,
}) => {
  // Group assets by relatedAssetKey and create a mixed list of grouped and individual assets
  const mixedAssetList = useMemo(() => {
    const assetGroups = new Map<string, Asset[]>()
    console.log({ assets })

    // Group assets by relatedAssetKey
    assets.forEach(asset => {
      console.log('asset', asset)
      const groupKey = asset.relatedAssetKey || asset.assetId
      if (!assetGroups.has(groupKey)) {
        assetGroups.set(groupKey, [])
      }
      assetGroups.get(groupKey)?.push(asset)
    })

    // Create a mixed list: grouped assets (when multiple assets share relatedAssetKey) and individual assets
    const mixedList: { type: 'group' | 'individual'; data: Asset[] }[] = []

    assetGroups.forEach(groupAssets => {
      if (groupAssets.length > 1) {
        // Multiple assets with same relatedAssetKey - create a group
        mixedList.push({ type: 'group', data: groupAssets })
      } else {
        // Single asset - add as individual
        mixedList.push({ type: 'individual', data: groupAssets })
      }
    })

    return mixedList
  }, [assets])

  console.log({ mixedAssetList })

  const itemData = useMemo(
    () => ({
      assets,
      groupedAssets: mixedAssetList,
      handleClick,
      handleLongPress,
      disableUnsupported,
      hideZeroBalanceAmounts,
      portalsAssets,
    }),
    [
      assets,
      mixedAssetList,
      disableUnsupported,
      handleClick,
      handleLongPress,
      hideZeroBalanceAmounts,
      portalsAssets,
    ],
  )

  const renderRow = useCallback(
    (index: number) => {
      const item = mixedAssetList[index]
      const RowComponent = rowComponent
      console.log({ item })

      if (item.type === 'group') {
        return (
          <GroupedAssetRow
            assets={item.data}
            handleClick={handleClick}
            disableUnsupported={disableUnsupported}
            hideZeroBalanceAmounts={hideZeroBalanceAmounts}
          />
        )
      } else {
        const asset = item.data[0]
        return <RowComponent asset={asset} index={index} data={itemData} />
      }
    },
    [
      mixedAssetList,
      itemData,
      rowComponent,
      handleClick,
      disableUnsupported,
      hideZeroBalanceAmounts,
    ],
  )

  if (isLoading) {
    return (
      <Flex flexDir='column' width='100%' overflowY='auto' flex='1' minHeight={0} mt={4}>
        {range(3).map(index => (
          <Flex key={index} align='center' width='100%' justifyContent='space-between' mb={4}>
            <Flex align='center'>
              <Skeleton width='40px' height='40px' borderRadius='100%' me={2} />
              <Flex flexDir='column' gap={2}>
                <Skeleton width='140px' height='18px' />
                <Skeleton width='80px' height='18px' />
              </Flex>
            </Flex>
            <Flex align='flex-end' flexDir='column' gap={2}>
              <Skeleton width='120px' height='18px' />
              <Skeleton width='80px' height='18px' />
            </Flex>
          </Flex>
        ))}
      </Flex>
    )
  }

  if (assets?.length === 0) {
    return (
      <Center flexDir='column' gap={2} mt={4}>
        <Icon as={FaRegCompass} boxSize='24px' color='text.subtle' />
        <Text color='text.subtle' translation='common.noResultsFound' />
      </Center>
    )
  }

  return (
    <Virtuoso
      data={mixedAssetList}
      itemContent={renderRow}
      style={virtuosoStyle}
      overscan={200}
      increaseViewportBy={INCREASE_VIEWPORT_BY}
    />
  )
}
