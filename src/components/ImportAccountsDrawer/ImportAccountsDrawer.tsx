import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
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
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectFeeAssetByChainId,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type ImportAccountsDrawerProps = {
  chainId: ChainId
  isOpen: boolean
  onClose: () => void
}

type TableRowProps = {
  accountId: AccountId
  accountNumber: number
  feeAsset: Asset
  toggleAccountId: (accountId: AccountId) => void
}

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

const TableRow = forwardRef<TableRowProps, 'div'>(
  ({ feeAsset, accountId, accountNumber, toggleAccountId }, ref) => {
    const handleChange = useCallback(() => toggleAccountId(accountId), [accountId, toggleAccountId])
    const accountLabel = useMemo(() => accountIdToLabel(accountId), [accountId])
    const balanceFilter = useMemo(
      () => ({ assetId: feeAsset.assetId, accountId }),
      [feeAsset, accountId],
    )

    const feeAssetBalancePrecision = useAppSelector(s =>
      selectPortfolioCryptoPrecisionBalanceByFilter(s, balanceFilter),
    )
    const pubkey = useMemo(() => fromAccountId(accountId).account, [accountId])

    return (
      <Tr>
        <Td>
          <RawText>{accountNumber}</RawText>
        </Td>
        <Td>
          <Switch onChange={handleChange} />
        </Td>
        <Td>
          <Tooltip label={pubkey}>
            <div ref={ref}>
              <MiddleEllipsis value={accountLabel} />
            </div>
          </Tooltip>
        </Td>
        <Td>
          <Amount.Crypto value={feeAssetBalancePrecision} symbol={feeAsset?.symbol ?? ''} />
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

export const ImportAccountsDrawer = ({ chainId, isOpen, onClose }: ImportAccountsDrawerProps) => {
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const chainNamespaceDisplayName = feeAsset?.networkName ?? ''
  const [accounts, setAccounts] = useState<{ accountNumber: number; accountId: AccountId }[]>([])
  const queryClient = useQueryClient()
  const isLoading = useIsFetching({ queryKey: ['accountManagement', 'loadAccount'] }) > 0

  // TODO:
  // when "done" is clicked, all enabled accounts for this chain will be upserted into the portfolio
  // all disabled ones will be removed.
  // need to call dispatch(portfolioApi.getAccount({ accountId, upsertOnFetch: true }))
  // which internally calls dispatch(portfolio.actions.upsertPortfolio(account)) and upserts assets
  // But also need to remove accounts that were disabled.

  // initial fetch to detect the number of accounts based on the "first empty account" heuristic
  useEffect(() => {
    ;(async () => {
      if (!wallet) return

      let accountNumber = 0
      const accounts = []

      while (true) {
        try {
          const accountResult = await queryClient.fetchQuery(
            reactQueries.accountManagement.loadAccount(accountNumber, chainId, wallet),
          )

          if (!accountResult) break

          const { accountId, hasActivity } = accountResult

          // Add the account before checking if it has activity so user has ability to toggle it if needed.
          accounts.push({ accountNumber, accountId })

          // If the account has no activity, it's the first empty account.
          if (!hasActivity) {
            break
          }
        } catch (error) {
          console.error(error)
          break
        }

        accountNumber++
      }

      setAccounts(accounts)
    })()
  }, [chainId, queryClient, wallet])

  const handleLoadMore = useCallback(async () => {
    if (!wallet) return
    const accountNumber = accounts.length
    const accountResult = await queryClient.fetchQuery(
      reactQueries.accountManagement.loadAccount(accountNumber, chainId, wallet),
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
    if (!feeAsset) return null
    return accounts.map(({ accountId, accountNumber }) => (
      <TableRow
        key={accountId}
        accountId={accountId}
        accountNumber={accountNumber}
        feeAsset={feeAsset}
        toggleAccountId={handleToggleAccountId}
      />
    ))
  }, [accounts, feeAsset, handleToggleAccountId])

  if (!feeAsset) {
    console.error(`No fee asset found for chainId: ${chainId}`)
    return null
  }

  return (
    <Drawer isOpen={isOpen} size='lg' placement='right' onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <RawText as='h3'>
            {translate('accountManagementSidebar.title', { chainNamespaceDisplayName })}
          </RawText>
          <Text
            color='text.subtle'
            fontSize='md'
            translation={'accountManagementSidebar.description'}
          />
        </DrawerHeader>

        <DrawerBody>
          <TableContainer>
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
        </DrawerBody>

        <DrawerFooter>
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
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
