import { CAIP19 } from '@shapeshiftoss/caip'
import { assetApi } from 'state/slices/assetsSlice/assetsSlice'
import { useAppDispatch } from 'state/store'

export const useFetchAssetDescription = (assetId: CAIP19) => {
  const dispatch = useAppDispatch()
  dispatch(assetApi.endpoints.getAssetDescription.initiate(assetId))
}
