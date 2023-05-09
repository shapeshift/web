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
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import type Web3 from 'web3'
import type { AbiItem } from 'web3-utils'
import type { Asset } from 'lib/asset-service'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { EvmFeeData, GetTradeQuoteInput, TradeQuote } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { erc20Abi } from 'lib/swapper/swappers/utils/abi/erc20-abi'

import { APPROVAL_GAS_LIMIT, MAX_ALLOWANCE } from '../constants'

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

export type GetApproveContractDataArgs = {
  web3: Web3
  spenderAddress: string
  contractAddress: string
}

type GetFeesFromFeeDataArgs = {
  wallet: HDWallet
  feeData: EvmFeeData
}

type BuildAndBroadcastArgs = GetFeesFromFeeDataArgs & {
  accountNumber: number
  adapter: EvmChainAdapter
  data: string
  to: string
  value: string
}

type GrantAllowanceArgs = Omit<BuildAndBroadcastArgs, 'data' | 'value'> & {
  approvalAmount: string
  spender: string
  web3: Web3
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

export const isApprovalRequired = async ({
  adapter,
  receiveAddress,
  allowanceContract,
  sellAsset,
  sellAmountExcludeFeeCryptoBaseUnit,
  web3,
  erc20AllowanceAbi,
}: IsApprovalRequiredArgs): Promise<boolean> => {
  try {
    if (sellAsset.assetId === adapter.getFeeAssetId()) {
      return false
    }

    const ownerAddress = receiveAddress
    const spenderAddress = allowanceContract

    const { assetReference: sellAssetErc20Address } = fromAssetId(sellAsset.assetId)

    const allowanceOnChain = await getERC20Allowance({
      web3,
      erc20AllowanceAbi,
      ownerAddress,
      spenderAddress,
      sellAssetErc20Address,
    })
    if (!allowanceOnChain) {
      throw new SwapError(`[isApprovalRequired] - No allowance data`, {
        details: { allowanceContract, receiveAddress },
        code: SwapErrorType.RESPONSE_ERROR,
      })
    }

    if (bn(allowanceOnChain).isZero()) return true

    const allowanceRequired = bnOrZero(sellAmountExcludeFeeCryptoBaseUnit).minus(allowanceOnChain)
    return allowanceRequired.gt(0)
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[isApprovalRequired]', {
      cause: e,
      code: SwapErrorType.ALLOWANCE_REQUIRED_FAILED,
    })
  }
}

export const getFeesFromFeeData = async ({
  wallet,
  feeData,
}: GetFeesFromFeeDataArgs): Promise<evm.Fees & { gasLimit: string }> => {
  if (!supportsETH(wallet)) {
    throw new SwapError('[getFeesFromFeeData]', {
      cause: 'eth wallet required',
      code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
      details: { wallet },
    })
  }

  const gasLimit = feeData.estimatedGasCryptoBaseUnit
  const gasPrice = feeData.gasPriceCryptoBaseUnit
  const maxFeePerGas = feeData.maxFeePerGas
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas

  if (!gasLimit) {
    throw new SwapError('[getFeesFromFeeData]', {
      cause: 'gasLimit is required',
      code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
    })
  }

  const eip1559Support = await wallet.ethSupportsEIP1559()

  if (eip1559Support && maxFeePerGas && maxPriorityFeePerGas)
    return { gasLimit, maxFeePerGas, maxPriorityFeePerGas }
  if (gasPrice) return { gasLimit, gasPrice }

  throw new SwapError('[getFeesFromFeeData]', {
    cause: 'legacy gas or eip1559 gas required',
    code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
  })
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
  try {
    const { txToSign } = await adapter.buildCustomTx({
      wallet,
      to,
      accountNumber,
      value,
      data,
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

export const grantAllowance = async ({
  feeData,
  accountNumber,
  approvalAmount,
  spender,
  to,
  wallet,
  adapter,
  web3,
}: GrantAllowanceArgs): Promise<string> => {
  const erc20Contract = new web3.eth.Contract(erc20Abi, to)
  const inputData = erc20Contract.methods.approve(spender, approvalAmount).encodeABI()

  try {
    const txid = await buildAndBroadcast({
      accountNumber,
      adapter,
      feeData: { ...feeData, estimatedGasCryptoBaseUnit: APPROVAL_GAS_LIMIT },
      to,
      value: '0',
      wallet,
      data: inputData,
    })
    return txid
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[grantAllowance]', {
      cause: e,
      code: SwapErrorType.GRANT_ALLOWANCE_FAILED,
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
  web3,
  spenderAddress,
  contractAddress,
}: GetApproveContractDataArgs): string => {
  const contract = new web3.eth.Contract(erc20Abi, contractAddress)
  return contract.methods.approve(spenderAddress, MAX_ALLOWANCE).encodeABI()
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
      chainSpecific: {},
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
