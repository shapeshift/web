import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectInputBuyAsset,
  selectLastHopBuyAccountId,
  selectManualReceiveAddress,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useTradeReceiveAddress = () => {
  const wallet = useWallet().state.wallet
  const fetchUnchainedAddress = Boolean(wallet && isLedger(wallet))
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const buyAccountId = useAppSelector(selectLastHopBuyAccountId)
  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  const { walletReceiveAddress } = useReceiveAddress({
    fetchUnchainedAddress,
    buyAccountId,
    buyAsset,
  })

  return { manualReceiveAddress, walletReceiveAddress }
}
