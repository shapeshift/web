import type { ButtonProps } from '@chakra-ui/react'
import {
  Button,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Tooltip,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import {
  selectChainDisplayNameByAssetId,
  selectRelatedAssetIdsInclusiveSorted,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetRowLoading } from '../AssetRowLoading'
import { AssetChainRow } from './AssetChainRow'

type AssetChainDropdownProps = {
  assetId?: AssetId
  assetIds?: AssetId[]
  onChangeAsset: (arg: AssetId | undefined) => void
  buttonProps?: ButtonProps
  isLoading?: boolean
  isError?: boolean
}

export const AssetChainDropdown: React.FC<AssetChainDropdownProps> = memo(
  ({ assetId, assetIds, onChangeAsset, buttonProps, isLoading, isError }) => {
    const {
      state: { wallet },
    } = useWallet()
    const translate = useTranslate()
    const chainDisplayName = useAppSelector(state =>
      selectChainDisplayNameByAssetId(state, assetId ?? ''),
    )
    const relatedAssetIds = useAppSelector(state =>
      selectRelatedAssetIdsInclusiveSorted(state, assetId ?? ''),
    )

    const filteredRelatedAssetIds = useMemo(() => {
      if (!assetIds?.length) return relatedAssetIds
      return relatedAssetIds.filter(relatedAssetId => assetIds.includes(relatedAssetId))
    }, [assetIds, relatedAssetIds])

    const renderChains = useMemo(() => {
      if (!assetId) return null
      return filteredRelatedAssetIds.map(relatedAssetId => {
        const isSupported = wallet && isAssetSupportedByWallet(relatedAssetId, wallet)

        return (
          <MenuItemOption value={relatedAssetId} key={relatedAssetId} isDisabled={!isSupported}>
            <AssetChainRow assetId={relatedAssetId} mainImplementationAssetId={assetId} />
          </MenuItemOption>
        )
      })
    }, [assetId, filteredRelatedAssetIds, wallet])

    const handleChangeAsset = useCallback(
      (value: string | string[]) => {
        // this should never happen, but in case it does...
        if (typeof value !== 'string') {
          console.error('expected string value')
          return
        }
        onChangeAsset(value as AssetId)
      },
      [onChangeAsset],
    )

    const isDisabled = useMemo(() => {
      return filteredRelatedAssetIds.length <= 1 || isLoading || isError
    }, [filteredRelatedAssetIds, isError, isLoading])

    const isTooltipDisabled = useMemo(() => {
      // only render the tooltip when there are no other related assets and we're not loading and not
      // errored
      return filteredRelatedAssetIds.length > 1 || isLoading || isError
    }, [filteredRelatedAssetIds, isError, isLoading])

    const buttonTooltipText = useMemo(() => {
      return translate('trade.tooltip.noRelatedAssets', { chainDisplayName })
    }, [chainDisplayName, translate])

    if (!assetId || isLoading) return <AssetRowLoading {...buttonProps} />

    return (
      <Menu isLazy>
        <Tooltip isDisabled={isTooltipDisabled} label={buttonTooltipText}>
          <MenuButton as={Button} isDisabled={isDisabled} {...buttonProps}>
            <AssetChainRow
              assetId={assetId}
              mainImplementationAssetId={assetId}
              hideBalances
              hideSymbol
            />
          </MenuButton>
        </Tooltip>
        <MenuList zIndex='banner'>
          <MenuOptionGroup type='radio' value={assetId} onChange={handleChangeAsset}>
            {renderChains}
          </MenuOptionGroup>
        </MenuList>
      </Menu>
    )
  },
)
