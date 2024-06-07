import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { bnOrZero, CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { SwapErrorRight, TradeQuote } from '@shapeshiftoss/swapper'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads'
import type { UseQueryResult } from '@tanstack/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { reactQueries } from 'react-queries'
import { useWallet } from 'hooks/useWallet/useWallet'
import { fromBaseUnit } from 'lib/math'
import { arbitrumBridgeApi } from 'lib/swapper/swappers/ArbitrumBridgeSwapper/endpoints'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from 'lib/utils/evm'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import type { RfoxBridgeQuote } from '../types'

type UseRfoxBridgeProps = { confirmedQuote: RfoxBridgeQuote }
type UseRfoxBridge = (props: UseRfoxBridgeProps) => {
  sellAsset: Asset | undefined
  buyAsset: Asset | undefined
  feeAsset: Asset | undefined
  feeAssetMarketData: MarketData
  sellAssetAccountNumber: number | undefined
  tradeQuoteQuery: UseQueryResult<Result<TradeQuote, SwapErrorRight>, Error>
  allowanceContract: string | undefined
  bridgeAmountCryptoPrecision: string
  bridgeAmountUserCurrency: string
  networkFeeUserCurrency: string | null
  handleBridge: () => Promise<string | undefined>
  serializedL1TxIndex: string | undefined
  serializedL2TxIndex: string | undefined
}

export const useRfoxBridge: UseRfoxBridge = ({ confirmedQuote }) => {
  const [l1TxHash, setL1TxHash] = useState<string>()
  const [l2TxHash, setL2TxHash] = useState<string>()

  const serializedL1TxIndex = useMemo(() => {
    if (!l1TxHash) return undefined

    return serializeTxIndex(
      confirmedQuote.sellAssetAccountId,
      l1TxHash,
      fromAccountId(confirmedQuote.sellAssetAccountId).account,
    )
  }, [l1TxHash, confirmedQuote.sellAssetAccountId])

  const serializedL2TxIndex = useMemo(() => {
    if (!l2TxHash) return undefined

    return serializeTxIndex(
      confirmedQuote.buyAssetAccountId,
      l2TxHash,
      fromAccountId(confirmedQuote.buyAssetAccountId).account,
    )
  }, [confirmedQuote.buyAssetAccountId, l2TxHash])

  const wallet = useWallet().state.wallet
  const sellAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.sellAssetId))
  const buyAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.buyAssetId))
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(confirmedQuote.sellAssetId).chainId),
  )

  const sellAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, confirmedQuote.sellAssetId),
  )
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const bridgeAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision ?? 0),
    [confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const bridgeAmountUserCurrency = useMemo(
    () =>
      bnOrZero(bridgeAmountCryptoPrecision).times(sellAssetMarketDataUserCurrency.price).toFixed(),
    [bridgeAmountCryptoPrecision, sellAssetMarketDataUserCurrency.price],
  )

  const sellAssetAccountNumberFilter = useMemo(
    () => ({ assetId: confirmedQuote.sellAssetId, accountId: confirmedQuote.sellAssetAccountId }),
    [confirmedQuote.sellAssetAccountId, confirmedQuote.sellAssetId],
  )
  const sellAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, sellAssetAccountNumberFilter),
  )

  const tradeQuoteQuery = useQuery({
    ...reactQueries.swapper.arbitrumBridgeTradeQuote({
      sellAsset: sellAsset!,
      buyAsset: buyAsset!,
      chainId: sellAsset!.chainId as EvmChainId,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: confirmedQuote.bridgeAmountCryptoBaseUnit,
      affiliateBps: '0',
      potentialAffiliateBps: '0',
      allowMultiHop: true,
      receiveAddress: fromAccountId(confirmedQuote.buyAssetAccountId).account,
      sendAddress: fromAccountId(confirmedQuote.sellAssetAccountId).account,
      accountNumber: sellAssetAccountNumber!,
      wallet: wallet!,
    }),
    enabled: Boolean(sellAsset && buyAsset && sellAssetAccountNumber !== undefined && wallet),
  })

  const allowanceContract = useMemo(() => {
    if (!tradeQuoteQuery.data || tradeQuoteQuery.data.isErr()) return

    const tradeQuote = tradeQuoteQuery.data.unwrap()

    return tradeQuote.steps[0].allowanceContract
  }, [tradeQuoteQuery.data])

  const networkFeeCryptoPrecision = useMemo(() => {
    if (!tradeQuoteQuery.data || tradeQuoteQuery.data.isErr()) return null
    return fromBaseUnit(
      bnOrZero(tradeQuoteQuery.data.unwrap().steps[0].feeData.networkFeeCryptoBaseUnit),
      sellAsset?.precision ?? 0,
    )
  }, [sellAsset?.precision, tradeQuoteQuery.data])

  const networkFeeUserCurrency = useMemo(() => {
    if (!networkFeeCryptoPrecision) return null
    return bnOrZero(networkFeeCryptoPrecision).times(feeAssetMarketData.price).toFixed()
  }, [feeAssetMarketData.price, networkFeeCryptoPrecision])

  const { mutateAsync: handleBridge } = useMutation({
    mutationFn: async () => {
      if (
        !(
          tradeQuoteQuery.data &&
          tradeQuoteQuery.data.isOk() &&
          wallet &&
          sellAsset &&
          sellAssetAccountNumber !== undefined
        )
      )
        return
      const tradeQuote = tradeQuoteQuery.data.unwrap()

      const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

      const unsignedTx = await arbitrumBridgeApi.getUnsignedEvmTransaction!({
        tradeQuote,
        chainId: sellAsset.chainId,
        from: fromAccountId(confirmedQuote.sellAssetAccountId).account,
        stepIndex: 0,
        supportsEIP1559,
        slippageTolerancePercentageDecimal: '0',
      })

      const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber: sellAssetAccountNumber,
        adapter,
        data: unsignedTx.data,
        value: unsignedTx.value,
        to: unsignedTx.to,
        wallet,
      })

      const txId = await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
      })

      return txId
    },
    onSuccess: (txHash: string | undefined) => {
      if (!txHash) return
      setL1TxHash(txHash)
    },
  })

  const { data: tradeStatus } = useQuery({
    ...reactQueries.swapper.arbitrumBridgeTradeStatus(l1TxHash ?? '', sellAsset?.chainId ?? ''),
    enabled: Boolean(l1TxHash && sellAsset),
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (!tradeStatus) return
    if (tradeStatus.message === 'L2 Tx Pending' || tradeStatus.status === TxStatus.Confirmed) {
      setL2TxHash(tradeStatus.buyTxHash)
    }
  }, [tradeStatus])

  return {
    sellAsset,
    buyAsset,
    feeAsset,
    feeAssetMarketData,
    sellAssetAccountNumber,
    tradeQuoteQuery,
    allowanceContract,
    bridgeAmountCryptoPrecision,
    bridgeAmountUserCurrency,
    networkFeeUserCurrency,
    handleBridge,
    serializedL1TxIndex,
    serializedL2TxIndex,
  }
}
