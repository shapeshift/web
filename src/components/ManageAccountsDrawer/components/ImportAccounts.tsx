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
import type { Asset } from '@shapeshiftoss/types'
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { accountManagement } from 'react-queries/queries/accountManagement'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isUtxoAccountId } from 'lib/utils/utxo'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectFeeAssetByChainId,
  selectPortfolioAccounts,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DrawerContentWrapper } from './DrawerContent'

// The number of additional empty accounts to include in the initial fetch
// Allows users to see more accounts without having to load more
const NUM_ADDITIONAL_EMPTY_ACCOUNTS = 1

export type ImportAccountsProps = {
  chainId: ChainId
  onClose: () => void
}

type TableRowProps = {
  accountId: AccountId
  accountNumber: number
  asset: Asset
  toggleAccountId: (accountId: AccountId) => void
}

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

const TableRow = forwardRef<TableRowProps, 'div'>(
  ({ asset, accountId, accountNumber, toggleAccountId }, ref) => {
    const translate = useTranslate()
    const handleChange = useCallback(() => toggleAccountId(accountId), [accountId, toggleAccountId])
    const accountLabel = useMemo(() => accountIdToLabel(accountId), [accountId])
    const balanceFilter = useMemo(() => ({ assetId: asset.assetId, accountId }), [asset, accountId])

    const portfolioAccounts = useAppSelector(selectPortfolioAccounts)
    const isAccountActive = useMemo(() => {
      return portfolioAccounts[accountId] !== undefined
    }, [accountId, portfolioAccounts])

    const assetBalancePrecision = useAppSelector(s =>
      selectPortfolioCryptoPrecisionBalanceByFilter(s, balanceFilter),
    )
    const pubkey = useMemo(() => fromAccountId(accountId).account, [accountId])

    const isUtxoAccount = useMemo(() => isUtxoAccountId(accountId), [accountId])

    return (
      <Tr>
        <Td>
          <RawText>{accountNumber}</RawText>
        </Td>
        <Td>
          <Switch isChecked={isAccountActive} onChange={handleChange} />
        </Td>
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
  const wallet = useWallet().state.wallet
  const asset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const chainNamespaceDisplayName = asset?.networkName ?? ''
  const [accounts, setAccounts] = useState<{ accountNumber: number; accountId: AccountId }[]>([])
  const queryClient = useQueryClient()
  const isLoading = useIsFetching({ queryKey: ['accountManagement'] }) > 0

  // TODO:
  // when "done" is clicked, all enabled accounts for this chain will be upserted into the portfolio
  // all disabled ones will be removed.
  // need to call dispatch(portfolioApi.getAccount({ accountId, upsertOnFetch: true }))
  // which internally calls dispatch(portfolio.actions.upsertPortfolio(account)) and upserts assets
  // But also need to remove accounts that were disabled.

  // initial fetch to detect the number of accounts based on the "first empty account" heuristic
  const { data: allAccountIdsWithActivity } = useQuery(
    accountManagement.allAccountIdsWithActivity(chainId, wallet, NUM_ADDITIONAL_EMPTY_ACCOUNTS),
  )

  useEffect(() => {
    setAccounts(allAccountIdsWithActivity ?? [])
  }, [allAccountIdsWithActivity])

  const handleLoadMore = useCallback(async () => {
    if (!wallet) return
    const accountNumber = accounts.length
    const accountResult = await queryClient.fetchQuery(
      reactQueries.accountManagement.accountIdWithActivity(accountNumber, chainId, wallet),
    )
    if (!accountResult) return
    setAccounts(previousAccounts => {
      const { accountId } = accountResult
      return [...previousAccounts, { accountNumber, accountId }]
    })
  }, [accounts, chainId, queryClient, wallet])

  const handleToggleAccountId = useCallback((accountId: AccountId) => {
    console.log('handleToggleAccountId', accountId)
  }, [])

  const accountRows = useMemo(() => {
    if (!asset) return null
    return accounts.map(({ accountId, accountNumber }) => (
      <TableRow
        key={accountId}
        accountId={accountId}
        accountNumber={accountNumber}
        asset={asset}
        toggleAccountId={handleToggleAccountId}
      />
    ))
  }, [accounts, asset, handleToggleAccountId])

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
            _disabled={disabledProp}
          >
            {translate('common.cancel')}
          </Button>
          <Button colorScheme='blue' isDisabled={isLoading} _disabled={disabledProp}>
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
            _disabled={disabledProp}
          >
            {translate('common.loadMore')}
          </Button>
        </>
      }
    />
  )
}
