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
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { Asset } from '@shapeshiftoss/types'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { accountManagement } from 'react-queries/queries/accountManagement'
import { Amount } from 'components/Amount/Amount'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { RawText } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import {
  canAddMetaMaskAccount,
  useIsSnapInstalled,
} from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from 'hooks/useModal/useModal'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { fromBaseUnit } from 'lib/math'
import { isUtxoAccountId } from 'lib/utils/utxo'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectAccountIdsByChainId,
  selectFeeAssetByChainId,
  selectIsAccountIdEnabled,
  selectIsAnyAccountIdEnabled,
} from 'state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import { getAccountIdsWithActivityAndMetadata } from '../helpers'
import { DrawerContentWrapper } from './DrawerContent'

export type ImportAccountsProps = {
  chainId: ChainId
  onClose: () => void
}

type TableRowProps = {
  accountIds: AccountId[]
  accountNumber: number
  asset: Asset
  onToggleAccountIds: (accountIds: AccountId[]) => void
}

type TableRowAccountProps = {
  accountId: AccountId
  asset: Asset
}

const disabledProps = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

const TableRowAccount = forwardRef<TableRowAccountProps, 'div'>(({ asset, accountId }, ref) => {
  const accountLabel = useMemo(() => accountIdToLabel(accountId), [accountId])
  const pubkey = useMemo(() => fromAccountId(accountId).account, [accountId])
  const isUtxoAccount = useMemo(() => isUtxoAccountId(accountId), [accountId])

  const { data: account, isLoading } = useQuery(accountManagement.getAccount(accountId))

  const assetBalanceCryptoPrecision = useMemo(() => {
    if (!account) return '0'
    return fromBaseUnit(account.balance, asset.precision)
  }, [account, asset.precision])

  return (
    <>
      <Td fontWeight='bold'>
        <InlineCopyButton value={pubkey} isDisabled={isUtxoAccount}>
          <Tooltip label={pubkey} isDisabled={isUtxoAccount}>
            <div ref={ref}>
              <RawText>{accountLabel}</RawText>
            </div>
          </Tooltip>
        </InlineCopyButton>
      </Td>
      <Td textAlign='right'>
        {isLoading ? (
          <Skeleton height='24px' width='100%' />
        ) : (
          <Amount.Crypto value={assetBalanceCryptoPrecision} symbol={asset.symbol} />
        )}
      </Td>
    </>
  )
})

const TableRow = forwardRef<TableRowProps, 'div'>(
  ({ asset, accountNumber, accountIds, onToggleAccountIds }, ref) => {
    const isAccountEnabled = useAppSelector(state => selectIsAnyAccountIdEnabled(state, accountIds))

    const [isAccountActive, toggleIsAccountActive] = useToggle(isAccountEnabled)

    const handleToggleIsAccountActive = useCallback(() => {
      toggleIsAccountActive()
      onToggleAccountIds(accountIds)
    }, [accountIds, onToggleAccountIds, toggleIsAccountActive])

    const firstAccount = useMemo(() => accountIds[0], [accountIds])
    const otherAccountIds = useMemo(() => accountIds.slice(1), [accountIds])
    const otherAccounts = useMemo(() => {
      return otherAccountIds.map(accountId => (
        <Tr key={accountId} opacity={isAccountActive ? '1' : '0.5'}>
          <Td colSpan={2} bg='background.surface.raised.base'></Td>
          <TableRowAccount ref={ref} asset={asset} accountId={accountId} />
        </Tr>
      ))
    }, [asset, isAccountActive, otherAccountIds, ref])

    return (
      <>
        <Tr opacity={isAccountActive ? '1' : '0.5'}>
          <Td>
            <Switch size='lg' isChecked={isAccountActive} onChange={handleToggleIsAccountActive} />
          </Td>
          <Td>
            <RawText color='text.subtle'>{accountNumber}</RawText>
          </Td>

          <TableRowAccount ref={ref} asset={asset} accountId={firstAccount} />
        </Tr>
        {otherAccounts}
      </>
    )
  },
)

const LoadingRow = ({ numRows }: { numRows: number }) => {
  return (
    <>
      {Array(numRows)
        .fill(null)
        .map((_, i) => (
          <Tr key={i}>
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
        ))}
    </>
  )
}

