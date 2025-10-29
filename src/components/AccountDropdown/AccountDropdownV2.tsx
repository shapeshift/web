import { ChevronDownIcon } from '@chakra-ui/icons'
import type { BoxProps, ButtonProps, MenuItemOptionProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuList,
  MenuOptionGroup,
  Text,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { chain } from 'lodash'
import sortBy from 'lodash/sortBy'
import type { FC, JSX } from 'react'
import React, { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'

import { RawText } from '../Text'
import { AccountChildOption } from './AccountChildOption'
import { AccountSegment } from './AccountSegement'

import type { AccountIdsByNumberAndType } from '@/components/AccountDropdown/types'
import { utxoAccountTypeToDisplayPriority } from '@/components/AccountDropdown/utils'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { useModalChildZIndex } from '@/context/ModalStackProvider'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { isValidAccountNumber } from '@/lib/utils/accounts'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import type { ReduxState } from '@/state/reducer'
import { accountIdToLabel } from '@/state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAccountIdsByAssetIdFilter,
  selectPortfolioAccountMetadata,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type AccountDropdownV2Props = {
  assetId: AssetId
  value: AccountId
  onChange: (accountId: AccountId) => void
  autoSelectHighestBalance?: boolean
  disabled?: boolean
  buttonProps?: ButtonProps
  listProps?: MenuItemOptionProps
  boxProps?: BoxProps
  showLabel?: boolean
  label?: JSX.Element
}

type MenuOptionsProps = {
  accountIdsByNumberAndType: AccountIdsByNumberAndType
  asset: Asset
  autoSelectHighestBalance: boolean | undefined
  disabled: boolean | undefined
  listProps: MenuItemOptionProps | undefined
  selectedAccountId: AccountId
  onClick: (accountId: AccountId) => void
}

const MenuOptions = ({
  accountIdsByNumberAndType,
  asset,
  autoSelectHighestBalance,
  disabled,
  listProps,
  selectedAccountId,
  onClick,
}: MenuOptionsProps) => {
  const { assetId, chainId } = asset
  const translate = useTranslate()
  const accountBalances = useSelector(selectPortfolioAccountBalancesBaseUnit)
  const accountMetadata = useSelector(selectPortfolioAccountMetadata)

  const getAccountIdsSortedByUtxoAccountType = useCallback(
    (accountIds: AccountId[]): AccountId[] => {
      return sortBy(accountIds, accountId =>
        utxoAccountTypeToDisplayPriority(accountMetadata[accountId]?.accountType),
      )
    },
    [accountMetadata],
  )

  const getAccountIdsSortedByBalance = useCallback(
    (accountIds: AccountId[]): AccountId[] =>
      chain(accountIds)
        .sortBy(accountIds, accountId =>
          bnOrZero(accountBalances?.[accountId]?.[assetId] ?? 0).toNumber(),
        )
        .reverse()
        .value(),
    [accountBalances, assetId],
  )

  const makeTitle = useCallback(
    (accountId: AccountId): string => {
      const { chainNamespace } = fromChainId(chainId)
      switch (chainNamespace) {
        case CHAIN_NAMESPACE.Utxo: {
          return accountIdToLabel(accountId)
        }
        default: {
          return asset?.name ?? ''
        }
      }
    },
    [asset?.name, chainId],
  )

  return (
    <MenuOptionGroup defaultValue='asc' type='radio'>
      {Object.entries(accountIdsByNumberAndType).map(([accountNumber, accountIds]) => {
        const sortedAccountIds = autoSelectHighestBalance
          ? getAccountIdsSortedByBalance(accountIds)
          : getAccountIdsSortedByUtxoAccountType(accountIds)

        if (accountIds.length === 0) return null

        const [firstAccountId] = accountIds
        const isUtxo = isUtxoAccountId(firstAccountId)

        return (
          <React.Fragment key={accountNumber}>
            <Flex px={2} py={2}>
              <AccountSegment
                title={translate('accounts.accountNumber', { accountNumber })}
                subtitle={isUtxo ? asset.name : accountIdToLabel(firstAccountId)}
              />
              {!isUtxo && <InlineCopyButton value={fromAccountId(firstAccountId).account} />}
            </Flex>
            {sortedAccountIds.map((iterAccountId, index) => (
              <AccountChildOption
                accountId={iterAccountId}
                key={`${accountNumber}-${iterAccountId}-${index}`}
                title={makeTitle(iterAccountId)}
                cryptoBalance={fromBaseUnit(
                  accountBalances?.[iterAccountId]?.[assetId] ?? 0,
                  asset?.precision ?? 0,
                )}
                symbol={asset?.symbol ?? ''}
                isChecked={selectedAccountId === iterAccountId}
                onOptionClick={onClick}
                isDisabled={disabled}
                {...listProps}
              />
            ))}
          </React.Fragment>
        )
      })}
    </MenuOptionGroup>
  )
}

export const AccountDropdownV2: FC<AccountDropdownV2Props> = memo(
  ({
    assetId,
    value: selectedAccountId,
    buttonProps,
    onChange: handleChange,
    disabled,
    listProps,
    autoSelectHighestBalance,
    boxProps,
    showLabel = true,
    label,
  }) => {
    const modalChildZIndex = useModalChildZIndex()
    const filter = useMemo(() => ({ assetId }), [assetId])
    const accountIds = useAppSelector((s: ReduxState) =>
      selectPortfolioAccountIdsByAssetIdFilter(s, filter),
    )

    const translate = useTranslate()
    const asset = useAppSelector((s: ReduxState) => selectAssetById(s, assetId))

    if (!asset) throw new Error(`AccountDropdownV2: no asset found for assetId ${assetId}!`)

    const accountMetadata = useSelector(selectPortfolioAccountMetadata)
    const isDropdownDisabled = disabled || accountIds.length <= 1

    const handleClick = useCallback(
      (accountId: AccountId) => {
        if (accountId !== selectedAccountId) {
          handleChange(accountId)
        }
      },
      [handleChange, selectedAccountId],
    )

    const accountLabel = useMemo(
      () => selectedAccountId && accountIdToLabel(selectedAccountId),
      [selectedAccountId],
    )

    const accountNumber: number | undefined = useMemo(
      () => selectedAccountId && accountMetadata[selectedAccountId]?.bip44Params?.accountNumber,
      [accountMetadata, selectedAccountId],
    )

    const rightIcon = useMemo(
      () => (isDropdownDisabled ? null : <ChevronDownIcon />),
      [isDropdownDisabled],
    )

    const accountIdsByNumberAndType = useMemo(() => {
      const initial: AccountIdsByNumberAndType = {}
      return accountIds.reduce((acc, accountId) => {
        const account = accountMetadata[accountId]
        if (!account) return acc
        const { accountNumber } = account.bip44Params
        if (!acc[accountNumber]) acc[accountNumber] = []
        acc[accountNumber].push(accountId)
        return acc
      }, initial)
    }, [accountIds, accountMetadata])

    if (!accountIds.length) return null
    if (!isValidAccountNumber(accountNumber)) return null
    if (!Object.keys(accountIdsByNumberAndType).length) return null
    if (!accountLabel) return null
    if (!selectedAccountId) return null

    const accountIdChainId = fromAccountId(selectedAccountId).chainId
    const assetIdChainId = fromAssetId(assetId).chainId
    if (accountIdChainId !== assetIdChainId) {
      throw new Error('AccountDropdownV2: chainId mismatch!')
    }

    return (
      <Box px={2} my={2} {...boxProps}>
        <Menu isLazy closeOnSelect={true} autoSelect={false} flip>
          <MenuButton
            iconSpacing={1}
            as={Button}
            size='sm'
            rightIcon={rightIcon}
            variant='ghost'
            color='text.base'
            isDisabled={isDropdownDisabled}
            {...buttonProps}
          >
            <Flex
              direction='row'
              alignItems='center'
              gap={1}
              justifyContent='space-between'
              flexWrap='wrap'
            >
              {label ? (
                label
              ) : (
                <>
                  <RawText fontWeight='medium'>
                    {translate('accounts.accountNumber', { accountNumber })}
                  </RawText>
                  {showLabel && (
                    <Text fontWeight='medium' color='text.subtle'>
                      {accountLabel}
                    </Text>
                  )}
                </>
              )}
            </Flex>
          </MenuButton>
          <MenuList
            minWidth='fit-content'
            maxHeight='200px'
            overflowY='auto'
            zIndex={modalChildZIndex}
          >
            <MenuOptions
              accountIdsByNumberAndType={accountIdsByNumberAndType}
              asset={asset}
              autoSelectHighestBalance={autoSelectHighestBalance}
              disabled={disabled}
              listProps={listProps}
              selectedAccountId={selectedAccountId}
              onClick={handleClick}
            />
          </MenuList>
        </Menu>
      </Box>
    )
  },
)
