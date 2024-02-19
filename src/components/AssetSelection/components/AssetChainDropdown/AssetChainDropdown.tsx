import type { ButtonProps, MenuProps } from '@chakra-ui/react'
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
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetChainNameById,
  selectRelatedAssetIdsInclusiveSorted,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetRowLoading } from '../AssetRowLoading'
import { AssetChainRow } from './AssetChainRow'

type AssetChainDropdownProps = {
  assetId?: AssetId
  onClick: (arg: AssetId | undefined) => void
  buttonProps?: ButtonProps
  isLoading?: boolean
  isError?: boolean
} & Omit<MenuProps, 'children'>

export const AssetChainDropdown: React.FC<AssetChainDropdownProps> = ({
  assetId,
  onClick,
  buttonProps,
  isLoading,
  isError,
  ...menuProps
}) => {
  const {
    state: { wallet },
  } = useWallet()
  const translate = useTranslate()
  const assetChainName = useAppSelector(state => selectAssetChainNameById(state, assetId ?? ''))
  const relatedAssetIds = useAppSelector(state =>
    selectRelatedAssetIdsInclusiveSorted(state, assetId ?? ''),
  )

  const renderChains = useMemo(() => {
    return relatedAssetIds.map(assetId => {
      const isSupported = wallet && isAssetSupportedByWallet(assetId, wallet)

      return (
        <MenuItemOption value={assetId} key={assetId} isDisabled={!isSupported}>
          <AssetChainRow assetId={assetId} />
        </MenuItemOption>
      )
    })
  }, [relatedAssetIds, wallet])

  const onChange = useCallback((value: string | string[]) => onClick(value as AssetId), [onClick])

  const isDisabled = useMemo(() => {
    return relatedAssetIds.length <= 1 || isLoading || isError
  }, [relatedAssetIds, isError, isLoading])

  const isTooltipDisabled = useMemo(() => {
    // only render the tooltip when there are no other related assets and we're not loading and not
    // errored
    return relatedAssetIds.length > 1 || isLoading || isError
  }, [relatedAssetIds, isError, isLoading])

  const buttonTooltipText = useMemo(() => {
    return translate('trade.tooltip.noRelatedAssets', { chainName: assetChainName })
  }, [assetChainName, translate])

  if (!assetId || isLoading) return <AssetRowLoading {...buttonProps} />

  return (
    <Menu {...menuProps}>
      <Tooltip isDisabled={isTooltipDisabled} label={buttonTooltipText}>
        <MenuButton as={Button} isDisabled={isDisabled} {...buttonProps}>
          <AssetChainRow assetId={assetId} hideBalances />
        </MenuButton>
      </Tooltip>
      <MenuList zIndex='banner'>
        <MenuOptionGroup type='radio' value={assetId} onChange={onChange}>
          {renderChains}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  )
}
