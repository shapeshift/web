import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import {
  selectFirstHopSellAccountId,
  selectInputBuyAsset,
  selectLastHopBuyAccountId,
  selectManualReceiveAddress,
} from 'state/slices/tradeInputSlice/selectors'
import { useAppSelector } from 'state/store'

export const useTradeReceiveAddress = () => {
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const buyAccountId = useAppSelector(selectLastHopBuyAccountId)
  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  const { walletReceiveAddress, isLoading } = useReceiveAddress({
    sellAccountId,
    buyAccountId,
    buyAsset,
  })

  return { manualReceiveAddress, walletReceiveAddress, isLoading }
}
