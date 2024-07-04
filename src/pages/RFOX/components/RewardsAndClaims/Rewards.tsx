import { Box, CardBody } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, thorchainAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { Text } from 'components/Text'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import { useRuneAddressesQuery } from 'pages/RFOX/hooks/useRuneAddressesQuery'
import { selectTxsByFilter } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type RewardsContentProps = {
  stakingAssetAccountId: AccountId
}

type RewardsProps = {
  stakingAssetAccountId: AccountId
  headerComponent: JSX.Element
}

const coarselyFilteredTxsFilter = { txStatus: TxStatus.Confirmed, assetId: thorchainAssetId }

const RewardsContent = ({ stakingAssetAccountId }: RewardsContentProps) => {
  // Get a coarsely filtered list of txIds to filter further based on rFOX specific criteria
  const coarselyFilteredTxs = useAppSelector(state =>
    selectTxsByFilter(state, coarselyFilteredTxsFilter),
  )

  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(stakingAssetAccountId).account,
    [stakingAssetAccountId],
  )

  const {
    data: runeAddresses,
    isLoading,
    isFetching,
  } = useRuneAddressesQuery({ stakingAssetAccountAddress })

  console.log({ runeAddresses })

  // TODO: Fetch any rune accounts not held in tx history
  const txIds = useMemo(() => {
    if (isLoading || isFetching || !runeAddresses) {
      return []
    }

    const finelyFilteredTxs = coarselyFilteredTxs.filter(tx => {
      return runeAddresses.includes(tx.pubkey)
    })

    // TODO: Pagination, not slice
    return finelyFilteredTxs.slice(0, Number(5)).map(tx => tx.txid)
  }, [coarselyFilteredTxs, isFetching, isLoading, runeAddresses])

  if (!txIds.length) {
    return <Text color='text.subtle' translation='RFOX.noRewardsYet' />
  }

  return (
    <Box mx={-6}>
      <TransactionsGroupByDate txIds={txIds} isLoading={isLoading} />
    </Box>
  )
}

export const Rewards = ({ stakingAssetAccountId, headerComponent }: RewardsProps) => {
  return (
    <CardBody>
      {headerComponent}
      <Box>
        <RewardsContent stakingAssetAccountId={stakingAssetAccountId} />
      </Box>
    </CardBody>
  )
}
