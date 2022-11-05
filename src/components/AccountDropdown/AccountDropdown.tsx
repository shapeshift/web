import { ChevronDownIcon } from '@chakra-ui/icons'
import type { BoxProps } from '@chakra-ui/react'
import {
  type ButtonProps,
  type MenuItemOptionProps,
  Box,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuOptionGroup,
  Stack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import {
  type AccountId,
  type AssetId,
  btcChainId,
  CHAIN_NAMESPACE,
  fromAssetId,
  fromChainId,
  ltcChainId,
} from '@keepkey/caip'
import { UtxoAccountType } from '@keepkey/types'
import { chain } from 'lodash'
import isEmpty from 'lodash/isEmpty'
import sortBy from 'lodash/sortBy'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { type ReduxState } from 'state/reducer'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectHighestFiatBalanceAccountByAssetId,
  selectPortfolioAccountBalances,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadata,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

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

export const AccountDropdown: FC<AccountDropdownProps> = ({
  assetId,
  buttonProps,
  onChange: handleChange,
  disabled,
  defaultAccountId,
  listProps,
  autoSelectHighestBalance,
  boxProps,
}) => {
  const { chainId } = fromAssetId(assetId)

  const color = useColorModeValue('black', 'white')

  const filter = useMemo(() => ({ assetId }), [assetId])
  const accountIds = useAppSelector((s: ReduxState) =>
    selectPortfolioAccountIdsByAssetId(s, filter),
  )

  const translate = useTranslate()
  const asset = useAppSelector((s: ReduxState) => selectAssetById(s, assetId))
  const accountBalances = useSelector(selectPortfolioAccountBalances)
  const accountMetadata = useSelector(selectPortfolioAccountMetadata)
  const highestFiatBalanceAccountId = useAppSelector(state =>
    selectHighestFiatBalanceAccountByAssetId(state, { assetId }),
  )
  const [selectedAccountId, setSelectedAccountId] = useState<Nullable<AccountId>>()
  const isDropdownDisabled = disabled || accountIds.length <= 1

  /**
   * react on selectedAccountId change
   */
  useEffect(() => {
    if (isEmpty(accountMetadata)) return
    if (!selectedAccountId) return
    handleChange(selectedAccountId)
  }, [accountMetadata, selectedAccountId, handleChange])

  /**
   * react on accountIds on first render
   */
  useEffect(() => {
    if (!accountIds.length) return
    const validatedAccountIdFromArgs = accountIds.find(accountId => accountId === defaultAccountId)
    const firstAccountId = accountIds[0]
    // Use the first accountId if we don't have a valid defaultAccountId
    const preSelectedAccountId =
      validatedAccountIdFromArgs ??
      (autoSelectHighestBalance ? highestFiatBalanceAccountId : undefined) ??
      firstAccountId
    setSelectedAccountId(preSelectedAccountId)
    // this effect sets selectedAccountId on first render when we receive accountIds and when defaultAccountId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, accountIds, defaultAccountId])

  const handleClick = useCallback((accountId: AccountId) => setSelectedAccountId(accountId), [])

  /**
   * memoized view bits and bobs
   */
  const accountLabel = useMemo(
    () => selectedAccountId && accountIdToLabel(selectedAccountId),
    [selectedAccountId],
  )

  const accountNumber = useMemo(
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
    const makeTitle = (accountId: AccountId) => {
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
          return asset.name
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
        <>
          <AccountSegment
            key={accountNumber}
            title={translate('accounts.accountNumber', { accountNumber })}
            subtitle={''} // hide me until we have the option to "nickname" accounts
          />
          {sortedAccountIds.map((iterAccountId, index) => (
            <AccountChildOption
              key={`${iterAccountId}-${index}`}
              title={makeTitle(iterAccountId)}
              cryptoBalance={fromBaseUnit(
                accountBalances?.[iterAccountId]?.[assetId] ?? 0,
                asset.precision,
              )}
              symbol={asset.symbol}
              isChecked={selectedAccountId === iterAccountId}
              onClick={() => handleClick(iterAccountId)}
              isDisabled={disabled}
              {...listProps}
            />
          ))}
        </>
      )
    })
  }, [
    accountIds,
    chainId,
    asset.name,
    asset.precision,
    asset.symbol,
    accountMetadata,
    autoSelectHighestBalance,
    getAccountIdsSortedByBalance,
    getAccountIdsSortedByUtxoAccountType,
    translate,
    accountBalances,
    assetId,
    selectedAccountId,
    disabled,
    listProps,
    handleClick,
  ])

  /**
   * these chains already have multi account support via sending and receiving,
   * and we need to use *and* render this new component while we retrofit the rest of the app
   *
   * the effectful logic above will still run for other chains, and return the first account
   * via the onChange callback on mount, but nothing will be visually rendered
   */
  const existingMultiAccountChainIds = useMemo(() => [btcChainId, ltcChainId], [])
  const isMultiAccountsEnabled = useFeatureFlag('MultiAccounts')
  if (!isMultiAccountsEnabled && !existingMultiAccountChainIds.includes(chainId)) return null

  if (!accountIds.length) return null

  return (
    <Box px={2} my={2} {...boxProps}>
      <Menu closeOnSelect={true} matchWidth>
        <MenuButton
          iconSpacing={0}
          as={Button}
          size='sm'
          rightIcon={isDropdownDisabled ? null : <ChevronDownIcon />}
          variant='ghost'
          color={color}
          disabled={isDropdownDisabled}
          {...buttonProps}
        >
          <Stack direction='row' alignItems='center'>
            <RawText fontWeight='bold'>
              {translate('accounts.accountNumber', { accountNumber })}
            </RawText>
            <Text fontWeight='medium' color='grey.500'>
              {accountLabel}
            </Text>
          </Stack>
        </MenuButton>
        <MenuList minWidth='fit-content' maxHeight='200px' overflowY='auto' zIndex='modal'>
          <MenuOptionGroup defaultValue='asc' type='radio'>
            {menuOptions}
          </MenuOptionGroup>
        </MenuList>
      </Menu>
    </Box>
  )
}
