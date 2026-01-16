import type { AccountId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useYieldAccount } from '@/pages/Yields/YieldAccountContext'

type UseYieldAccountSyncOptions = {
  availableAccountIds: AccountId[]
}

type UseYieldAccountSyncReturn = {
  selectedAccountId: AccountId | undefined
  handleAccountChange: (accountId: AccountId) => void
}

export const useYieldAccountSync = ({
  availableAccountIds,
}: UseYieldAccountSyncOptions): UseYieldAccountSyncReturn => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { accountId: contextAccountId, setAccountId } = useYieldAccount()

  const accountIdParam = useMemo(() => searchParams.get('accountId') ?? undefined, [searchParams])

  const selectedAccountId = useMemo(() => {
    if (contextAccountId && availableAccountIds.includes(contextAccountId)) return contextAccountId
    if (accountIdParam && availableAccountIds.includes(accountIdParam)) return accountIdParam
    return availableAccountIds[0]
  }, [contextAccountId, accountIdParam, availableAccountIds])

  const prevSelectedRef = useRef<AccountId | undefined>(undefined)

  useEffect(() => {
    if (!selectedAccountId) return
    if (contextAccountId === selectedAccountId) return
    setAccountId(selectedAccountId)
  }, [contextAccountId, selectedAccountId, setAccountId])

  useEffect(() => {
    if (!selectedAccountId) return
    if (prevSelectedRef.current === selectedAccountId) return
    prevSelectedRef.current = selectedAccountId

    setSearchParams(
      prev => {
        if (prev.get('accountId') === selectedAccountId) return prev
        const next = new URLSearchParams(prev)
        next.set('accountId', selectedAccountId)
        return next
      },
      { replace: true },
    )
  }, [selectedAccountId, setSearchParams])

  const handleAccountChange = useCallback(
    (newAccountId: AccountId) => {
      setAccountId(newAccountId)
    },
    [setAccountId],
  )

  return {
    selectedAccountId,
    handleAccountChange,
  }
}
