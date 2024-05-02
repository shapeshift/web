import {
  Button,
  forwardRef,
  Skeleton,
  Switch,
  Table,
  TableContainer,
  Tbody,
  Td,
  Tooltip,
  Tr,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { type AccountId, fromAccountId } from '@shapeshiftoss/caip'
import type { AccountMetadata, Asset } from '@shapeshiftoss/types'
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { accountManagement } from 'react-queries/queries/accountManagement'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from 'components/Text'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isUtxoAccountId } from 'lib/utils/utxo'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectFeeAssetByChainId,
  selectHighestAccountNumberForChainId,
  selectIsAnyAccountIdEnabled,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { DrawerContentWrapper } from './DrawerContent'

// The number of additional empty accounts to include in the initial fetch
// Allows users to see more accounts without having to load more
const NUM_ADDITIONAL_EMPTY_ACCOUNTS = 1

export type ImportAccountsProps = {
  chainId: ChainId
  onClose: () => void
}

type TableRowProps = {
  accountIds: AccountId[]
  accountNumber: number
  asset: Asset
  onAccountIdsActiveChange: (accountIds: AccountId[], isActive: boolean) => void
}

type TableRowAccountProps = {
  accountId: AccountId
  asset: Asset
}

const disabledProps = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

const TableRowAccount = forwardRef<TableRowAccountProps, 'div'>(({ asset, accountId }, ref) => {
  const translate = useTranslate()
  const accountLabel = useMemo(() => accountIdToLabel(accountId), [accountId])
  const balanceFilter = useMemo(() => ({ assetId: asset.assetId, accountId }), [asset, accountId])

  // TODO: Redux wont have this for new accounts and will be 0, so we'll need to fetch it
  const assetBalancePrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, balanceFilter),
  )
  const pubkey = useMemo(() => fromAccountId(accountId).account, [accountId])

  const isUtxoAccount = useMemo(() => isUtxoAccountId(accountId), [accountId])

  return (
    <Tr>
      <Td>
        <Tooltip label={pubkey} isDisabled={isUtxoAccount}>
          <div ref={ref}>
            {isUtxoAccount ? (
              <RawText>{`${accountLabel} ${translate('common.account')}`}</RawText>
            ) : (
              <MiddleEllipsis value={accountLabel} />
            )}
          </div>
        </Tooltip>
      </Td>
      <Td>
        <Amount.Crypto value={assetBalancePrecision} symbol={asset?.symbol ?? ''} />
      </Td>
    </Tr>
  )
})

const TableRow = forwardRef<TableRowProps, 'div'>(
  ({ asset, accountNumber, accountIds, onAccountIdsActiveChange }, ref) => {
    const isAccountEnabledInRedux = useAppSelector(state =>
      selectIsAnyAccountIdEnabled(state, accountIds),
    )

    const [isAccountActive, toggleIsAccountActive] = useToggle(isAccountEnabledInRedux)

    useEffect(() => {
      onAccountIdsActiveChange(accountIds, isAccountActive)
    }, [accountIds, isAccountActive, isAccountEnabledInRedux, onAccountIdsActiveChange])

    return (
      <Tr>
        <Td>
          <RawText>{accountNumber}</RawText>
        </Td>
        <Td>
          <Switch isChecked={isAccountActive} onChange={toggleIsAccountActive} />
        </Td>
        <Td>
          {accountIds.map(accountId => (
            <TableRowAccount key={accountId} ref={ref} asset={asset} accountId={accountId} />
          ))}
        </Td>
      </Tr>
    )
  },
)

const LoadingRow = () => {
  return (
    <Tr>
      <Td>
        <Skeleton height='24px' width='100%' />
      </Td>
      <Td>
        <Skeleton height='24px' width='100%' />
      </Td>
      <Td>
        <Skeleton height='24px' width='100%' />
      </Td>
      <Td>
        <Skeleton height='24px' width='100%' />
      </Td>
    </Tr>
  )
}

