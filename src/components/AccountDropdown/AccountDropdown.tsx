import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Button,
  ButtonProps,
  Menu,
  MenuButton,
  MenuList,
  MenuOptionGroup,
  Stack,
  Text,
} from '@chakra-ui/react'
import {
  AccountId,
  AssetId,
  btcChainId,
  CHAIN_NAMESPACE,
  fromAssetId,
  fromChainId,
  ltcChainId,
} from '@shapeshiftoss/caip'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectPortfolioAccountBalances,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadata,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { RawText } from '../Text'
import { AccountChildOption } from './AccountChildOption'
import { AccountSegment } from './AccountSegement'

type AccountDropdownProps = {
  assetId: AssetId
  buttonProps?: ButtonProps
  onChange: (accountId: AccountId) => void
}

export const AccountDropdown: React.FC<AccountDropdownProps> = props => {
  const { assetId, buttonProps, onChange } = props
  const { chainId } = fromAssetId(assetId)

  const filter = useMemo(() => ({ assetId }), [assetId])
  const accountIds = useAppSelector((s: ReduxState) =>
    selectPortfolioAccountIdsByAssetId(s, filter),
  )

  const translate = useTranslate()
  const asset = useAppSelector((s: ReduxState) => selectAssetById(s, assetId))
  const accountBalances = useSelector(selectPortfolioAccountBalances)
  const accountMetadata = useSelector(selectPortfolioAccountMetadata)
  const [selectedAccountId, setSelectedAccountId] = useState<AccountId | null>()

  /**
   * react on selectedAccountId change
   */
  useEffect(() => {
    if (isEmpty(accountMetadata)) return
    if (!selectedAccountId) return
    onChange(selectedAccountId)
  }, [accountMetadata, selectedAccountId, onChange])

  /**
   * react on accountIds
   */
  useEffect(() => {
    if (!accountIds.length) return
    const accountId = accountIds[0] // default to the first when we receive them
    accountId !== selectedAccountId && setSelectedAccountId(accountId) // don't set to same thing again
    // this effect sets selectedAccountId for the first render when we receive accountIds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, accountIds])

  const onClick = useCallback((accountId: AccountId) => setSelectedAccountId(accountId), [])

  /**
   * memoized view bits and bobs
   */
  const accountLabel = useMemo(
    () => selectedAccountId && accountIdToLabel(selectedAccountId),
    [selectedAccountId],
  )

  const accountNumber = useMemo(
    () => selectedAccountId && accountMetadata[selectedAccountId].bip44Params.accountNumber,
    [accountMetadata, selectedAccountId],
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

    return Object.entries(accountIdsByNumberAndType).map(([accountNumber, accountIds]) => (
      <>
        <AccountSegment
          key={accountNumber}
          title={translate('accounts.accountNumber', { accountNumber })}
          subtitle={''} // hide me until we have the option to "nickname" accounts
        />
        {accountIds.map((accountId, index) => (
          <AccountChildOption
            key={`${accountId}-${index}`}
            title={makeTitle(accountId)}
            cryptoBalance={fromBaseUnit(accountBalances[accountId][assetId], asset.precision)}
            symbol={asset.symbol}
            isChecked={selectedAccountId === accountId}
            onClick={() => onClick(accountId)}
          />
        ))}
      </>
    ))
  }, [
    assetId,
    chainId,
    accountBalances,
    accountIds,
    accountMetadata,
    asset,
    translate,
    onClick,
    selectedAccountId,
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
    <Menu closeOnSelect={true} matchWidth>
      <MenuButton
        iconSpacing={0}
        as={Button}
        size='sm'
        rightIcon={<ChevronDownIcon />}
        variant='ghost'
        {...buttonProps}
      >
        <Stack direction='row' alignItems='center'>
          <RawText fontWeight='bold' color='var(--chakra-colors-chakra-body-text)'>
            {translate('accounts.accountNumber', { accountNumber })}
          </RawText>
          <Text fontWeight='medium' color='grey.500'>
            {accountLabel}
          </Text>
          <RawText fontFamily='monospace' color='gray.500'></RawText>
        </Stack>
      </MenuButton>
      <MenuList minWidth='fit-content' maxHeight='200px' overflowY='auto'>
        <MenuOptionGroup defaultValue='asc' type='radio'>
          {menuOptions}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  )
}
