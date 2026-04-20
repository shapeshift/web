import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { useAppSelector } from '@/state/store'

/**
 * Returns true if wallet is connected OR if Ledger read-only mode is active.
 * Use this when gating UI that should display for both connected wallets and Ledger read-only mode.
 */
export const useIsWalletConnected = (): boolean => {
  const {
    state: { isConnected: isWalletConnected },
  } = useWallet()
  const walletType = useAppSelector(selectWalletType)
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')
  const isLedgerReadOnly = isLedgerReadOnlyEnabled && walletType === KeyManager.Ledger

  return isWalletConnected || isLedgerReadOnly
}
