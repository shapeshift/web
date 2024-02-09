import { ChevronDownIcon } from '@chakra-ui/icons'
import type { ButtonProps, FlexProps } from '@chakra-ui/react'
import { Button, Flex, Skeleton, SkeletonCircle, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { memo, useCallback, useMemo } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import { selectAssetById, selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetChainDropdown } from './AssetChainDropdown'

const disabledStyle = { opacity: 1 }

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
  isReadOnly?: boolean
  isLoading: boolean
  onAssetClick?: () => void
  onAssetChange: (asset: Asset) => void
  buttonProps?: ButtonProps
} & FlexProps

export const TradeAssetSelectWithAsset: React.FC<TradeAssetSelectProps> = ({
  onAssetClick,
  onAssetChange,
  assetId,
  isReadOnly,
  isLoading,
  buttonProps,
  ...rest
}) => {
  const assets = useAppSelector(selectAssets)
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

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

  const rightIcon = useMemo(() => (isReadOnly ? undefined : <ChevronDownIcon />), [isReadOnly])

  return (
    <Flex px={4} mb={4} alignItems='center' gap={2} {...rest}>
      <Button
        height='40px'
        justifyContent='flex-end'
        px={2}
        py={2}
        gap={2}
        size='sm'
        borderRadius='full'
        onClick={onAssetClick}
        flexGrow={0}
        flexShrink={0}
        isDisabled={isReadOnly}
        _disabled={disabledStyle}
        rightIcon={rightIcon}
        isLoading={isLoading}
        {...buttonProps}
      >
        <Flex alignItems='center' gap={2}>
          {icon}
          {asset?.symbol}
        </Flex>
      </Button>
      <Text translation='trade.on' color='text.subtle' fontSize='sm' />
      <AssetChainDropdown
        assetId={assetId}
        onClick={handleAssetChange}
        isLoading={isLoading}
        buttonProps={buttonProps}
      />
    </Flex>
  )
}

export const TradeAssetSelect: React.FC<TradeAssetSelectProps> = memo(
  ({ assetId, ...restAssetInputProps }) => {
    return assetId ? (
      <TradeAssetSelectWithAsset assetId={assetId} {...restAssetInputProps} />
    ) : (
      <TradeAssetAwaitingAsset />
    )
  },
)
