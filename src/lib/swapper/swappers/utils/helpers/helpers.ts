import type { AssetId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  bscAssetId,
  ethAssetId,
  fromAssetId,
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
import type { Asset } from 'lib/asset-service'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { GetTradeQuoteInput, TradeQuote } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { erc20Abi } from 'lib/swapper/swappers/utils/abi/erc20-abi'

export type IsApprovalRequiredArgs = {
  adapter: EvmChainAdapter
  receiveAddress: string
  allowanceContract: string
  sellAsset: Asset
  sellAmountExcludeFeeCryptoBaseUnit: string
  web3: Web3
  erc20AllowanceAbi: AbiItem[]
}

export type GetERC20AllowanceArgs = {
  erc20AllowanceAbi: AbiItem[]
  web3: Web3
  sellAssetErc20Address: string
  ownerAddress: string
  spenderAddress: string
}

type GetFeesFromContractDataArgs = {
  accountNumber: number
  adapter: EvmChainAdapter
  erc20ContractAddress: string
  erc20ContractData: string
  wallet: HDWallet
}

export const getERC20Allowance = ({
  erc20AllowanceAbi,
  web3,
  sellAssetErc20Address,
  ownerAddress,
  spenderAddress,
}: GetERC20AllowanceArgs): Promise<number> => {
  const erc20Contract = new web3.eth.Contract(erc20AllowanceAbi, sellAssetErc20Address)
  return erc20Contract.methods.allowance(ownerAddress, spenderAddress).call()
}

export const getFeesFromContractData = async ({
  accountNumber,
  adapter,
  erc20ContractAddress,
  erc20ContractData,
  wallet,
}: GetFeesFromContractDataArgs): Promise<evm.Fees & { gasLimit: string }> => {
  if (!supportsETH(wallet)) {
    throw new SwapError('[getFeesFromContractData]', {
      cause: 'eth wallet required',
      code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
      details: { wallet },
    })
  }

  const ownerAddress = await adapter.getAddress({ accountNumber, wallet })

  const { gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas } = await (async () => {
    const getFeeDataInput = {
      to: erc20ContractAddress,
      value: '0',
      chainSpecific: { from: ownerAddress, contractData: erc20ContractData },
    }

    // account for l1 transaction fees for optimism
    if (optimism.isOptimismChainAdapter(adapter)) {
      const { average, l1GasPrice } = await adapter.getFeeData(getFeeDataInput)
      return Object.assign(average.chainSpecific, { gasPrice: l1GasPrice })
    }

    const feeDataEstimate = await adapter.getFeeData(getFeeDataInput)
    return feeDataEstimate.average.chainSpecific
  })()

  if (!gasLimit) {
    throw new SwapError('[getFeesFromContractData]', {
      cause: 'gasLimit is required',
      code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
    })
  }

  const eip1559Support = await wallet.ethSupportsEIP1559()

  if (eip1559Support && maxFeePerGas && maxPriorityFeePerGas)
    return { gasLimit, maxFeePerGas, maxPriorityFeePerGas }
  if (gasPrice) return { gasLimit, gasPrice }

  throw new SwapError('[getFeesFromContractData]', {
    cause: 'legacy gas or eip1559 gas required',
    code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
  })
}

export const createBuildCustomTxInput = async ({
  accountNumber,
  adapter,
  erc20ContractAddress,
  erc20ContractData,
  sendAmountCryptoBaseUnit,
  wallet,
}: {
  accountNumber: number
  adapter: EvmChainAdapter
  erc20ContractAddress: string
  erc20ContractData: string
  sendAmountCryptoBaseUnit: string
  wallet: HDWallet
}): Promise<evm.BuildCustomTxInput> => {
  const gasFees = await getFeesFromContractData({
    accountNumber,
    adapter,
    erc20ContractAddress,
    erc20ContractData,
    wallet,
  })

  return {
    accountNumber,
    data: erc20ContractData,
    to: erc20ContractAddress,
    value: sendAmountCryptoBaseUnit,
    wallet,
    ...gasFees,
  }
}

export const buildAndBroadcast = async ({
  adapter,
  buildCustomTxArgs,
  wallet,
}: {
  adapter: EvmChainAdapter
  buildCustomTxArgs: evm.BuildCustomTxInput
  wallet: HDWallet
}) => {
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
  erc20ContractAddress,
  spenderAddress,
  web3,
}: {
  approvalAmountCryptoBaseUnit: string
  erc20ContractAddress: string
  spenderAddress: string
  web3: Web3
}): string => {
  const contract = new web3.eth.Contract(erc20Abi, erc20ContractAddress)
  return contract.methods.approve(spenderAddress, approvalAmountCryptoBaseUnit).encodeABI()
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
    default:
      return false
  }
}

export const createEmptyEvmTradeQuote = (
  input: GetTradeQuoteInput,
  minimumCryptoHuman: string,
  maximumCryptoHuman: string,
): TradeQuote<EvmChainId, true> => {
  return {
    buyAmountBeforeFeesCryptoBaseUnit: '0',
    sellAmountBeforeFeesCryptoBaseUnit: input.sellAmountBeforeFeesCryptoBaseUnit,
    feeData: {
      networkFeeCryptoBaseUnit: undefined,
      buyAssetTradeFeeUsd: '0',
    },
    rate: '0',
    sources: [],
    buyAsset: input.buyAsset,
    sellAsset: input.sellAsset,
    accountNumber: input.accountNumber,
    allowanceContract: '',
    minimumCryptoHuman,
    maximumCryptoHuman,
  }
}
