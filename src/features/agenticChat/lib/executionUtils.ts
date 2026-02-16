import type { AccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'
import type { DynamicToolUIPart } from 'ai'

import { StepStatus } from './stepUtils'

export function getToolStateStatus(toolState: DynamicToolUIPart['state']): StepStatus {
  if (toolState === 'output-error') return StepStatus.FAILED
  if (toolState === 'input-streaming' || toolState === 'input-available')
    return StepStatus.IN_PROGRESS
  if (toolState === 'output-available') return StepStatus.COMPLETE
  return StepStatus.NOT_STARTED
}

type WalletState = { wallet: HDWallet | null }

export function validateExecutionContext(
  walletState: WalletState,
  accountId: AccountId | undefined,
  accountMetadata: AccountMetadata | undefined,
): { wallet: HDWallet; accountId: AccountId; accountMetadata: AccountMetadata } {
  if (!walletState.wallet) {
    throw new Error('No wallet connected')
  }
  if (!accountId || !accountMetadata) {
    throw new Error('Account not found')
  }

  return { wallet: walletState.wallet, accountId, accountMetadata }
}
