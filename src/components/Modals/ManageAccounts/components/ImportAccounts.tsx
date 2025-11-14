import { CheckIcon, CopyIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  Flex,
  forwardRef as chakraForwardRef,
  IconButton,
  Skeleton,
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
import { useInfiniteQuery, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { getAccountIdsWithActivityAndMetadata } from '../helpers'

import { Amount } from '@/components/Amount/Amount'
import { RawText } from '@/components/Text'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import {
  canAddMetaMaskAccount,
  useIsSnapInstalled,
} from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { fromBaseUnit } from '@/lib/math'
import { fetchPortalsAccount } from '@/lib/portals/utils'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { accountManagement } from '@/react-queries/queries/accountManagement'
import { assets as assetSlice } from '@/state/slices/assetsSlice/assetsSlice'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import type { Portfolio } from '@/state/slices/portfolioSlice/portfolioSliceCommon'
import {
  accountIdToLabel,
  accountToPortfolio,
  makeAssets,
} from '@/state/slices/portfolioSlice/utils'
import {
  selectAccountIdsByChainId,
  selectFeeAssetByChainId,
  selectIsAccountIdEnabled,
  selectIsAnyAccountIdEnabled,
} from '@/state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

export type ImportAccountsRef = {
  canCommit: boolean
  isSubmitting: boolean
  commit: () => void
}

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

const copyIcon = <CopyIcon />
const checkIcon = <CheckIcon />

const TableRowAccount = chakraForwardRef<TableRowAccountProps, 'div'>(
  ({ asset, accountId }, ref) => {
    const translate = useTranslate()
    const accountLabel = useMemo(() => accountIdToLabel(accountId), [accountId])
    const pubkey = useMemo(() => fromAccountId(accountId).account, [accountId])
    const isUtxoAccount = useMemo(() => isUtxoAccountId(accountId), [accountId])
    const { isCopied, isCopying, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

    const { data: account } = useQuery({
      ...accountManagement.getAccount(accountId),
      staleTime: Infinity,
      // Never garbage collect me, I'm a special snowflake
      gcTime: Infinity,
      // Yes, we do refetch on mount despite having an Infinity stale time. Stale then fresh FTW.
      refetchOnMount: 'always',
    })

    const assetBalanceCryptoPrecision = useMemo(() => {
      if (!account) return '0'
      return fromBaseUnit(account.balance, asset.precision)
    }, [account, asset.precision])

    const handleCopyClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        copyToClipboard(pubkey)
      },
      [copyToClipboard, pubkey],
    )

    const buttonProps = useMemo(
      () => ({
        icon: isCopied ? checkIcon : copyIcon,
        colorScheme: isCopied ? 'green' : 'gray',
        size: 'xs' as const,
        variant: 'ghost' as const,
        fontSize: 'sm',
        'aria-label': 'Copy value',
        onClick: handleCopyClick,
      }),
      [handleCopyClick, isCopied],
    )

    return (
      <>
        <Td fontWeight='bold' width='170px'>
          <Flex alignItems='center' justifyContent='space-between'>
            <Tooltip label={pubkey} isDisabled={isUtxoAccount}>
              <div ref={ref}>
                <RawText>{accountLabel}</RawText>
              </div>
            </Tooltip>
            {isUtxoAccount ? null : (
              <Tooltip isOpen={isCopying} label={translate('common.copied')}>
                <IconButton {...buttonProps} />
              </Tooltip>
            )}
          </Flex>
        </Td>
        <Td textAlign='right'>
          <Amount.Crypto value={assetBalanceCryptoPrecision} symbol={asset.symbol} />
        </Td>
      </>
    )
  },
)

const TableRow = chakraForwardRef<TableRowProps, 'div'>(
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
        <Tr key={accountId} opacity={isAccountActive ? 1 : 0.5}>
          <Td colSpan={2} bg='background.surface.raised.base'></Td>
          <TableRowAccount ref={ref} asset={asset} accountId={accountId} />
        </Tr>
      ))
    }, [asset, isAccountActive, otherAccountIds, ref])

    return (
      <>
        <Tr opacity={isAccountActive ? 1 : 0.5}>
          <Td width='50px' cursor='pointer' onClick={handleToggleIsAccountActive}>
            <Box opacity={1}>
              <Checkbox isChecked={isAccountActive} pointerEvents='none' />
            </Box>
          </Td>
          <Td width='60px'>
            <RawText>{accountNumber}</RawText>
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
            <Td width='50px'>
              <Box opacity={1}>
                <Skeleton height='20px' width='20px' my={0} />
              </Box>
            </Td>
            <Td width='60px'>
              <Skeleton height='20px' width='20px' my={0} startColor='transparent' />
            </Td>
            <Td width='170px'>
              <Flex alignItems='center' justifyContent='space-between'>
                <Skeleton height='20px' width='120px' my={0} startColor='transparent' />
                <Skeleton height='20px' width='20px' my={0} startColor='transparent' />
              </Flex>
            </Td>
            <Td textAlign='right'>
              <Skeleton height='20px' width='80px' ml='auto' my={0} startColor='transparent' />
            </Td>
          </Tr>
        ))}
    </>
  )
}

