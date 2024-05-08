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
  useToast,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { type AccountId, cosmosChainId, fromAccountId, thorchainChainId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { Asset } from '@shapeshiftoss/types'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { accountManagement } from 'react-queries/queries/accountManagement'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from 'components/Text'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { fromBaseUnit } from 'lib/math'
import { isUtxoAccountId } from 'lib/utils/utxo'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectFeeAssetByChainId,
  selectHighestAccountNumberForChainId,
  selectIsAccountIdEnabled,
  selectIsAnyAccountIdEnabled,
} from 'state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import { getAccountIdsWithActivityAndMetadata } from '../helpers'
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
        <Tooltip label={pubkey} isDisabled={isUtxoAccount}>
          <div ref={ref}>
            <MiddleEllipsis value={accountLabel} />
          </div>
        </Tooltip>
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
  const toast = useToast()
  const { wallet, deviceId: walletDeviceId } = useWallet().state
  const asset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const highestAccountNumberForChainIdFilter = useMemo(() => ({ chainId }), [chainId])
  const highestAccountNumber = useAppSelector(state =>
    selectHighestAccountNumberForChainId(state, highestAccountNumberForChainIdFilter),
  )
  const chainNamespaceDisplayName = asset?.networkName ?? ''
  const [autoFetching, setAutoFetching] = useState(true)
  const [toggledAccountIds, setToggledAccountIds] = useState<Set<AccountId>>(new Set())

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
  } = useInfiniteQuery({
    queryKey: ['accountIdWithActivityAndMetadata', chainId, walletDeviceId, wallet !== null],
    queryFn: async ({ pageParam: accountNumber }) => {
      try {
        return {
          accountNumber,
          accountIdWithActivityAndMetadata: await getAccountIdsWithActivityAndMetadata(
            accountNumber,
            chainId,
            wallet,
          ),
        }
      } catch (error) {
        if (
          wallet &&
          isLedger(wallet) &&
          (chainId === thorchainChainId || chainId === cosmosChainId)
        ) {
          // TEMP: Support for app checks one THORChain and Cosmos are currently missing in
          // hdwallet, so this is a temporary hack to prompt users to open the ledger app since
          // we cannot automatically check.
          toast({
            title: translate('walletProvider.ledger.errors.appNotOpen', {
              app: asset?.networkName,
            }),
            description: translate('walletProvider.ledger.errors.appNotOpenDescription', {
              app: asset?.networkName,
            }),
            status: 'error',
            duration: 9000,
            isClosable: true,
            position: 'top-right',
          })
        } else {
          toast({
            title: translate('accountManagement.errors.accountMetadataFailedToFetch.title'),
            description: translate(
              'accountManagement.errors.accountMetadataFailedToFetch.description',
            ),
            status: 'error',
            duration: 9000,
            isClosable: true,
            position: 'top-right',
          })
        }

        // rethrow error to prevent paging thru error state
        throw error
      }
    },
    initialPageParam: 0,
    getNextPageParam: lastPage => {
      return lastPage.accountNumber + 1
    },
    retry: false,
  })

  // Handle initial automatic loading
  useEffect(() => {
    if (isLoading || !autoFetching || !accounts) return

    // Account numbers are 0-indexed, so we need to add 1 to the highest account number.
    // Add additional empty accounts to show more accounts without having to load more.
    const numAccountsToLoad = highestAccountNumber + 1 + NUM_ADDITIONAL_EMPTY_ACCOUNTS

    if (accounts.pages.length < numAccountsToLoad) {
      fetchNextPage()
    } else {
      // Stop auto-fetching and switch to manual mode
      setAutoFetching(false)
    }
  }, [accounts, highestAccountNumber, fetchNextPage, autoFetching, isLoading])

  const handleLoadMore = useCallback(() => {
    if (isLoading || autoFetching) return
    fetchNextPage()
  }, [autoFetching, isLoading, fetchNextPage])

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

  // TODO: Loading state
  const handleDone = useCallback(async () => {
    // for every new account that is active, fetch the account and upsert it into the redux state
    for (const accountId of toggledAccountIds) {
      const isEnabled = selectIsAccountIdEnabled(store.getState(), { accountId })
      if (isEnabled) {
        continue
      }
      await dispatch(portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }))
    }

    if (!accounts) {
      return
    }

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

    onClose()
  }, [toggledAccountIds, accounts, dispatch, onClose, walletDeviceId])

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
          <Button colorScheme='gray' mr={3} onClick={onClose}>
            {translate('common.cancel')}
          </Button>
          <Button
            colorScheme='blue'
            onClick={handleDone}
            isDisabled={isLoading || autoFetching}
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
                {(isLoading || autoFetching) && <LoadingRow />}
              </Tbody>
            </Table>
          </TableContainer>
          <Button
            colorScheme='gray'
            onClick={handleLoadMore}
            isDisabled={isLoading || autoFetching}
            _disabled={disabledProps}
          >
            {translate('common.loadMore')}
          </Button>
        </>
      }
    />
  )
}
