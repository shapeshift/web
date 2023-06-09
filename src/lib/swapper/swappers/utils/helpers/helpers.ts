import type { AssetId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  bscAssetId,
  ethAssetId,
  fromAssetId,
  gnosisAssetId,
  optimismAssetId,
  polygonAssetId,
} from '@shapeshiftoss/caip'
import type { evm, EvmChainAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { optimism } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import type Web3 from 'web3'
import type { AbiItem } from 'web3-utils'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { GetTradeQuoteInput, TradeQuote } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { erc20Abi } from 'lib/swapper/swappers/utils/abi/erc20-abi'

type GetApproveContractDataArgs = {
  approvalAmountCryptoBaseUnit: string
  to: string
  spender: string
  web3: Web3
}

type BuildAndBroadcastArgs = {
  adapter: EvmChainAdapter
  buildCustomTxArgs: evm.BuildCustomTxInput
  wallet: HDWallet
}

type CreateBuildCustomTxInputArgs = {
  accountNumber: number
  adapter: EvmChainAdapter
  to: string
  data: string
  value: string
  wallet: HDWallet
}

type GetERC20AllowanceArgs = {
  erc20AllowanceAbi: AbiItem[]
  web3: Web3
  address: string
  from: string
  spender: string
}

type GetFeesFromContractDataArgs = {
  adapter: EvmChainAdapter
  eip1559Support: boolean
  from: string
  to: string
  value: string
  data: string
}

export const getERC20Allowance = ({
  erc20AllowanceAbi,
  web3,
  address,
  from,
  spender,
}: GetERC20AllowanceArgs): Promise<number> => {
  const erc20Contract = new web3.eth.Contract(erc20AllowanceAbi, address)
  return erc20Contract.methods.allowance(from, spender).call()
}

export const getFeesFromContractData = async ({
  adapter,
  eip1559Support,
  from,
  to,
  value,
  data,
}: GetFeesFromContractDataArgs): Promise<{
  networkFeeCryptoBaseUnit: string
  feesWithGasLimit: evm.Fees & { gasLimit: string }
}> => {
  const getFeeDataInput = {
    to,
    value,
    chainSpecific: { from, contractData: data },
  }

  const { average, l1GasLimit, l1GasPrice } = await (async () => {
    if (optimism.isOptimismChainAdapter(adapter)) {
      const feeData = await adapter.getFeeData(getFeeDataInput)
      return {
        average: feeData.average,
        l1GasLimit: feeData.l1GasLimit,
        l1GasPrice: feeData.l1GasPrice,
      }
    }
    const feeData = await adapter.getFeeData(getFeeDataInput)
    return { average: feeData.average }
  })()

  const { gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas } = average.chainSpecific

  if (!gasLimit) {
    throw new SwapError('[getFeesFromContractData]', {
      cause: 'gasLimit is required',
      code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
    })
  }

  if (eip1559Support && maxFeePerGas && maxPriorityFeePerGas) {
    return {
      networkFeeCryptoBaseUnit: bn(gasLimit).times(maxFeePerGas).toString(),
      feesWithGasLimit: { gasLimit, maxFeePerGas, maxPriorityFeePerGas },
    }
  }

  if (gasPrice) {
    const networkFeeCryptoBaseUnit = (() => {
      // calculate optimism network fee
      if (l1GasLimit && l1GasPrice) {
        const l1Fee = bn(l1GasPrice).times(l1GasLimit)
        return bn(gasLimit).times(gasPrice).plus(l1Fee)
      }

      return bn(gasLimit).times(gasPrice)
    })()

    return {
      networkFeeCryptoBaseUnit: networkFeeCryptoBaseUnit.toString(),
      feesWithGasLimit: { gasLimit, gasPrice },
    }
  }

  throw new SwapError('[getFeesFromContractData]', {
    cause: 'legacy gas or eip1559 gas required',
    code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
  })
}

export const createBuildCustomTxInput = async (
  buildCustomTxArgs: CreateBuildCustomTxInputArgs,
): Promise<evm.BuildCustomTxInput> => {
  const { accountNumber, adapter, wallet } = buildCustomTxArgs
  if (!supportsETH(wallet)) {
    throw new SwapError('[createBuildCustomTxInput]', {
      cause: 'eth wallet required',
      code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
      details: { wallet: buildCustomTxArgs.wallet },
    })
  }

  const from = await adapter.getAddress({ accountNumber, wallet })
  const eip1559Support = await wallet.ethSupportsEIP1559()
  const { feesWithGasLimit } = await getFeesFromContractData({
    ...buildCustomTxArgs,
    from,
    eip1559Support,
  })
  return { ...buildCustomTxArgs, ...feesWithGasLimit }
}

export const buildAndBroadcast = async ({
  adapter,
  buildCustomTxArgs,
  wallet,
}: BuildAndBroadcastArgs) => {
  try {
    const { txToSign } = await adapter.buildCustomTx(buildCustomTxArgs)

    if (wallet.supportsOfflineSigning()) {
      const signedTx = await adapter.signTransaction({ txToSign, wallet })
      const txid = await adapter.broadcastTransaction(signedTx)
      return txid
    }

    if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
      const txid = await adapter.signAndBroadcastTransaction({ txToSign, wallet })
      return txid
    }

    throw new SwapError('[buildAndBroadcast]', {
      cause: 'no broadcast support',
      code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
    })
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[buildAndBroadcast]', {
      cause: e,
      code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
    })
  }
}

