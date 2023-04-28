import { Flex } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { Route, Switch, useParams, useRouteMatch } from 'react-router-dom'
import { AccountDetails } from 'components/AccountDetails'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountToken } from './AccountToken/AccountToken'
import { AccountTokenTxHistory } from './AccountToken/AccountTokenTxHistory'
import { AccountTxHistory } from './AccountTxHistory'

export type MatchParams = {
  accountId: AccountId
  assetId?: string
}

export const Account = () => {
  const { accountId } = useParams<MatchParams>()
  const { path } = useRouteMatch()
  const parsedAccountId = decodeURIComponent(accountId)
  const feeAssetId = accountIdToFeeAssetId(parsedAccountId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))

  if (!feeAsset) return null

  return (
    <Flex flexDir='column' width='full'>
      <Switch>
        <Route exact path={`${path}`}>
          <AccountDetails assetId={feeAsset.assetId} accountId={accountId} />
        </Route>
        <Route exact path={`${path}/transactions`}>
          <AccountTxHistory />
        </Route>
        <Route exact path={`${path}/:assetId`}>
          <AccountToken />
        </Route>
        <Route exact path={`${path}/:assetId/transactions`}>
          <AccountTokenTxHistory />
        </Route>
      </Switch>
    </Flex>
  )
}