export const ImportAccounts = ({ chainId, onClose }: ImportAccountsProps) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const { wallet, deviceId: walletDeviceId } = useWallet().state
  const asset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const highestAccountNumberForChainIdFilter = useMemo(() => ({ chainId }), [chainId])
  const highestAccountNumber = useAppSelector(state =>
    selectHighestAccountNumberForChainId(state, highestAccountNumberForChainIdFilter),
  )
  const chainNamespaceDisplayName = asset?.networkName ?? ''
  const [accounts, setAccounts] = useState<
    { accountId: AccountId; accountMetadata: AccountMetadata; hasActivity: boolean }[][]
  >([])
  const queryClient = useQueryClient()
  const isLoading = useIsFetching({ queryKey: ['accountManagement'] }) > 0
  const [accountIdActiveStateUpdate, setAccountIdActiveStateUpdate] = useState<
    Record<string, boolean>
  >({})

  // initial fetch to detect the number of accounts based on the "first empty account" heuristic
  const { data: allAccountIdsWithActivity } = useQuery(
    accountManagement.firstAccountIdsWithActivityAndMetadata(
      chainId,
      wallet,
      walletDeviceId,
      // Account numbers are 0-indexed, so we need to add 1 to the highest account number.
      // Add additional empty accounts to show more accounts without having to load more.
      highestAccountNumber + 1 + NUM_ADDITIONAL_EMPTY_ACCOUNTS,
    ),
  )

  useEffect(() => {
    setAccounts(allAccountIdsWithActivity ?? [])
  }, [allAccountIdsWithActivity])

  const handleLoadMore = useCallback(async () => {
    if (!wallet) return
    const accountNumber = accounts.length
    const accountResults = await queryClient.fetchQuery(
      reactQueries.accountManagement.accountIdWithActivityAndMetadata(
        accountNumber,
        chainId,
        wallet,
        walletDeviceId,
      ),
    )
    if (!accountResults.length) return
    setAccounts(previousAccounts => {
      return [...previousAccounts, accountResults]
    })
  }, [accounts, chainId, queryClient, wallet, walletDeviceId])

  const handleAccountIdsActiveChange = useCallback((accountIds: AccountId[], isActive: boolean) => {
    setAccountIdActiveStateUpdate(previousState => {
      const stateUpdate = accountIds.reduce((accumulator, accountId) => {
        return { ...accumulator, [accountId]: isActive }
      }, {})
      return { ...previousState, ...stateUpdate }
    })
  }, [])

  // TODO: Loading state
  const handleDone = useCallback(async () => {
    // for every new account that is active, fetch the account and upsert it into the redux state
    for (const [accountId, isActive] of Object.entries(accountIdActiveStateUpdate)) {
      if (!isActive) continue
      await dispatch(portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }))
    }

    const accountMetadataByAccountId = accounts.reduce((accumulator, accounts) => {
      const obj = accounts.reduce((innerAccumulator, { accountId, accountMetadata }) => {
        return { ...innerAccumulator, [accountId]: accountMetadata }
      }, {})
      return { ...accumulator, ...obj }
    }, {})

    dispatch(
      portfolio.actions.upsertAccountMetadata({
        accountMetadataByAccountId,
        walletId: walletDeviceId,
      }),
    )

    const hiddenAccountIds = Object.entries(accountIdActiveStateUpdate)
      .filter(([_, isActive]) => !isActive)
      .map(([accountId]) => accountId)

    dispatch(portfolio.actions.setHiddenAccountIds(hiddenAccountIds))

    onClose()
  }, [accountIdActiveStateUpdate, accounts, dispatch, onClose, walletDeviceId])

  const accountRows = useMemo(() => {
    if (!asset) return null
    return accounts.map((accountsForAccountNumber, accountNumber) => {
      const accountIds = accountsForAccountNumber.map(({ accountId }) => accountId)
      return (
        <TableRow
          key={accountNumber}
          accountNumber={accountNumber}
          accountIds={accountIds}
          asset={asset}
          onAccountIdsActiveChange={handleAccountIdsActiveChange}
        />
      )
    })
  }, [accounts, asset, handleAccountIdsActiveChange])

  if (!asset) {
    console.error(`No fee asset found for chainId: ${chainId}`)
    return null
  }

  return (
    <DrawerContentWrapper
      title={translate('accountManagement.importAccounts.title', { chainNamespaceDisplayName })}
      description={translate('accountManagement.importAccounts.description')}
      footer={
        <>
          <Button
            colorScheme='gray'
            mr={3}
            onClick={onClose}
            isDisabled={isLoading}
            _disabled={disabledProps}
          >
            {translate('common.cancel')}
          </Button>
          <Button
            colorScheme='blue'
            onClick={handleDone}
            isDisabled={isLoading}
            _disabled={disabledProps}
          >
            {translate('common.done')}
          </Button>
        </>
      }
      body={
        <>
          <TableContainer mb={4}>
            <Table variant='simple'>
              <Tbody>
                {accountRows}
                {isLoading && <LoadingRow />}
              </Tbody>
            </Table>
          </TableContainer>
          <Button
            colorScheme='gray'
            onClick={handleLoadMore}
            isDisabled={isLoading}
            _disabled={disabledProps}
          >
            {translate('common.loadMore')}
          </Button>
        </>
      }
    />
  )
}
