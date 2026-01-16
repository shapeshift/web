import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { YieldForm } from './YieldForm'

import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import {
  COSMOS_ATOM_NATIVE_STAKING_YIELD_ID,
  DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID,
  SOLANA_SOL_NATIVE_MULTIVALIDATOR_STAKING_YIELD_ID,
} from '@/lib/yieldxyz/constants'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
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

  const validatorAddress = useMemo(() => {
    // For native staking with hardcoded defaults, always use the default validator (ignore URL param)
    if (
      yieldId === COSMOS_ATOM_NATIVE_STAKING_YIELD_ID ||
      yieldId === SOLANA_SOL_NATIVE_MULTIVALIDATOR_STAKING_YIELD_ID ||
      (yieldId?.includes('solana') && yieldId?.includes('native'))
    ) {
      return yieldItem?.chainId
        ? DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[yieldItem.chainId]
        : undefined
    }
    return validatorParam
  }, [yieldId, yieldItem?.chainId, validatorParam])
  const { accountId, accountNumber } = useYieldAccount()
  const { data: allBalancesData } = useAllYieldBalances()
  const balances = yieldItem?.id ? allBalancesData?.normalized[yieldItem.id] : undefined

  const inputTokenSymbol = yieldItem?.inputTokens[0]?.symbol
  const claimableTokenSymbol = balances?.byType[YieldBalanceType.Claimable]?.token?.symbol
  const isStaking = yieldItem?.mechanics.type === 'staking'

  const title = useMemo(() => {
    if (action === 'enter') {
      return isStaking
        ? translate('yieldXYZ.stakeSymbol', { symbol: inputTokenSymbol })
        : translate('yieldXYZ.depositSymbol', { symbol: inputTokenSymbol })
    }
    if (action === 'exit') {
      return isStaking
        ? translate('yieldXYZ.unstakeSymbol', { symbol: inputTokenSymbol })
        : translate('yieldXYZ.withdrawSymbol', { symbol: inputTokenSymbol })
    }
    if (action === 'claim') {
      return translate('yieldXYZ.claimSymbol', { symbol: claimableTokenSymbol ?? '' })
    }
    return translate('yieldXYZ.manage')
  }, [action, isStaking, translate, inputTokenSymbol, claimableTokenSymbol])

  if (!yieldItem) return null

  return (
    <Dialog isOpen={true} onClose={() => navigate(-1)} isFullScreen>
      <DialogHeader>
        <DialogHeader.Left>{null}</DialogHeader.Left>
        <DialogHeader.Middle>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader.Middle>
        <DialogHeader.Right>
          <DialogCloseButton onClick={() => navigate(-1)} />
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
          onClose={() => navigate(-1)}
          onDone={() => navigate(-1)}
        />
      </DialogBody>
    </Dialog>
  )
}
