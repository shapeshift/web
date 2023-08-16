import { ChevronDownIcon } from '@chakra-ui/icons'
import type { BoxProps } from '@chakra-ui/react'
import {
  type ButtonProps,
  type MenuItemOptionProps,
  Box,
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuList,
  MenuOptionGroup,
  Portal,
  Text,
  useColorModeValue,
  usePrevious,
} from '@chakra-ui/react'
import {
  type AccountId,
  type AssetId,
  CHAIN_NAMESPACE,
  fromAccountId,
  fromAssetId,
  fromChainId,
} from '@shapeshiftoss/caip'
import { UtxoAccountType } from '@shapeshiftoss/types'
import { chain } from 'lodash'
import isEmpty from 'lodash/isEmpty'
import sortBy from 'lodash/sortBy'
import React, { type FC, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { isValidAccountNumber } from 'lib/utils'
import { type ReduxState } from 'state/reducer'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectHighestUserCurrencyBalanceAccountByAssetId,
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAccountIdsByAssetId,
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
    const { chainId } = fromAssetId(assetId)

    const color = useColorModeValue('black', 'white')
    const labelColor = useColorModeValue('gray.600', 'text.subtle')

    const filter = useMemo(() => ({ assetId }), [assetId])
    const accountIds = useAppSelector((s: ReduxState) =>
      selectPortfolioAccountIdsByAssetId(s, filter),
    )

    const translate = useTranslate()
    const asset = useAppSelector((s: ReduxState) => selectAssetById(s, assetId))

    if (!asset) throw new Error(`AccountDropdown: no asset found for assetId ${assetId}!`)

    const accountBalances = useSelector(selectPortfolioAccountBalancesBaseUnit)
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

    const menuOptions = useMemo(() => {
      const makeTitle = (accountId: AccountId): string => {
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
      }

      /**
       * for UTXO-based chains, we can have many accounts for a single account number
       * e.g. account 0 can have legacy, segwit, and segwit native
       *
       * this allows us to render the multiple account varieties and their balances for
       * the native asset for UTXO chains, or a single row with the selected asset for
       * account based chains that support tokens
       */
      type AccountIdsByNumberAndType = {
        [k: number]: AccountId[]
      }
      const initial: AccountIdsByNumberAndType = {}

      const accountIdsByNumberAndType = accountIds.reduce((acc, accountId) => {
        const account = accountMetadata[accountId]
        if (!account) return acc
        const { accountNumber } = account.bip44Params
        if (!acc[accountNumber]) acc[accountNumber] = []
        acc[accountNumber].push(accountId)
        return acc
      }, initial)

      return Object.entries(accountIdsByNumberAndType).map(([accountNumber, accountIds]) => {
        const sortedAccountIds = autoSelectHighestBalance
          ? getAccountIdsSortedByBalance(accountIds)
          : getAccountIdsSortedByUtxoAccountType(accountIds)
        return (
          <React.Fragment key={accountNumber}>
            <AccountSegment
              title={translate('accounts.accountNumber', { accountNumber })}
              subtitle={accountLabel} // hide me until we have the option to "nickname" accounts
            />
            {sortedAccountIds.map((iterAccountId, index) => (
              <AccountChildOption
                key={`${accountNumber}-${iterAccountId}-${index}`}
                title={makeTitle(iterAccountId)}
                cryptoBalance={fromBaseUnit(
                  accountBalances?.[iterAccountId]?.[assetId] ?? 0,
                  asset?.precision ?? 0,
                )}
                symbol={asset?.symbol ?? ''}
                isChecked={selectedAccountId === iterAccountId}
                onClick={() => handleClick(iterAccountId)}
                isDisabled={disabled}
                {...listProps}
              />
            ))}
          </React.Fragment>
        )
      })
    }, [
      accountIds,
      chainId,
      asset?.name,
      asset?.precision,
      asset?.symbol,
      accountMetadata,
      autoSelectHighestBalance,
      getAccountIdsSortedByBalance,
      getAccountIdsSortedByUtxoAccountType,
      translate,
      accountLabel,
      accountBalances,
      assetId,
      selectedAccountId,
      disabled,
      listProps,
      handleClick,
    ])

    /**
     * do NOT remove these checks, this is not a visual thing, this is a safety check!
     *
     * this component is responsible for selecting the correct account for operations where
     * we are sending funds, we need to be paranoid.
     */
    if (!accountIds.length) return null
    if (!isValidAccountNumber(accountNumber)) return null
    if (!menuOptions.length) return null
    if (!accountLabel) return null

    return (
      <Box px={2} my={2} {...boxProps}>
        <Menu closeOnSelect={true} autoSelect={false} flip>
          <MenuButton
            iconSpacing={1}
            as={Button}
            size='sm'
            rightIcon={isDropdownDisabled ? null : <ChevronDownIcon />}
            variant='ghost'
            color={color}
            disabled={isDropdownDisabled}
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
                    <Text fontWeight='medium' color={labelColor}>
                      {accountLabel}
                    </Text>
                  )}
                </>
              )}
            </Flex>
          </MenuButton>
          <Portal>
            <MenuList minWidth='fit-content' maxHeight='200px' overflowY='auto' zIndex='modal'>
              <MenuOptionGroup defaultValue='asc' type='radio'>
                {menuOptions}
              </MenuOptionGroup>
            </MenuList>
          </Portal>
        </Menu>
      </Box>
    )
  },
)
