import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { YieldForm } from './YieldForm'

import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import {
  getDefaultValidatorForYield,
  getYieldActionLabelKeys,
  isStakingYieldType,
} from '@/lib/yieldxyz/utils'
import { useYieldAccount } from '@/pages/Yields/YieldAccountContext'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYield } from '@/react-queries/queries/yieldxyz/useYield'

export const YieldManager = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { yieldId } = useParams<{ yieldId: string }>()
  const [searchParams] = useSearchParams()

  const action = searchParams.get('action') as 'enter' | 'exit' | 'claim' | undefined
  const validatorParam = searchParams.get('validator') ?? undefined

  const { data: yieldItem } = useYield(yieldId ?? '')

  const requiresValidatorSelection = yieldItem?.mechanics.requiresValidatorSelection ?? false

  const validatorAddress = useMemo(() => {
    if (!requiresValidatorSelection || !yieldItem) return undefined
    return validatorParam || getDefaultValidatorForYield(yieldItem.id)
  }, [requiresValidatorSelection, validatorParam, yieldItem])
  const { accountId, accountNumber } = useYieldAccount()
  const { data: allBalancesData } = useAllYieldBalances()
  const balances = yieldItem?.id ? allBalancesData?.normalized[yieldItem.id] : undefined

  const inputTokenSymbol = yieldItem?.inputTokens[0]?.symbol
  const outputTokenSymbol = yieldItem?.outputToken?.symbol
  const claimableTokenSymbol = balances?.byType[YieldBalanceType.Claimable]?.token?.symbol

  const exitSymbol = useMemo(() => {
    if (!yieldItem) return inputTokenSymbol
    const isStaking = isStakingYieldType(yieldItem.mechanics.type)
    if (isStaking && outputTokenSymbol && outputTokenSymbol !== inputTokenSymbol) {
      return outputTokenSymbol
    }
    return inputTokenSymbol
  }, [yieldItem, inputTokenSymbol, outputTokenSymbol])

  const title = useMemo(() => {
    if (!yieldItem) return translate('yieldXYZ.manage')
    const actionLabelKeys = getYieldActionLabelKeys(yieldItem.mechanics.type)
    if (action === 'enter') {
      return `${translate(actionLabelKeys.enter)} ${inputTokenSymbol ?? ''}`
    }
    if (action === 'exit') {
      return `${translate(actionLabelKeys.exit)} ${exitSymbol ?? ''}`
    }
    if (action === 'claim') {
      return translate('yieldXYZ.claimSymbol', { symbol: claimableTokenSymbol ?? '' })
    }
    return translate('yieldXYZ.manage')
  }, [action, yieldItem, translate, inputTokenSymbol, exitSymbol, claimableTokenSymbol])

  const handleClose = useCallback(() => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('modal')
    newParams.delete('action')
    navigate({ search: newParams.toString() }, { replace: true })
  }, [navigate, searchParams])

  if (!yieldItem) return null

  return (
    <Dialog isOpen={true} onClose={handleClose} isFullScreen>
      <DialogHeader>
        <DialogHeader.Left>{null}</DialogHeader.Left>
        <DialogHeader.Middle>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader.Middle>
        <DialogHeader.Right>
          <DialogCloseButton onClick={handleClose} />
        </DialogHeader.Right>
      </DialogHeader>
      <DialogBody py={0} px={4} flex={1}>
        <YieldForm
          yieldItem={yieldItem}
          balances={balances}
          action={action ?? 'enter'}
          validatorAddress={validatorAddress}
          accountId={accountId}
          accountNumber={accountNumber}
          onClose={handleClose}
          onDone={handleClose}
        />
      </DialogBody>
    </Dialog>
  )
}
