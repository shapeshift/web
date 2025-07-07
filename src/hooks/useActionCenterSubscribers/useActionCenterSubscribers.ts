import { useAppUpdateActionSubscriber } from './useAppUpdateActionSubscriber'
import { useLimitOrderActionSubscriber } from './useLimitOrderActionSubscriber'
import { useSwapActionSubscriber } from './useSwapActionSubscriber'

import { useRfoxClaimActionSubscriber } from '@/pages/RFOX/hooks/useRfoxClaimActionSubscriber'

export const useActionCenterSubscribers = () => {
  useSwapActionSubscriber()
  useLimitOrderActionSubscriber()
  useAppUpdateActionSubscriber()
  useRfoxClaimActionSubscriber()
}