/**
 * This function keeps 17 significant digits, so even if we try to trade 1 Billion of an
 * ETH or ERC20, we still keep 7 decimal places.
 * @param amount
 */
export const normalizeAmount = (amount: string | number | BigNumber): string => {
  return bnOrZero(amount).toNumber().toLocaleString('fullwide', { useGrouping: false })
}

export const normalizeIntegerAmount = (amount: string | number | BigNumber): string => {
  return bnOrZero(amount)
    .integerValue()
    .toNumber()
    .toLocaleString('fullwide', { useGrouping: false })
}

export const getApproveContractData = ({
  approvalAmountCryptoBaseUnit,
  to,
  spender,
  web3,
}: GetApproveContractDataArgs): string => {
  const contract = new web3.eth.Contract(erc20Abi, to)
  return contract.methods.approve(spender, approvalAmountCryptoBaseUnit).encodeABI()
}

export const isNativeEvmAsset = (assetId: AssetId): boolean => {
  const { chainId } = fromAssetId(assetId)
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return assetId === ethAssetId
    case KnownChainIds.AvalancheMainnet:
      return assetId === avalancheAssetId
    case KnownChainIds.OptimismMainnet:
      return assetId === optimismAssetId
    case KnownChainIds.BnbSmartChainMainnet:
      return assetId === bscAssetId
    case KnownChainIds.PolygonMainnet:
      return assetId === polygonAssetId
    case KnownChainIds.GnosisMainnet:
      return assetId === gnosisAssetId
    default:
      return false
  }
}

export const createEmptyEvmTradeQuote = (
  input: GetTradeQuoteInput,
  minimumCryptoHuman: string,
): TradeQuote<EvmChainId, true> => {
  return {
    minimumCryptoHuman,
    steps: [
      {
        allowanceContract: '',
        buyAmountBeforeFeesCryptoBaseUnit: '0',
        sellAmountBeforeFeesCryptoBaseUnit: input.sellAmountBeforeFeesCryptoBaseUnit,
        feeData: {
          networkFeeCryptoBaseUnit: undefined,
          protocolFees: {},
        },
        rate: '0',
        sources: [],
        buyAsset: input.buyAsset,
        sellAsset: input.sellAsset,
        accountNumber: input.accountNumber,
      },
    ],
  }
}
