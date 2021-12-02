import { CAIP19 } from '@shapeshiftoss/caip'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ReduxState } from 'state/reducer'
import { fetchAsset, selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'

export const useFetchAsset = (caip19: CAIP19) => {
  const dispatch = useDispatch()
  const asset = useSelector((state: ReduxState) => selectAssetByCAIP19(state, caip19))

  useEffect(() => {
    if (asset) return
    dispatch(fetchAsset(caip19))
  }, [asset, caip19, dispatch])

  return asset
}
