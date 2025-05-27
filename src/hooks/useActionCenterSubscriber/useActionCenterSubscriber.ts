import { useLimitOrderActionSubscriber } from './useLimitOrderActionSubscriber'
import { useTradeActionSubscriber } from './useTradeActionSubscriber'

export const useActionCenterSubscriber = () => {
  useTradeActionSubscriber()
  useLimitOrderActionSubscriber()
}
