import type { ButtonProps, FlexProps, MenuProps } from '@chakra-ui/react'
import { Button, Flex, Menu, MenuButton } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import React, { memo } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { AutoTruncateText } from 'components/AutoTruncateText'
import { selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const disabled = { opacity: 1 }
const hover = { color: 'text.base' }

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
  // const totalPortfolioUserCurrencyBalance = useAppSelector(
  //   selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
  // )
  // const translate = useTranslate()

  // const renderChains = useMemo(() => {
  //   return assetIds?.map(assetId => (
  //     <MenuItemOption value={assetId} key={assetId}>
  //       <AssetChainRow assetId={assetId} />
  //     </MenuItemOption>
  //   ))
  // }, [assetIds])

  // const onChange = useCallback((value: string | string[]) => onClick(value as AssetId), [onClick])

  // @TODO: figure out how to do this correctly using coingeck data
  // const isDisabled = useMemo(() => {
  //   return !assetIds?.length || isLoading || isError
  // }, [assetIds?.length, isError, isLoading])

  if (!assetId) return null

  return (
    <Menu {...menuProps}>
      <MenuButton
        as={Button}
        justifyContent='flex-end'
        height='auto'
        pl={2}
        pr={3}
        py={2}
        gap={2}
        size='sm'
        borderRadius='full'
        color='text.base'
        isDisabled
        isLoading={isLoading}
        variant={!isLoading ? 'ghost' : undefined}
        _disabled={disabled}
        _hover={hover}
        {...buttonProps}
      >
        <AssetChainRow className='activeChain' assetId={assetId} />
      </MenuButton>
      {/* <MenuList zIndex='banner'>
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
      </MenuList> */}
    </Menu>
  )
}
