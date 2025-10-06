import { useAppUpdateActionSubscriber } from './useAppUpdateActionSubscriber'
import { useArbitrumBridgeActionSubscriber } from './useArbitrumBridgeActionSubscriber'
import { useGenericTransactionSubscriber } from './useGenericTransactionSubscriber'
import { useLimitOrderActionSubscriber } from './useLimitOrderActionSubscriber'
import { useSendActionSubscriber } from './useSendActionSubscriber'
import { useSwapActionSubscriber } from './useSwapActionSubscriber'
import { useThorchainLpActionSubscriber } from './useThorchainLpActionSubscriber'

import { useRfoxClaimActionSubscriber } from '@/pages/RFOX/hooks/useRfoxClaimActionSubscriber'
import { useRfoxRewardDistributionActionSubscriber } from '@/pages/RFOX/hooks/useRfoxRewardDistributionActionSubscriber'
import { useTcyClaimActionSubscriber } from '@/pages/TCY/hooks/useTcyClaimActionSubscriber'

export const useActionCenterSubscribers = () => {
  console.log('🔧 Action Center Subscribers - initializing all subscribers')
  
  useSwapActionSubscriber()
  console.log('🔧 Action Center Subscribers - SwapActionSubscriber called')
  
  useArbitrumBridgeActionSubscriber()
  console.log('🔧 Action Center Subscribers - ArbitrumBridgeActionSubscriber called')
  
  useLimitOrderActionSubscriber()
  useAppUpdateActionSubscriber()
  useRfoxClaimActionSubscriber()
  useRfoxRewardDistributionActionSubscriber()
  useTcyClaimActionSubscriber()
  useGenericTransactionSubscriber()
  useSendActionSubscriber()
  useThorchainLpActionSubscriber()
  
  console.log('🔧 Action Center Subscribers - all subscribers initialized')
}
