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
  usePrevious,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { UtxoAccountType } from '@shapeshiftoss/types'
import { chain } from 'lodash'
import isEmpty from 'lodash/isEmpty'
import sortBy from 'lodash/sortBy'
import type { FC } from 'react'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { isValidAccountNumber } from 'lib/utils/accounts'
import type { ReduxState } from 'state/reducer'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectHighestUserCurrencyBalanceAccountByAssetId,
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAccountIdsByAssetIdFilter,
  selectPortfolioAccountMetadata,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { RawText } from '../Text'
import { AccountChildOption } from './AccountChildOption'
import { AccountSegment } from './AccountSegement'

export type AccountDropdownProps = {
  assetId: AssetId
  onChange: (accountId: AccountId) => void
  defaultAccountId?: AccountId
  // Auto-selects the account with the highest balance, and sorts the account list descending by balance
  autoSelectHighestBalance?: boolean
  // Prevents accounts in the dropdown from being selected
  disabled?: boolean
  buttonProps?: ButtonProps
  listProps?: MenuItemOptionProps
  boxProps?: BoxProps
  showLabel?: boolean
  label?: JSX.Element
}

const utxoAccountTypeToDisplayPriority = (accountType: UtxoAccountType | undefined) => {
  switch (accountType) {
    case UtxoAccountType.SegwitNative:
      return 0
    case UtxoAccountType.SegwitP2sh:
      return 1
    case UtxoAccountType.P2pkh:
      return 2
    // We found something else, put it at the end
    default:
      return 3
  }
}

type AccountIdsByNumberAndType = {
  [k: number]: AccountId[]
}

type MenuOptionsProps = {
  accountIdsByNumberAndType: AccountIdsByNumberAndType
  asset: Asset
  autoSelectHighestBalance: boolean | undefined
  disabled: boolean | undefined
  listProps: MenuItemOptionProps | undefined
  selectedAccountId: AccountId | undefined
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
      /**
       * for UTXO chains, we want the title to be the account type
       * for account-based chains, we want the title to be the asset name
       */
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

        // the account sub title uses an account id which is then converted to a chainId and pubkey
        // so for convenience and simplicity we can safely use the first account id here
        const [firstAccountId] = accountIds
        const subtitle = accountIdToLabel(firstAccountId)

        return (
          <React.Fragment key={accountNumber}>
            <AccountSegment
              title={translate('accounts.accountNumber', { accountNumber })}
              subtitle={subtitle}
            />
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

export const AccountDropdown: FC<AccountDropdownProps> = memo(
  ({
    assetId,
    buttonProps,
    onChange: handleChange,
    disabled,
    defaultAccountId,
    listProps,
    autoSelectHighestBalance,
    boxProps,
    showLabel = true,
    label,
  }) => {
    const filter = useMemo(() => ({ assetId }), [assetId])
    const accountIds = useAppSelector((s: ReduxState) =>
      selectPortfolioAccountIdsByAssetIdFilter(s, filter),
    )

    const translate = useTranslate()
    const asset = useAppSelector((s: ReduxState) => selectAssetById(s, assetId))

    if (!asset) throw new Error(`AccountDropdown: no asset found for assetId ${assetId}!`)

    const accountMetadata = useSelector(selectPortfolioAccountMetadata)
    const highestUserCurrencyBalanceAccountId = useAppSelector(state =>
      selectHighestUserCurrencyBalanceAccountByAssetId(state, { assetId }),
    )
    const [selectedAccountId, setSelectedAccountId] = useState<AccountId | undefined>(
      defaultAccountId,
    )

    // very suspicious of this
    // Poor man's componentDidUpdate until we figure out why this re-renders like crazy
    const previousSelectedAccountId = usePrevious(selectedAccountId)
    const isDropdownDisabled = disabled || accountIds.length <= 1

    /**
     * react on selectedAccountId change
     */
    useEffect(() => {
      if (isEmpty(accountMetadata)) return // not enough data to set an AccountId
      if (!selectedAccountId || previousSelectedAccountId === selectedAccountId) return // no-op, this would fire onChange an infuriating amount of times
      handleChange(selectedAccountId)
    }, [accountMetadata, previousSelectedAccountId, selectedAccountId, handleChange])

    /**
     * react on accountIds on first render
     */
    useEffect(() => {
      if (!accountIds.length) return
      const validatedAccountIdFromArgs = accountIds.find(
        accountId => accountId === defaultAccountId,
      )
      const firstAccountId = accountIds[0]
      // Use the first accountId if we don't have a valid defaultAccountId
      const preSelectedAccountId =
        validatedAccountIdFromArgs ??
        (autoSelectHighestBalance ? highestUserCurrencyBalanceAccountId : undefined) ??
        firstAccountId
      if (previousSelectedAccountId === preSelectedAccountId) return
      /**
       * assert asset the chainId of the accountId and assetId match
       */
      const accountIdChainId = fromAccountId(preSelectedAccountId).chainId
      const assetIdChainId = fromAssetId(assetId).chainId
      if (accountIdChainId !== assetIdChainId) {
        throw new Error('AccountDropdown: chainId mismatch!')
      }
      setSelectedAccountId(preSelectedAccountId)
    }, [
      assetId,
      accountIds,
      defaultAccountId,
      highestUserCurrencyBalanceAccountId,
      autoSelectHighestBalance,
      previousSelectedAccountId,
    ])

    const handleClick = useCallback((accountId: AccountId) => setSelectedAccountId(accountId), [])

    /**
     * memoized view bits and bobs
     */
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

    /**
     * for UTXO-based chains, we can have many accounts for a single account number
     * e.g. account 0 can have legacy, segwit, and segwit native
     *
     * this allows us to render the multiple account varieties and their balances for
     * the native asset for UTXO chains, or a single row with the selected asset for
     * account based chains that support tokens
     */
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

    /**
     * do NOT remove these checks, this is not a visual thing, this is a safety check!
     *
     * this component is responsible for selecting the correct account for operations where
     * we are sending funds, we need to be paranoid.
     */
    if (!accountIds.length) return null
    if (!isValidAccountNumber(accountNumber)) return null
    if (!Object.keys(accountIdsByNumberAndType).length) return null
    if (!accountLabel) return null

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
          <MenuList minWidth='fit-content' maxHeight='200px' overflowY='auto' zIndex='modal'>
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
