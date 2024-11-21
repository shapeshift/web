import { ChevronDownIcon } from '@chakra-ui/icons'
import type { ButtonProps, FlexProps } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useMemo } from 'react'
import { Text } from 'components/Text'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StyledAssetChainDropdown } from './components/AssetChainDropdown/AssetChainDropdown'
import { StyledAssetMenuButton } from './components/AssetMenuButton'

type TradeAssetSelectBaseProps = {
  assetId?: AssetId
  assetIds?: AssetId[]
  isLoading?: boolean
  buttonProps?: ButtonProps
  onlyConnectedChains: boolean
  chainIdFilterPredicate?: (chainId: ChainId) => boolean
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
    onlyConnectedChains,
    buttonProps,
    chainIdFilterPredicate,
    flexProps,
  } = useMemo(() => {
    const {
      onAssetClick,
      onAssetChange,
      assetId,
      assetIds,
      isReadOnly,
      isLoading,
      onlyConnectedChains,
      buttonProps,
      chainIdFilterPredicate,
      ...flexProps
    } = props
    return {
      onAssetClick,
      onAssetChange,
      assetId,
      assetIds,
      isReadOnly,
      isLoading,
      onlyConnectedChains,
      buttonProps,
      chainIdFilterPredicate,
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

  return (
    <Flex px={4} mb={4} alignItems='center' gap={2} {...flexProps}>
      <StyledAssetMenuButton
        assetId={assetId}
        onAssetClick={onAssetClick}
        buttonProps={buttonProps}
        isLoading={isLoading}
        isDisabled={Boolean(isReadOnly)}
        rightIcon={rightIcon}
      />
      <Text flex='0 1 auto' translation='trade.on' color='text.subtle' fontSize='sm' />
      <StyledAssetChainDropdown
        assetId={assetId}
        assetIds={assetIds}
        onChangeAsset={handleAssetChange}
        isLoading={isLoading}
        isDisabled={Boolean(isReadOnly)}
        buttonProps={buttonProps}
        rightIcon={rightIcon}
        onlyConnectedChains={onlyConnectedChains}
        chainIdFilterPredicate={chainIdFilterPredicate}
      />
    </Flex>
  )
})
