import { ChevronDownIcon } from '@chakra-ui/icons'
import type { ButtonProps, FlexProps, MenuProps } from '@chakra-ui/react'
import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Skeleton,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import React, { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { AutoTruncateText } from 'components/AutoTruncateText'
import { IconCircle } from 'components/IconCircle'
import { GridIcon } from 'components/Icons/GridIcon'
import {
  selectFeeAssetById,
  selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ChainDropdownProps = {
  assetId?: AssetId
  onClick: (arg: AssetId) => void
  assetIds?: AssetId[]
  showAll?: boolean
  includeBalance?: boolean
  buttonProps?: ButtonProps
  isLoading?: boolean
} & Omit<MenuProps, 'children'>

const AssetChainRow: React.FC<{ assetId: AssetId } & FlexProps> = ({ assetId, ...rest }) => {
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const iconSrc = feeAsset?.networkIcon ?? feeAsset?.icon
  return (
    <Flex alignItems='center' gap={2} {...rest}>
      <AssetIcon size='xs' src={iconSrc} />
      {/* <RawText className='chain-name'>{feeAsset?.networkName ?? feeAsset?.name}</RawText> */}
      <AutoTruncateText value={feeAsset?.networkName ?? feeAsset?.name} />
    </Flex>
  )
}

export const AssetChainDropdown: React.FC<ChainDropdownProps> = ({
  assetIds,
  assetId,
  onClick,
  showAll,
  includeBalance,
  buttonProps,
  isLoading,
  ...menuProps
}) => {
  const totalPortfolioUserCurrencyBalance = useAppSelector(
    selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
  )
  const translate = useTranslate()

  const renderChains = useMemo(() => {
    return assetIds?.map(assetId => (
      <MenuItemOption value={assetId} key={assetId}>
        <AssetChainRow assetId={assetId} />
      </MenuItemOption>
    ))
  }, [assetIds])

  const onChange = useCallback((value: string | string[]) => onClick(value as AssetId), [onClick])

  if (isLoading) {
    return <Skeleton width='80px' height='40px' borderRadius='full' />
  }

  if (!assetId) return null

  return (
    <Menu {...menuProps}>
      <MenuButton
        as={Button}
        justifyContent='flex-end'
        height='auto'
        px={2}
        py={2}
        gap={2}
        size='sm'
        borderRadius='full'
        isDisabled={!assetIds?.length}
        rightIcon={<ChevronDownIcon />}
        {...buttonProps}
      >
        <AssetChainRow className='activeChain' assetId={assetId} />
      </MenuButton>
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
