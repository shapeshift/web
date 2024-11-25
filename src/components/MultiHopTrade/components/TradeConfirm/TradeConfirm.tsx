import { useMemo } from 'react'

import { useIsApprovalInitiallyNeeded } from '../MultiHopTradeConfirm/hooks/useIsApprovalInitiallyNeeded'
import { SharedConfirm } from '../SharedConfirm/SharedConfirm'
import { TradeConfirmFooter } from './TradeConfirmFooter'

export const TradeConfirm = () => {
  const { isLoading } = useIsApprovalInitiallyNeeded()

  const Body = useMemo(() => {
    return <>{'gm'}</>
  }, [])

  const Footer = useMemo(() => <TradeConfirmFooter />, [])

  return <SharedConfirm Body={Body} Footer={Footer} isLoading={isLoading} />
}
