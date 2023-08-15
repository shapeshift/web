import { ChevronDownIcon } from '@chakra-ui/icons'
import { Button, Flex, Skeleton, SkeletonCircle, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { memo, useCallback, useMemo } from 'react'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import type { Asset } from 'lib/asset-service'
import { useGetRelatedAssetIdsQuery } from 'state/apis/zerion/zerionApi'
import { selectAssetById, selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetChainDropdown } from './AssetChainDropdown'

const TradeAssetAwaitingAsset = () => {
  const bgColor = useColorModeValue('white', 'gray.850')
  return (
    <Stack bgColor={bgColor} py={2} px={4} borderRadius='xl' spacing={0} flex={1}>
      <Stack direction='row' justifyContent='space-between' alignItems='center'>
        <Stack direction='row' alignItems='center'>
          <SkeletonCircle height='32px' />
          <Skeleton height='21px' width='50px' />
        </Stack>
      </Stack>
    </Stack>
  )
}

type TradeAssetSelectProps = {
  assetId?: AssetId
  onAccountIdChange: AccountDropdownProps['onChange']
  accountId?: AccountId | undefined
  accountSelectionDisabled?: boolean
  onAssetClick?: () => void
  onAssetChange: (asset: Asset) => void
  label: string
  align?: 'left' | 'right'
}

export const TradeAssetSelectWithAsset: React.FC<TradeAssetSelectProps> = ({
  onAssetClick,
  onAssetChange,
  assetId,
}) => {
  const assets = useAppSelector(selectAssets)
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const { data, isLoading, isError } = useGetRelatedAssetIdsQuery(assetId ?? '')

  const handleAssetChange = useCallback(
    (assetId: AssetId) => {
      const asset = assets[assetId]
      if (!asset) return
      onAssetChange(asset)
    },
    [assets, onAssetChange],
  )
  const icon = useMemo(() => {
    return asset?.icons ? (
      <PairIcons icons={asset.icons} iconBoxSize='5' h='38px' p={1} borderRadius={8} />
    ) : (
      <AssetIcon assetId={assetId} size='xs' showNetworkIcon={false} />
    )
  }, [asset?.icons, assetId])

  return (
    <Flex px={4} mb={4} alignItems='center' gap={2}>
      <Button
        justifyContent='flex-end'
        height='auto'
        px={2}
        py={2}
        gap={2}
        size='sm'
        borderRadius='full'
        onClick={onAssetClick}
        rightIcon={<ChevronDownIcon />}
        flexGrow={0}
        flexShrink={0}
      >
        {icon}
        {asset?.symbol}
      </Button>
      <Text translation='trade.on' color='text.subtle' fontSize='sm' />
      <AssetChainDropdown
        assetIds={data}
        assetId={assetId}
        onClick={handleAssetChange}
        isLoading={isLoading}
        isError={isError}
      />
    </Flex>
  )
}

export const TradeAssetSelect: React.FC<TradeAssetSelectProps> = memo(
  ({ assetId, accountId, ...restAssetInputProps }) => {
    return assetId ? (
      <TradeAssetSelectWithAsset assetId={assetId} accountId={accountId} {...restAssetInputProps} />
    ) : (
      <TradeAssetAwaitingAsset />
    )
  },
)
