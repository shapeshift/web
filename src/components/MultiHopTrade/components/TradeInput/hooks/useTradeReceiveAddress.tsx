import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import {
  selectInputBuyAsset,
  selectLastHopBuyAccountId,
  selectManualReceiveAddress,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useTradeReceiveAddress = () => {
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const buyAccountId = useAppSelector(selectLastHopBuyAccountId)
  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  const { walletReceiveAddress, isLoading } = useReceiveAddress({
    buyAccountId,
    buyAsset,
  })

  return { manualReceiveAddress, walletReceiveAddress, isLoading }
}
