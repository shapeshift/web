import { useMemo } from 'react'

import { useIsApprovalInitiallyNeeded } from '../MultiHopTradeConfirm/hooks/useIsApprovalInitiallyNeeded'
import { SharedConfirm } from '../SharedConfirm/SharedConfirm'
import { TradeConfirmBody } from './TradeConfirmBody'
import { TradeConfirmFooter } from './TradeConfirmFooter'

export const TradeConfirm = () => {
  const { isLoading } = useIsApprovalInitiallyNeeded()

  const Footer = useMemo(() => <TradeConfirmFooter />, [])
  const Body = useMemo(() => <TradeConfirmBody />, [])

  return <SharedConfirm Body={Body} Footer={Footer} isLoading={isLoading} />
}
