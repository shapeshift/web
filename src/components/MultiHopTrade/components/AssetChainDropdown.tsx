import type { ButtonProps, FlexProps, MenuProps } from '@chakra-ui/react'
import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Tooltip,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import React, { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { AutoTruncateText } from 'components/AutoTruncateText'
import { IconCircle } from 'components/IconCircle'
import { GridIcon } from 'components/Icons/GridIcon'
import {
  selectAssetChainNameById,
  selectFeeAssetById,
  selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
  selectRelatedAssetIdsInclusive,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type ChainDropdownProps = {
  assetId?: AssetId
  onClick: (arg: AssetId) => void
  showAll?: boolean
  includeBalance?: boolean
  buttonProps?: ButtonProps
  isLoading?: boolean
  isError?: boolean
} & Omit<MenuProps, 'children'>

const AssetChainRow: React.FC<{ assetId: AssetId } & FlexProps> = memo(({ assetId, ...rest }) => {
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const iconSrc = feeAsset?.networkIcon ?? feeAsset?.icon
  return (
    <Flex alignItems='center' gap={2} {...rest}>
      <AssetIcon size='xs' src={iconSrc} />
      <AutoTruncateText value={feeAsset?.networkName ?? feeAsset?.name} />
    </Flex>
  )
})

export const AssetChainDropdown: React.FC<ChainDropdownProps> = ({
  assetId,
  onClick,
  showAll,
  includeBalance,
  buttonProps,
  isLoading,
  isError,
  ...menuProps
}) => {
  const relatedAssetIds = useAppSelector(state =>
    selectRelatedAssetIdsInclusive(state, assetId ?? ''),
  )
  const assetChainName = useAppSelector(state => selectAssetChainNameById(state, assetId ?? ''))

  const totalPortfolioUserCurrencyBalance = useAppSelector(
    selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
  )
  const translate = useTranslate()

  const renderChains = useMemo(() => {
    return relatedAssetIds.map(assetId => (
      <MenuItemOption value={assetId} key={assetId}>
        <AssetChainRow assetId={assetId} />
      </MenuItemOption>
    ))
  }, [relatedAssetIds])

  const onChange = useCallback((value: string | string[]) => onClick(value as AssetId), [onClick])

  const isDisabled = useMemo(() => {
    return !relatedAssetIds.length || isLoading || isError
  }, [relatedAssetIds, isError, isLoading])

  const buttonTooltipText = useMemo(() => {
    if (relatedAssetIds.length || isLoading || isError) return ''
    return translate('trade.tooltip.noRelatedAssets', { chainName: assetChainName })
  }, [assetChainName, isError, isLoading, relatedAssetIds.length, translate])

  if (!assetId) return null

  return (
    <Menu {...menuProps}>
      <Tooltip label={buttonTooltipText}>
        <MenuButton as={Button} isDisabled={isDisabled} isLoading={isLoading} {...buttonProps}>
          <AssetChainRow className='activeChain' assetId={assetId} />
        </MenuButton>
      </Tooltip>
      <MenuList zIndex='banner'>
        <MenuOptionGroup type='radio' value={assetId} onChange={onChange}>
          {showAll && (
            <MenuItemOption value=''>
              <Flex alignItems='center' gap={4}>
                <IconCircle boxSize='24px'>
                  <GridIcon />
                </IconCircle>
                {translate('common.allChains')}
                <Amount.Fiat ml='auto' value={totalPortfolioUserCurrencyBalance} />
              </Flex>
            </MenuItemOption>
          )}
          {renderChains}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  )
}
