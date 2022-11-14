import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button } from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import isEqual from 'lodash/isEqual'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router'
import { NavLink } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { TransactionHistoryList } from 'components/TransactionHistory/TransactionHistoryList'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import {
  selectAccountIdsByAssetId,
  selectAssetById,
  selectTxIdsByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetTransactionHistoryProps = {
  assetId: AssetId
  accountId?: AccountId
  useCompactMode?: boolean
  limit?: number
}
export type MatchParams = {
  chainId: ChainId
  assetSubId: string
}

export const AssetTransactionHistory: React.FC<AssetTransactionHistoryProps> = ({
  assetId,
  accountId,
  useCompactMode = false,
  limit,
}) => {
  const translate = useTranslate()
  const location = useLocation()
  const generatedPath = `${location.pathname}/transactions`
  const {
    state: { wallet },
  } = useWallet()

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const chainId = asset.chainId
  const accountIdsFilter = useMemo(() => ({ assetId }), [assetId])
  const accountIds = useAppSelector(
    state => selectAccountIdsByAssetId(state, accountIdsFilter),
    isEqual,
  )
  const filter = useMemo(
    // if we are passed an accountId, we're on an asset account page, use that specifically.
    // otherwise, we're on an asset page, use all accountIds related to this asset
    () => ({ assetIds: [assetId], accountIds: accountId ? [accountId] : accountIds }),
    [assetId, accountId, accountIds],
  )

  const walletSupportsChain = useWalletSupportsChain({ chainId, wallet })

  const txIds = useAppSelector(state => selectTxIdsByFilter(state, filter))

  if (!walletSupportsChain) return null

  return (
    <Card>
      <Card.Header display='flex' justifyContent='space-between' alignItems='center'>
        <Card.Heading>
          {translate(
            useCompactMode
              ? 'transactionHistory.recentTransactions'
              : 'transactionHistory.transactionHistory',
          )}
        </Card.Heading>
        {limit && txIds.length > limit && (
          <Button
            variant='link'
            size='sm'
            colorScheme='blue'
            as={NavLink}
            to={generatedPath}
            rightIcon={<ArrowForwardIcon />}
          >
            {translate('common.seeAll')}
          </Button>
        )}
      </Card.Header>
      <TransactionHistoryList
        txIds={limit ? txIds.slice(0, limit) : txIds}
        useCompactMode={useCompactMode}
      />
    </Card>
  )
}
