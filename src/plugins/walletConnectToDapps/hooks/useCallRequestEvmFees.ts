import { fromAccountId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { useWalletConnectState } from 'plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type { WalletConnectState } from 'plugins/walletConnectToDapps/types'
import { getFeesForTx } from 'plugins/walletConnectToDapps/utils'
import { useEffect, useMemo, useState } from 'react'
import type { FeePrice } from 'components/Modals/Send/views/Confirm'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { assertGetChainAdapter } from 'lib/utils'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import { selectFungibleAssets, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export function useCallRequestEvmFees(state: WalletConnectState) {
  const [fees, setFees] = useState<FeePrice | undefined>()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { chainId, accountId, transaction } = useWalletConnectState(state)

  const assets = useAppSelector(selectFungibleAssets)

  const feeAsset = useMemo(() => {
    const chainAdapter = chainId ? assertGetChainAdapter(chainId) : undefined
    const feeAssetId = chainAdapter?.getFeeAssetId()
    if (!feeAssetId) return null
    // TODO(Q): this shouldn't be feeAsset, get the real asset from request
    const feeAsset = assets[feeAssetId]
    if (!feeAsset) return null
    return feeAsset
  }, [assets, chainId])
  const feeAssetPrice =
    useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''))
      ?.price ?? '0'

  useEffect(() => {
    if (!transaction || !accountId || !chainId) return
    const { account: address } = fromAccountId(accountId)
    if (!(address && chainId && feeAsset && feeAssetPrice)) return
    ;(async () => {
      const adapter = assertGetEvmChainAdapter(chainId)
      setIsLoading(true)

      const estimatedFees = await getFeesForTx(transaction, adapter, accountId)

      const initialFees: FeePrice = {
        slow: {
          fiatFee: '',
          txFee: '',
          gasPriceGwei: '',
        },
        average: {
          fiatFee: '',
          txFee: '',
          gasPriceGwei: '',
        },
        fast: {
          fiatFee: '',
          txFee: '',
          gasPriceGwei: '',
        },
      }
      const result = (Object.keys(estimatedFees) as FeeDataKey[]).reduce<FeePrice>(
        (acc: FeePrice, key: FeeDataKey) => {
          if (!Object.values(FeeDataKey).includes(key)) return acc
          const txFee = bnOrZero(estimatedFees[key].txFee)
            .dividedBy(bn(10).pow(feeAsset?.precision))
            .toPrecision()
          const fiatFee = bnOrZero(txFee).times(feeAssetPrice).toPrecision()
          const gasPriceGwei = bnOrZero(estimatedFees[key].chainSpecific.gasPrice)
            .div(1e9)
            .toString()
          acc[key] = { txFee, fiatFee, gasPriceGwei }
          return acc
        },
        initialFees,
      )
      setFees(result)
      setIsLoading(false)
    })()
  }, [accountId, chainId, feeAsset, feeAssetPrice, transaction])

  return { isLoading, fees, feeAsset, feeAssetPrice }
}
