import { useAppUpdateActionSubscriber } from './useAppUpdateActionSubscriber'
import { useGenericTransactionSubscriber } from './useGenericTransactionSubscriber'
import { useLimitOrderActionSubscriber } from './useLimitOrderActionSubscriber'
import { useSendActionSubscriber } from './useSendActionSubscriber'
import { useSwapActionSubscriber } from './useSwapActionSubscriber'
import { useThorchainLpWithdrawActionSubscriber } from './useThorchainLpWithdrawActionSubscriber'

import { useRfoxClaimActionSubscriber } from '@/pages/RFOX/hooks/useRfoxClaimActionSubscriber'
import { useTcyClaimActionSubscriber } from '@/pages/TCY/hooks/useTcyClaimActionSubscriber'

export const useActionCenterSubscribers = () => {
  useSwapActionSubscriber()
  useLimitOrderActionSubscriber()
  useAppUpdateActionSubscriber()
  useRfoxClaimActionSubscriber()
  useTcyClaimActionSubscriber()
  useGenericTransactionSubscriber()
  useSendActionSubscriber()
  useThorchainLpWithdrawActionSubscriber()
}
