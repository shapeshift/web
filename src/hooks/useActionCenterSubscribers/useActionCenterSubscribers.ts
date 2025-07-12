import { useAppUpdateActionSubscriber } from './useAppUpdateActionSubscriber'
import { useEvergreenDepositActionSubscriber } from './useEvergreenDepositActionSubscriber'
import { useLimitOrderActionSubscriber } from './useLimitOrderActionSubscriber'
import { useSwapActionSubscriber } from './useSwapActionSubscriber'

import { useRfoxClaimActionSubscriber } from '@/pages/RFOX/hooks/useRfoxClaimActionSubscriber'

export const useActionCenterSubscribers = () => {
  useSwapActionSubscriber()
  useLimitOrderActionSubscriber()
  useAppUpdateActionSubscriber()
  useRfoxClaimActionSubscriber()
  useEvergreenDepositActionSubscriber()
}
