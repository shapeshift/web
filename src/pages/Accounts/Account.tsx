import { Flex } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'

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

  const accountTokenElement = useMemo(() => <AccountToken />, [])

  const accountDetailsElement = useMemo(
    () =>
      feeAsset && accountId ? (
        <AccountDetails assetId={feeAsset.assetId} accountId={accountId} />
      ) : null,
    [feeAsset, accountId],
  )

  if (!feeAsset) return null

  return (
    <Flex flexDir='column' width='full'>
      <Routes>
        <Route index element={accountDetailsElement} />
        <Route path=':chainId/:assetSubId' element={accountTokenElement} />
        <Route path=':chainId/:assetSubId/:nftId' element={accountTokenElement} />
      </Routes>
    </Flex>
  )
}
