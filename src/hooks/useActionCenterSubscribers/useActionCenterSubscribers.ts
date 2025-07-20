import { useAppUpdateActionSubscriber } from './useAppUpdateActionSubscriber'
import { useLimitOrderActionSubscriber } from './useLimitOrderActionSubscriber'
import { useSendActionSubscriber } from './useSendActionSubscriber'
import { useSwapActionSubscriber } from './useSwapActionSubscriber'

import { useRfoxClaimActionSubscriber } from '@/pages/RFOX/hooks/useRfoxClaimActionSubscriber'
import { useTcyClaimActionSubscriber } from '@/pages/TCY/hooks/useTcyClaimActionSubscriber'

export const useActionCenterSubscribers = () => {
  useSwapActionSubscriber()
  useLimitOrderActionSubscriber()
  useAppUpdateActionSubscriber()
  useRfoxClaimActionSubscriber()
  useTcyClaimActionSubscriber()
  useSendActionSubscriber()
}