export const ImportAccounts = ({ chainId, onClose }: ImportAccountsProps) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const {
    state: { wallet, isDemoWallet, deviceId: walletDeviceId },
    dispatch: walletDispatch,
  } = useWallet()
  const asset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const { isSnapInstalled } = useIsSnapInstalled()
  const isLedgerWallet = useMemo(() => wallet && isLedger(wallet), [wallet])
  const isMetaMaskMultichainWallet = useMemo(
    () => wallet instanceof MetaMaskMultiChainHDWallet,
    [wallet],
  )
  const chainNamespaceDisplayName = asset?.networkName ?? ''
  const [autoFetching, setAutoFetching] = useState(true)
  const [queryEnabled, setQueryEnabled] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toggledAccountIds, setToggledAccountIds] = useState<Set<AccountId>>(new Set())
  const accountManagementPopover = useModal('manageAccounts')

  // reset component state when chainId changes
  useEffect(() => {
    setAutoFetching(true)
    setToggledAccountIds(new Set())
  }, [chainId])

  // initial fetch to detect the number of accounts based on the "first empty account" heuristic
  const {
    data: accounts,
    fetchNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['accountIdWithActivityAndMetadata', chainId, walletDeviceId, wallet !== null],
    queryFn: async ({ pageParam: accountNumber }) => {
      return {
        accountNumber,
        accountIdWithActivityAndMetadata: await getAccountIdsWithActivityAndMetadata(
          accountNumber,
          chainId,
          wallet,
          Boolean(isSnapInstalled),
        ),
      }
    },
    initialPageParam: 0,
    getNextPageParam: lastPage => {
      return lastPage.accountNumber + 1
    },
    retry: false,
    enabled: queryEnabled,
  })

  const supportsMultiAccount = useMemo(() => {
    if (isDemoWallet) return false
    if (!wallet?.supportsBip44Accounts()) return false
    if (!accounts) return false
    if (!isMetaMaskMultichainWallet) return true

    return canAddMetaMaskAccount({
      accountNumber: accounts.pages.length,
      chainId,
      wallet,
      isSnapInstalled: !!isSnapInstalled,
    })
  }, [chainId, wallet, accounts, isMetaMaskMultichainWallet, isSnapInstalled, isDemoWallet])

  useEffect(() => {
    if (queryEnabled) return
    if (isMetaMaskMultichainWallet && !isSnapInstalled) return

    if (!isLedgerWallet) {
      setAutoFetching(true)
      setQueryEnabled(true)
      return
    }

    // Reset paging on mount for ledger wallet since the state and cache are not aware of what app
    // is open on the device. This is to prevent the cache from creating invalid state where the app
    // on the device is not open but the cache thinks it is.
    queryClient.resetQueries({ queryKey: ['accountIdWithActivityAndMetadata'] }).then(() => {
      setAutoFetching(true)
      setQueryEnabled(true)
    })
  }, [queryEnabled, isLedgerWallet, isMetaMaskMultichainWallet, isSnapInstalled, queryClient])

  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
  const existingAccountIdsForChain = accountIdsByChainId[chainId]

  // Handle initial automatic loading
  useEffect(() => {
    if (isFetching || isLoading || !autoFetching || !accounts || !queryEnabled) return

    // Check if the most recently fetched account has activity
    const isLastAccountActive = accounts.pages[
      accounts.pages.length - 1
    ].accountIdWithActivityAndMetadata.some(account => account.hasActivity)

    const isLastAccountInStore = existingAccountIdsForChain?.includes(
      accounts.pages[accounts.pages.length - 1].accountIdWithActivityAndMetadata[0]?.accountId,
    )

    // Keep fetching until we find an account without activity
    if (isLastAccountActive || isLastAccountInStore) {
      fetchNextPage()
    } else {
      // Stop auto-fetching and switch to manual mode
      setAutoFetching(false)
    }
  }, [
    accounts,
    fetchNextPage,
    autoFetching,
    isFetching,
    isLoading,
    queryEnabled,
    existingAccountIdsForChain,
  ])

  const handleLoadMore = useCallback(() => {
    if (isFetching || isLoading || autoFetching) return
    fetchNextPage()
  }, [autoFetching, isFetching, isLoading, fetchNextPage])

  const handleToggleAccountIds = useCallback((accountIds: AccountId[]) => {
    setToggledAccountIds(previousState => {
      const updatedState = new Set(previousState)
      for (const accountId of accountIds) {
        if (updatedState.has(accountId)) {
          updatedState.delete(accountId)
        } else {
          updatedState.add(accountId)
        }
      }

      return updatedState
    })
  }, [])

  const handleDone = useCallback(async () => {
    if (!walletDeviceId) {
      console.error('Missing walletDeviceId')
      return
    }

    if (isDemoWallet) {
      walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      accountManagementPopover.close()
      onClose()
      return
    }

    if (!accounts) {
      console.error('Missing accounts data')
      return
    }

    setIsSubmitting(true)

    // For every new account that is active, fetch the account and upsert it into the redux state
    await Promise.all(
      Array.from(toggledAccountIds).map(async accountId => {
        const isEnabled = selectIsAccountIdEnabled(store.getState(), { accountId })
        if (isEnabled) {
          return
        }
        await dispatch(
          portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }),
        )
      }),
    )

    const accountMetadataByAccountId = accounts.pages.reduce((accumulator, accounts) => {
      const obj = accounts.accountIdWithActivityAndMetadata.reduce(
        (innerAccumulator, { accountId, accountMetadata }) => {
          // Don't include accounts that are not toggled - they are either only
          // displayed and not toggled on, or are already in the store
          if (!toggledAccountIds.has(accountId)) return innerAccumulator

          return { ...innerAccumulator, [accountId]: accountMetadata }
        },
        {},
      )
      return { ...accumulator, ...obj }
    }, {})

    dispatch(
      portfolio.actions.upsertAccountMetadata({
        accountMetadataByAccountId,
        walletId: walletDeviceId,
      }),
    )

    for (const accountId of toggledAccountIds) {
      dispatch(portfolio.actions.toggleAccountIdEnabled(accountId))
    }

    // Reset toggled state
    setToggledAccountIds(new Set())

    setIsSubmitting(false)

    onClose()
  }, [
    toggledAccountIds,
    accounts,
    dispatch,
    onClose,
    walletDeviceId,
    isDemoWallet,
    walletDispatch,
    accountManagementPopover,
  ])

  const accountRows = useMemo(() => {
    if (!asset || !accounts) return null
    return accounts.pages.map(({ accountIdWithActivityAndMetadata }, accountNumber) => {
      const accountIds = accountIdWithActivityAndMetadata.map(({ accountId }) => accountId)
      const key = accountIds.join('-')
      if (accountIds.length === 0) return null
      return (
        <TableRow
          key={key}
          accountNumber={accountNumber}
          accountIds={accountIds}
          asset={asset}
          onToggleAccountIds={handleToggleAccountIds}
        />
      )
    })
  }, [accounts, asset, handleToggleAccountIds])

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
            isDisabled={isSubmitting}
            _disabled={disabledProps}
          >
            {translate('common.cancel')}
          </Button>
          <Button
            colorScheme='blue'
            onClick={handleDone}
            isDisabled={isFetching || isLoading || autoFetching || isSubmitting || !accounts}
            _disabled={disabledProps}
          >
            {isDemoWallet ? translate('common.connectWallet') : translate('common.done')}
          </Button>
        </>
      }
      body={
        <>
          <TableContainer mb={4}>
            <Table variant='simple'>
              <Tbody>
                {accountRows}
                {(isFetching || isLoading || autoFetching) && (
                  <LoadingRow
                    numRows={
                      accounts?.pages[accounts.pages.length - 1]?.accountIdWithActivityAndMetadata
                        .length ?? 0
                    }
                  />
                )}
              </Tbody>
            </Table>
          </TableContainer>
          <Tooltip
            label={translate('accountManagement.importAccounts.loadMoreDisabled')}
            isDisabled={supportsMultiAccount}
          >
            <Button
              colorScheme='gray'
              onClick={handleLoadMore}
              isDisabled={
                isFetching || isLoading || autoFetching || isSubmitting || !supportsMultiAccount
              }
              _disabled={disabledProps}
            >
              {translate('common.loadMore')}
            </Button>
          </Tooltip>
        </>
      }
    />
  )
}
