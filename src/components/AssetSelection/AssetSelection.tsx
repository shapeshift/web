import { ChevronDownIcon } from '@chakra-ui/icons'
import type { ButtonProps, FlexProps } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useMemo } from 'react'
import { Text } from 'components/Text'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetChainDropdown } from './components/AssetChainDropdown/AssetChainDropdown'
import { AssetMenuButton } from './components/AssetMenuButton'

const disabledStyle = { opacity: 0.5 }

type TradeAssetSelectBaseProps = {
  assetId?: AssetId
  assetIds?: AssetId[]
  isLoading?: boolean
  buttonProps?: ButtonProps
} & FlexProps

type TradeAssetSelectReadonlyProps = {
  isReadOnly: true
  onAssetClick?: undefined
  onAssetChange?: undefined
} & TradeAssetSelectBaseProps

type TradeAssetSelectEditableProps = {
  isReadOnly?: false
  onAssetClick: () => void
  onAssetChange: (asset: Asset) => void
} & TradeAssetSelectBaseProps

type TradeAssetSelectProps = TradeAssetSelectReadonlyProps | TradeAssetSelectEditableProps

export const TradeAssetSelect: React.FC<TradeAssetSelectProps> = memo(props => {
  const {
    onAssetClick,
    onAssetChange,
    assetId,
    assetIds,
    isReadOnly,
    isLoading,
    buttonProps,
    flexProps,
  } = useMemo(() => {
    const {
      onAssetClick,
      onAssetChange,
      assetId,
      assetIds,
      isReadOnly,
      isLoading,
      buttonProps,
      ...flexProps
    } = props
    return {
      onAssetClick,
      onAssetChange,
      assetId,
      assetIds,
      isReadOnly,
      isLoading,
      buttonProps,
      flexProps,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props))

  const assets = useAppSelector(selectAssets)

  const handleAssetChange = useCallback(
    (assetId?: AssetId) => {
      if (!assetId) return
      const asset = assets[assetId]
      if (!asset) return
      onAssetChange?.(asset)
    },
    [assets, onAssetChange],
  )

  const rightIcon = useMemo(() => (isReadOnly ? undefined : <ChevronDownIcon />), [isReadOnly])
  const combinedButtonProps = useMemo(() => {
    return Object.assign(
      {
        height: '40px',
        justifyContent: 'flex-end',
        px: 2,
        py: 2,
        gap: 2,
        size: 'sm',
        borderRadius: 'full',
        rightIcon,
        _disabled: disabledStyle,
      },
      buttonProps,
    )
  }, [rightIcon, buttonProps])

  return (
    <Flex px={4} mb={4} alignItems='center' gap={2} {...flexProps}>
      <AssetMenuButton
        assetId={assetId}
        onAssetClick={onAssetClick}
        buttonProps={combinedButtonProps}
        isLoading={isLoading}
        isDisabled={Boolean(isReadOnly)}
      />
      <Text translation='trade.on' color='text.subtle' fontSize='sm' />
      <AssetChainDropdown
        assetId={assetId}
        assetIds={assetIds}
        onChangeAsset={handleAssetChange}
        isLoading={isLoading}
        buttonProps={combinedButtonProps}
      />
    </Flex>
  )
})
