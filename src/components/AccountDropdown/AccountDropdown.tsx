import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Button,
  ButtonProps,
  Menu,
  MenuButton,
  MenuList,
  MenuOptionGroup,
  Stack,
  Tag,
} from '@chakra-ui/react'
import { AccountId, AssetId, CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
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
  onChange?: (accountId: AccountId) => void
}

export const AccountDropdown: React.FC<AccountDropdownProps> = props => {
  const { assetId, buttonProps, onChange } = props
  const { chainId } = fromAssetId(assetId)
  const accountMetadata = useSelector(selectPortfolioAccountMetadata)

  const filter = useMemo(() => ({ assetId }), [assetId])
  const accountIds = useAppSelector((s: ReduxState) =>
    selectPortfolioAccountIdsByAssetId(s, filter),
  )

  const accountBalances = useSelector(selectPortfolioAccountBalances)
  const [selectedAccountId, setSelectedAccountId] = useState<AccountId | null>()
  const [selectedAccountLabel, setSelectedAccountLabel] = useState('')
  const [selectedAccountNumber, setSelectedAccountNumber] = useState(0)
  const asset = useAppSelector((s: ReduxState) => selectAssetById(s, assetId))
  const translate = useTranslate()

  useEffect(() => {
    if (isEmpty(accountMetadata)) return
    if (!selectedAccountId) return
    setSelectedAccountLabel(accountIdToLabel(selectedAccountId))
    setSelectedAccountNumber(
      (accountMetadata[selectedAccountId]?.bip44Params ?? {})?.accountNumber ?? 0,
    )
    onChange?.(selectedAccountId)
  }, [accountMetadata, selectedAccountId, onChange])

  useEffect(() => {
    if (!accountIds.length) return
    const accountId = accountIds[0] // default to the first when we receive them
    accountId !== selectedAccountId && setSelectedAccountId(accountId) // don't set to same thing again
    // this effect sets selectedAccountId for the first render when we receive accountIds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, accountIds])

  const onClick = useCallback((accountId: AccountId) => setSelectedAccountId(accountId), [])

  const menuOptions = useMemo(() => {
    const makeTitle = (accountId: AccountId) => {
      /**
       * for UTXO chains, we want the title to be the account type
       * for account-based chains, we want the title to be the asset name
       */
      const { chainNamespace } = fromChainId(chainId)
      switch (chainNamespace) {
        // note - conceptually this is really CHAIN_NAMESPACE.UTXO
        case CHAIN_NAMESPACE.Bitcoin: {
          return accountIdToLabel(accountId)
        }
        default: {
          return asset.name
        }
      }
    }

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

  if (!accountIds.length) return null

  return (
    <Menu closeOnSelect={true} matchWidth>
      <MenuButton
        as={Button}
        size='sm'
        rightIcon={<ChevronDownIcon />}
        variant='ghost'
        {...buttonProps}
      >
        <Stack direction='row' alignItems='center'>
          <RawText fontWeight='bold' color='var(--chakra-colors-chakra-body-text)'>
            {translate('accounts.accountNumber', { accountNumber: selectedAccountNumber })}
          </RawText>
          <Tag
            whiteSpace='nowrap'
            colorScheme='blue'
            fontSize='x-small'
            fontWeight='bold'
            minHeight='auto'
            py={1}
          >
            {selectedAccountLabel}
          </Tag>
          <RawText fontFamily='monospace' color='gray.500'></RawText>
        </Stack>
      </MenuButton>
      <MenuList minWidth='240px' maxHeight='200px' overflowY='auto'>
        <MenuOptionGroup defaultValue='asc' type='radio'>
          {menuOptions}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  )
}
