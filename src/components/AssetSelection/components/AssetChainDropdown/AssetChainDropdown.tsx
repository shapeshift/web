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
import { type AssetId, type ChainId, fromAssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { getStyledMenuButtonProps } from 'components/AssetSelection/helpers'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import { selectRelatedAssetIdsInclusiveSorted } from 'state/slices/related-assets-selectors'
import { selectChainDisplayNameByAssetId } from 'state/slices/selectors'
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
  onlyConnectedChains: boolean
  isDisabled?: boolean
  chainIdFilterPredicate?: (chainId: ChainId) => boolean
}

const flexProps = {
  width: '100%',
}

export const AssetChainDropdown: React.FC<AssetChainDropdownProps> = memo(
  ({
    assetId,
    assetIds,
    buttonProps,
    isDisabled,
    isError,
    isLoading,
    onChangeAsset,
    onlyConnectedChains,
    chainIdFilterPredicate,
  }) => {
    const {
      state: { wallet },
    } = useWallet()
    const translate = useTranslate()
    const chainDisplayName = useAppSelector(state =>
      selectChainDisplayNameByAssetId(state, assetId ?? ''),
    )
    const relatedAssetIdsFilter = useMemo(
      () => ({ assetId, onlyConnectedChains }),
      [assetId, onlyConnectedChains],
    )
    const relatedAssetIds = useAppSelector(state =>
      selectRelatedAssetIdsInclusiveSorted(state, relatedAssetIdsFilter),
    )

    const filteredRelatedAssetIds = useMemo(() => {
      const filteredRelatedAssetIds = relatedAssetIds.filter(assetId => {
        const { chainId } = fromAssetId(assetId)
        return chainIdFilterPredicate?.(chainId) ?? true
      })
      if (!assetIds?.length) return filteredRelatedAssetIds
      return filteredRelatedAssetIds.filter(relatedAssetId => assetIds.includes(relatedAssetId))
    }, [assetIds, chainIdFilterPredicate, relatedAssetIds])

    const renderedChains = useMemo(() => {
      if (!assetId) return null
      return filteredRelatedAssetIds.map(relatedAssetId => {
        const isSupported =
          !onlyConnectedChains || (wallet && isAssetSupportedByWallet(relatedAssetId, wallet))

        return (
          <MenuItemOption value={relatedAssetId} key={relatedAssetId} isDisabled={!isSupported}>
            <AssetChainRow assetId={relatedAssetId} mainImplementationAssetId={assetId} />
          </MenuItemOption>
        )
      })
    }, [assetId, filteredRelatedAssetIds, onlyConnectedChains, wallet])

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

    const isButtonDisabled = useMemo(() => {
      return isDisabled || filteredRelatedAssetIds.length <= 1 || isLoading || isError
    }, [filteredRelatedAssetIds.length, isDisabled, isError, isLoading])

    const isTooltipExplainerDisabled = useMemo(() => {
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
        {/* If we do have related assets (or we're loading/errored), assume everything is happy. 
            Else if there's no related assets for that asset, display a tooltip explaining "This asset is only available on <currentChain>  
        */}
        <Tooltip isDisabled={isTooltipExplainerDisabled} label={buttonTooltipText}>
          <MenuButton as={Button} isDisabled={isButtonDisabled} {...buttonProps}>
            <AssetChainRow
              assetId={assetId}
              mainImplementationAssetId={assetId}
              hideBalances
              hideSymbol
              flexProps={flexProps}
            />
          </MenuButton>
        </Tooltip>
        <MenuList zIndex='modal'>
          <MenuOptionGroup type='radio' value={assetId} onChange={handleChangeAsset}>
            {renderedChains}
          </MenuOptionGroup>
        </MenuList>
      </Menu>
    )
  },
)

export const StyledAssetChainDropdown = ({
  isDisabled,
  rightIcon,
  buttonProps,
  ...rest
}: AssetChainDropdownProps & { rightIcon?: React.ReactElement }) => {
  const combinedButtonProps = useMemo(
    () => getStyledMenuButtonProps({ isDisabled, rightIcon, buttonProps }),
    [isDisabled, rightIcon, buttonProps],
  )

  return <AssetChainDropdown {...rest} buttonProps={combinedButtonProps} isDisabled={isDisabled} />
}
