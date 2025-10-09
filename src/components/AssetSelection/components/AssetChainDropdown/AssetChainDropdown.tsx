import type { ButtonProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Portal,
  Tooltip,
} from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { AssetRowLoading } from '../AssetRowLoading'
import { AssetChainRow } from './AssetChainRow'

import { getStyledMenuButtonProps } from '@/components/AssetSelection/helpers'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertGetChainAdapter } from '@/lib/utils'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { isAssetSupportedByWallet } from '@/state/slices/portfolioSlice/utils'
import { selectRelatedAssetIdsInclusiveSorted } from '@/state/slices/related-assets-selectors'
import {
  selectChainDisplayNameByAssetId,
  selectWalletConnectedChainIds,
} from '@/state/slices/selectors'
import { useAppSelector, useSelectorWithArgs } from '@/state/store'

type AssetChainDropdownProps = {
  assetId?: AssetId
  assetIds?: AssetId[]
  onChangeAsset: (arg: AssetId | undefined) => void
  buttonProps?: ButtonProps
  isLoading?: boolean
  isError?: boolean
  onlyConnectedChains: boolean
  isDisabled?: boolean
  assetFilterPredicate?: (assetId: AssetId) => boolean
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
    onlyConnectedChains: _onlyConnectedChains,
    assetFilterPredicate,
    chainIdFilterPredicate,
  }) => {
    const {
      state: { wallet },
    } = useWallet()
    const translate = useTranslate()
    const chainDisplayName = useAppSelector(state =>
      selectChainDisplayNameByAssetId(state, assetId ?? ''),
    )
    const isWalletConnected = useAppSelector(portfolio.selectors.selectIsWalletConnected)
    const onlyConnectedChains = isWalletConnected ? _onlyConnectedChains : false

    const relatedAssetIdsFilter = useMemo(
      () => ({
        assetId,
        // We want all related assetIds, and conditionally mark the disconnected/unsupported ones as
        // disabled in the UI. This allows users to see our product supports more assets than they
        // have connected chains for.
        onlyConnectedChains: false,
      }),
      [assetId],
    )
    const relatedAssetIds = useSelectorWithArgs(
      selectRelatedAssetIdsInclusiveSorted,
      relatedAssetIdsFilter,
    )
    const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)

    const filteredRelatedAssetIds = useMemo(() => {
      const filteredRelatedAssetIds = relatedAssetIds.filter(assetId => {
        const { chainId } = fromAssetId(assetId)
        const isChainAllowed = chainIdFilterPredicate?.(chainId) ?? true
        const isAssetAllowed = assetFilterPredicate?.(assetId) ?? true
        return isChainAllowed && isAssetAllowed
      })
      if (!assetIds?.length) return filteredRelatedAssetIds
      return filteredRelatedAssetIds.filter(relatedAssetId => assetIds.includes(relatedAssetId))
    }, [assetFilterPredicate, assetIds, chainIdFilterPredicate, relatedAssetIds])

    const isAssetChainIdSupported = useCallback(
      (assetId: AssetId) => {
        const isSupported = wallet && isAssetSupportedByWallet(assetId, wallet)
        return isSupported
      },
      [wallet],
    )

    const isAssetChainIdConnected = useCallback(
      (assetId: AssetId) => {
        const isConnected = walletConnectedChainIds.includes(fromAssetId(assetId).chainId)
        return isConnected
      },
      [walletConnectedChainIds],
    )

    const isAssetChainIdDisabled = useCallback(
      (assetId: AssetId) => {
        const isDisabled =
          onlyConnectedChains &&
          (!isAssetChainIdConnected(assetId) || !isAssetChainIdSupported(assetId))
        return isDisabled
      },
      [isAssetChainIdConnected, isAssetChainIdSupported, onlyConnectedChains],
    )

    const renderedChains = useMemo(() => {
      if (!assetId) return null
      return filteredRelatedAssetIds.map(relatedAssetId => {
        const { chainId } = fromAssetId(relatedAssetId)
        const chainDisplayName = assertGetChainAdapter(chainId).getDisplayName()
        const isChainIdDisabled = !isAssetChainIdConnected(relatedAssetId)
        const isChainIdUnsupported = !isAssetChainIdSupported(relatedAssetId)
        const isDisabled = isAssetChainIdDisabled(relatedAssetId)

        const tooltipLabel = (() => {
          switch (true) {
            case isChainIdUnsupported:
              return translate('trade.tooltip.chainNotSupportedByWallet', { chainDisplayName })
            case isChainIdDisabled:
              return translate('trade.tooltip.chainNotConnected', { chainDisplayName })
            default:
              return ''
          }
        })()

        return (
          <MenuItemOption value={relatedAssetId} key={relatedAssetId} isDisabled={isDisabled}>
            <Tooltip isDisabled={!isDisabled} label={tooltipLabel}>
              <Box width='100%' height='100%'>
                <AssetChainRow assetId={relatedAssetId} mainImplementationAssetId={assetId} />
              </Box>
            </Tooltip>
          </MenuItemOption>
        )
      })
    }, [
      assetId,
      filteredRelatedAssetIds,
      isAssetChainIdConnected,
      isAssetChainIdDisabled,
      isAssetChainIdSupported,
      translate,
    ])

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
        {/* 
          If we do have related assets (or we're loading/errored), assume everything is happy. 
          Else if there's no related assets for that asset, display a tooltip explaining 
          "This asset is only available on <currentChain>"
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
        <Portal>
          <MenuList zIndex='modal'>
            <MenuOptionGroup type='radio' value={assetId} onChange={handleChangeAsset}>
              {renderedChains}
            </MenuOptionGroup>
          </MenuList>
        </Portal>
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
