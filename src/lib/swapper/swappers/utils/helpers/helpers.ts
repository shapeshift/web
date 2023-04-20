import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  bscAssetId,
  ethAssetId,
  fromAssetId,
  optimismAssetId,
} from '@shapeshiftoss/caip'
import type { evm, EvmChainAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import type Web3 from 'web3'
import type { AbiItem } from 'web3-utils'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { QuoteFeeData } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { erc20Abi } from 'lib/swapper/swappers/utils/abi/erc20-abi'

import { APPROVAL_GAS_LIMIT } from '../constants'

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

type GrantAllowanceArgs<T extends EvmChainId> = {
  accountNumber: number
  approvalAmount: string
  spender: string
  erc20ContractAddress: string
  feeData: QuoteFeeData<T>
  wallet: HDWallet
  adapter: EvmChainAdapter
  web3: Web3
}

type GetFeesArgs<T extends EvmChainId> = {
  wallet: HDWallet
  feeData: QuoteFeeData<T>
}

export const getERC20Allowance = ({
  erc20AllowanceAbi,
  web3,
  sellAssetErc20Address,
  ownerAddress,
  spenderAddress,
}: GetERC20AllowanceArgs): Promise<any> => {
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

export const getFees = async <T extends EvmChainId>({
  wallet,
  feeData,
}: GetFeesArgs<T>): Promise<evm.Fees & { gasLimit: string }> => {
  if (!supportsETH(wallet)) {
    throw new SwapError('[getFees]', {
      cause: 'eth wallet required',
      code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
      details: { wallet },
    })
  }

  const gasLimit = feeData.chainSpecific.estimatedGasCryptoBaseUnit
  const gasPrice = feeData.chainSpecific.gasPriceCryptoBaseUnit
  const maxFeePerGas = feeData.chainSpecific.maxFeePerGas
  const maxPriorityFeePerGas = feeData.chainSpecific.maxPriorityFeePerGas

  if (!gasLimit) {
    throw new SwapError('[getFees]', {
      cause: 'gasLimit is required',
      code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
    })
  }

  const eip1559Support = await wallet.ethSupportsEIP1559()

  if (eip1559Support && maxFeePerGas && maxPriorityFeePerGas)
    return { gasLimit, maxFeePerGas, maxPriorityFeePerGas }
  if (gasPrice) return { gasLimit, gasPrice }

  throw new SwapError('[getFees]', {
    cause: 'legacy gas or eip1559 gas required',
    code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
  })
}

export const buildAndBroadcast = async <T extends EvmChainId>({
  accountNumber,
  adapter,
  data,
  feeData,
  to,
  value,
  wallet,
}: {
  accountNumber: number
  adapter: EvmChainAdapter
  data?: string
  feeData: QuoteFeeData<T>
  to: string
  value: string
  wallet: HDWallet
}) => {
  try {
    const { txToSign } = await adapter.buildCustomTx({
      wallet,
      to,
      accountNumber,
      value,
      data: data ?? '0x',
      ...(await getFees({ wallet, feeData })),
    })

    if (wallet.supportsOfflineSigning()) {
      const signedTx = await adapter.signTransaction({ txToSign, wallet })
      const txid = await adapter.broadcastTransaction(signedTx)
      return txid
    } else if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
      const txid = await adapter.signAndBroadcastTransaction({ txToSign, wallet })
      return txid
    } else {
      throw new SwapError('[buildAndBroadcast]', {
        cause: 'no broadcast support',
        code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
      })
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[buildAndBroadcast]', {
      cause: e,
      code: SwapErrorType.GRANT_ALLOWANCE_FAILED,
    })
  }
}

export const grantAllowance = async <T extends EvmChainId>({
  feeData,
  accountNumber,
  approvalAmount,
  spender,
  erc20ContractAddress,
  wallet,
  adapter,
  web3,
}: GrantAllowanceArgs<T>): Promise<string> => {
  const erc20Contract = new web3.eth.Contract(erc20Abi, erc20ContractAddress)
  const inputData = erc20Contract.methods.approve(spender, approvalAmount).encodeABI()

  // hardcoded approval gas limit for now
  feeData.chainSpecific.estimatedGasCryptoBaseUnit = APPROVAL_GAS_LIMIT

  try {
    const txid = await buildAndBroadcast({
      accountNumber,
      adapter,
      feeData,
      to: erc20ContractAddress,
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
    default:
      return false
  }
}