export const ImportAccounts = forwardRef<ImportAccountsRef, ImportAccountsProps>(
  ({ chainId, onClose }, ref) => {
    const [isAutoDiscovering, setIsAutoDiscovering] = useState(true)
    const [queryEnabled, setQueryEnabled] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [toggledAccountIds, setToggledAccountIds] = useState<Set<AccountId>>(new Set())

    const translate = useTranslate()
    const dispatch = useAppDispatch()
    const queryClient = useQueryClient()
    const {
      state: { wallet, deviceId: walletDeviceId },
    } = useWallet()
    const { isSnapInstalled } = useIsSnapInstalled()
    const isLedgerWallet = useMemo(() => wallet && isLedger(wallet), [wallet])
    const isMetaMaskMultichainWallet = useMemo(
      () => wallet instanceof MetaMaskMultiChainHDWallet,
      [wallet],
    )

    const asset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))

    useQueries({
      queries: Array.from(toggledAccountIds).map(accountId => {
        const { chainId, account: pubkey } = fromAccountId(accountId)

        return {
          queryFn: () => fetchPortalsAccount(chainId, pubkey),
          queryKey: ['portalsAccount', chainId, pubkey],
          // Assume that this is static as far as our lifecycle is concerned.
          // This may seem like a dangerous stretch, but it pragmatically is not:
          // This is fetched for a given account fetch, and the only flow there would be a refetch would really be if the user disabled an account, then re-enabled it.
          // It's an uncommon enough flow that we could compromise on it and make the experience better for all other cases by leveraging cached data.
          // Most importantly, even if a user were to do this, the worst case senario wouldn't be one: all we fetch here is LP tokens meta, which won't change
          // the second time around and not the 420th time around either
          staleTime: Infinity,
        }
      }),
    })

    // reset component state when chainId changes
    useEffect(() => {
      setIsAutoDiscovering(true)
      setToggledAccountIds(new Set())
    }, [chainId])

    // initial fetch to detect the number of accounts based on the "first empty account" heuristic
    const {
      data: accounts,
      fetchNextPage,
      isFetching: isAccountsFetching,
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
      if (!wallet?.supportsBip44Accounts()) return false
      if (!accounts) return false
      if (!isMetaMaskMultichainWallet) return true

      return canAddMetaMaskAccount({
        accountNumber: accounts.pages.length,
        chainId,
        wallet,
        isSnapInstalled: !!isSnapInstalled,
      })
    }, [chainId, wallet, accounts, isMetaMaskMultichainWallet, isSnapInstalled])

    useEffect(() => {
      if (queryEnabled) return
      if (isMetaMaskMultichainWallet && !isSnapInstalled) return

      if (!isLedgerWallet) {
        setIsAutoDiscovering(true)
        setQueryEnabled(true)
        return
      }

      // Reset paging on mount for ledger wallet since the state and cache are not aware of what app
      // is open on the device. This is to prevent the cache from creating invalid state where the app
      // on the device is not open but the cache thinks it is.
      queryClient.resetQueries({ queryKey: ['accountIdWithActivityAndMetadata'] }).then(() => {
        setIsAutoDiscovering(true)
        setQueryEnabled(true)
      })
    }, [queryEnabled, isLedgerWallet, isMetaMaskMultichainWallet, isSnapInstalled, queryClient])

    const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
    const existingAccountIdsForChain = accountIdsByChainId[chainId]

    // Handle initial automatic loading
    useEffect(() => {
      if (isAccountsFetching || !isAutoDiscovering || !accounts || !queryEnabled) return

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
        setIsAutoDiscovering(false)
      }
    }, [
      accounts,
      fetchNextPage,
      isAutoDiscovering,
      isAccountsFetching,
      queryEnabled,
      existingAccountIdsForChain,
    ])

    const handleLoadMore = useCallback(() => {
      if (isAccountsFetching || isAutoDiscovering) return
      fetchNextPage()
    }, [isAutoDiscovering, isAccountsFetching, fetchNextPage])

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

    const handleUpdateAccounts = useCallback(async () => {
      if (!walletDeviceId) {
        console.error('Missing walletDeviceId')
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

          // "Fetch" the query leveraging the existing cached data
          const account = await queryClient.fetchQuery({
            ...accountManagement.getAccount(accountId),
            staleTime: Infinity,
            // Never garbage collect me, I'm a special snowflake
            gcTime: Infinity,
          })

          const data = await (async (): Promise<Portfolio> => {
            const { chainId, account: pubkey } = fromAccountId(accountId)
            const state = store.getState()
            const portfolioAccounts = { [pubkey]: account }
            const assets = await makeAssets({ chainId, pubkey, state, portfolioAccounts })
            const assetIds = state.assets.ids

            // upsert placeholder assets
            if (assets) dispatch(assetSlice.actions.upsertAssets(assets))

            return accountToPortfolio({
              portfolioAccounts,
              assetIds: assetIds.concat(assets?.ids ?? []),
            })
          })()

          dispatch(portfolio.actions.upsertPortfolio(data))
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
    }, [toggledAccountIds, accounts, dispatch, walletDeviceId, queryClient])

    const handleCommit = useCallback(() => {
      // Do not await me, no need to run this on the next tick. This commits the selection in the background and should be turbo fast
      // This is technically async, but at this stage, most underlying react-queries should already be cached
      handleUpdateAccounts()
      onClose()
    }, [handleUpdateAccounts, onClose])

    useImperativeHandle(
      ref,
      () => ({
        canCommit: Boolean(accounts),
        isSubmitting,
        commit: handleCommit,
      }),
      [accounts, isSubmitting, handleCommit],
    )

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

    const tableSize = useMemo(
      () => ({
        base: 'sm',
        md: 'md',
      }),
      [],
    )

    const tableSx = useMemo(() => ({ 'td, th': { px: 3 } }), [])

    const initialLoadingRows = useMemo(() => {
      // Show skeleton rows when we haven't loaded any accounts yet
      if (!accounts && (isAutoDiscovering || isAccountsFetching)) {
        return <LoadingRow numRows={2} />
      }
      return null
    }, [accounts, isAutoDiscovering, isAccountsFetching])

    if (!asset) {
      console.error(`No fee asset found for chainId: ${chainId}`)
      return null
    }

    return (
      <>
        <TableContainer mb={4}>
          <Table variant='simple' size={tableSize} sx={tableSx}>
            <Tbody>
              {initialLoadingRows}
              {accountRows}
              {accounts && (isAccountsFetching || isAutoDiscovering) && (
                <LoadingRow
                  numRows={
                    accounts.pages[accounts.pages.length - 1]?.accountIdWithActivityAndMetadata
                      .length || 3
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
            onClick={handleLoadMore}
            isDisabled={
              isAccountsFetching || isAutoDiscovering || isSubmitting || !supportsMultiAccount
            }
            _disabled={disabledProps}
          >
            {translate('common.loadMore')}
          </Button>
        </Tooltip>
      </>
    )
  },
)
