import { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { TradeState } from 'components/Trade/types'
import { selectFirstAccountSpecifierByChainId } from 'state/slices/accountSpecifiersSlice/selectors'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectHighestFiatBalanceAccountByAssetId } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

/*
The Accounts Service is responsible for reacting to changes to trade assets, and updating trade accounts accordingly.
The only mutation is on TradeState's sellAssetAccount property.
*/
export const useAccountsService = () => {
  // Form hooks
  const { control, setValue } = useFormContext<TradeState<KnownChainIds>>()
  const selectedAssetAccount = useWatch({ control, name: 'selectedAssetAccount' })
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })

  // Constants
  const sellAssetId = sellTradeAsset?.asset?.assetId

  // Selectors
  const sellAsset = useAppSelector(state => selectAssetById(state, sellAssetId ?? ''))
  const highestFiatBalanceAccount = useAppSelector(state =>
    selectHighestFiatBalanceAccountByAssetId(state, {
      assetId: sellAssetId ?? '',
    }),
  )
  const sellAssetAccountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, sellAsset?.chainId ?? ''),
  )

  useEffect(
    () =>
      setValue(
        'sellAssetAccount',
        selectedAssetAccount ?? highestFiatBalanceAccount ?? sellAssetAccountSpecifier,
      ),
    [
      selectedAssetAccount,
      highestFiatBalanceAccount,
      setValue,
      sellTradeAsset,
      buyTradeAsset,
      sellAssetAccountSpecifier,
    ],
  )
}
