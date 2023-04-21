import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId, osmosisChainId } from '@shapeshiftoss/caip'
import type { evm, EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectPortfolioCryptoPrecisionBalanceByFilter } from 'state/slices/selectors'
import { store } from 'state/store'

export const chainIdToLabel = (chainId: ChainId): string => {
  switch (chainId) {
    case cosmosChainId:
      return 'Cosmos'
    case osmosisChainId:
      return 'Osmosis'
    default: {
      return ''
    }
  }
}

export const canCoverTxFees = ({
  feeAsset,
  estimatedGasCryptoPrecision,
  accountId,
}: {
  feeAsset: Asset
  estimatedGasCryptoPrecision: string
  accountId: AccountId
}) => {
  const state = store.getState()
  const feeAssetBalanceCryptoHuman = selectPortfolioCryptoPrecisionBalanceByFilter(state, {
    accountId,
    assetId: feeAsset.assetId,
  })

  return bnOrZero(feeAssetBalanceCryptoHuman).minus(bnOrZero(estimatedGasCryptoPrecision)).gte(0)
}

type GetFeesFromFeeDataArgs = {
  wallet: HDWallet
  feeData: evm.FeeData
}

export const getFeesFromFeeData = async ({
  wallet,
  feeData: { gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas },
}: GetFeesFromFeeDataArgs): Promise<evm.Fees & { gasLimit: string }> => {
  if (!supportsETH(wallet)) throw new Error('wallet has no evm support')
  if (!gasLimit) throw new Error('gasLimit is required')

  const eip1559Support = await wallet.ethSupportsEIP1559()

  // use eip1559 fees if able
  if (eip1559Support && maxFeePerGas && maxPriorityFeePerGas) {
    return { gasLimit, maxFeePerGas, maxPriorityFeePerGas }
  }

  // fallback to legacy fees if unable to use eip1559
  if (gasPrice) return { gasLimit, gasPrice }

  throw new Error('legacy gas or eip1559 gas required')
}

type BuildAndBroadcastArgs = GetFeesFromFeeDataArgs & {
  accountNumber: number
  adapter: EvmChainAdapter
  data?: string
  to: string
  value: string
}

export const buildAndBroadcast = async ({
  accountNumber,
  adapter,
  data,
  feeData,
  to,
  value,
  wallet,
}: BuildAndBroadcastArgs) => {
  const { txToSign } = await adapter.buildCustomTx({
    wallet,
    to,
    accountNumber,
    value,
    data: data ?? '0x',
    ...(await getFeesFromFeeData({ wallet, feeData })),
  })

  if (wallet.supportsOfflineSigning()) {
    const signedTx = await adapter.signTransaction({ txToSign, wallet })
    const txid = await adapter.broadcastTransaction(signedTx)
    return txid
  }

  if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
    const txid = await adapter.signAndBroadcastTransaction({ txToSign, wallet })
    return txid
  }

  throw new Error('buildAndBroadcast: no broadcast support')
}
