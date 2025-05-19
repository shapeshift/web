import { useThorchainMimir } from '@/lib/utils/thorchain/hooks/useThorchainMimir'

export const useIsLendingActive = () => {
  const { data: mimir, isLoading: isMimirLoading } = useThorchainMimir({})

  return {
    isLendingActive: mimir?.PAUSELOANS === 0,
    isMimirLoading,
  }
}
