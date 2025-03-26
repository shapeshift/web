import { Flex } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { useParams } from 'react-router-dom'
import { Route, Routes } from 'react-router-dom'

import { AccountToken } from './AccountToken/AccountToken'

import { AccountDetails } from '@/components/AccountDetails'
import { accountIdToFeeAssetId } from '@/lib/utils/accounts'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type MatchParams = {
  accountId: AccountId
  assetId?: string
}

export const Account = () => {
  const { accountId } = useParams<MatchParams>()
  const parsedAccountId = decodeURIComponent(accountId ?? '')
  const feeAssetId = accountIdToFeeAssetId(parsedAccountId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))

  if (!feeAsset) return null

  return (
    <Flex flexDir='column' width='full'>
      <Routes>
        <Route path="" element={<AccountDetails assetId={feeAsset.assetId} accountId={accountId ?? ''} />} />
        <Route path=":assetId" element={<AccountToken />} />
      </Routes>
    </Flex>
  )
}
