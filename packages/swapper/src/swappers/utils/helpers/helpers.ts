import { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import Web3 from 'web3'
import { AbiItem, numberToHex } from 'web3-utils'

import {
  EvmSupportedChainAdapter,
  EvmSupportedChainIds,
  SwapError,
  SwapErrorTypes,
  TradeQuote,
} from '../../../api'
import { MAX_ALLOWANCE } from '../../cow/utils/constants'
import { erc20Abi as erc20AbiImported } from '../abi/erc20-abi'
import { BN, bn, bnOrZero } from '../bignumber'

export type IsApprovalRequiredArgs = {
  adapter: EvmSupportedChainAdapter
  receiveAddress: string
  allowanceContract: string
  sellAsset: Asset
  sellAmount: string
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

type GrantAllowanceArgs<T extends EvmSupportedChainIds> = {
  quote: TradeQuote<T>
  wallet: HDWallet
  adapter: EvmSupportedChainAdapter
  erc20Abi: AbiItem[]
  web3: Web3
}

export const getERC20Allowance = async ({
  erc20AllowanceAbi,
  web3,
  sellAssetErc20Address,
  ownerAddress,
  spenderAddress,
}: GetERC20AllowanceArgs) => {
  const erc20Contract = new web3.eth.Contract(erc20AllowanceAbi, sellAssetErc20Address)
  return erc20Contract.methods.allowance(ownerAddress, spenderAddress).call()
}

export const isApprovalRequired = async ({
  adapter,
  receiveAddress,
  allowanceContract,
  sellAsset,
  sellAmount,
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
        code: SwapErrorTypes.RESPONSE_ERROR,
      })
    }

    if (bn(allowanceOnChain).isZero()) return true

    const allowanceRequired = bnOrZero(sellAmount).minus(allowanceOnChain)
    return allowanceRequired.gt(0)
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[isApprovalRequired]', {
      cause: e,
      code: SwapErrorTypes.ALLOWANCE_REQUIRED_FAILED,
    })
  }
}

export const grantAllowance = async <T extends EvmSupportedChainIds>({
  quote,
  wallet,
  adapter,
  erc20Abi,
  web3,
}: GrantAllowanceArgs<T>): Promise<string> => {
  try {
    const { assetReference: sellAssetErc20Address } = fromAssetId(quote.sellAsset.assetId)

    const erc20Contract = new web3.eth.Contract(erc20Abi, sellAssetErc20Address)
    const approveTx = erc20Contract.methods
      .approve(quote.allowanceContract, quote.sellAmountCryptoPrecision)
      .encodeABI()

    const { bip44Params } = quote

    const { txToSign } = await adapter.buildSendTransaction({
      wallet,
      to: sellAssetErc20Address,
      bip44Params,
      value: '0',
      chainSpecific: {
        erc20ContractAddress: sellAssetErc20Address,
        gasPrice: numberToHex(quote.feeData?.chainSpecific?.gasPrice || 0),
        gasLimit: numberToHex(quote.feeData?.chainSpecific?.estimatedGas || 0),
      },
    })

    const grantAllowanceTxToSign = {
      ...txToSign,
      data: approveTx,
    }
    if (wallet.supportsOfflineSigning()) {
      const signedTx = await adapter.signTransaction({ txToSign: grantAllowanceTxToSign, wallet })

      const broadcastedTxId = await adapter.broadcastTransaction(signedTx)

      return broadcastedTxId
    } else if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
      const broadcastedTxId = await adapter.signAndBroadcastTransaction?.({
        txToSign: grantAllowanceTxToSign,
        wallet,
      })

      return broadcastedTxId
    } else {
      throw new SwapError('[grantAllowance] - invalid HDWallet config', {
        code: SwapErrorTypes.SIGN_AND_BROADCAST_FAILED,
      })
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[grantAllowance]', {
      cause: e,
      code: SwapErrorTypes.GRANT_ALLOWANCE_FAILED,
    })
  }
}

/**
 * This function keeps 17 significant digits, so even if we try to trade 1 Billion of an
 * ETH or ERC20, we still keep 7 decimal places.
 * @param amount
 */
export const normalizeAmount = (amount: string | number | BN): string => {
  return bnOrZero(amount).toNumber().toLocaleString('fullwide', { useGrouping: false })
}

export const normalizeIntegerAmount = (amount: string | number | BN): string => {
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
  const contract = new web3.eth.Contract(erc20AbiImported, contractAddress)
  return contract.methods.approve(spenderAddress, MAX_ALLOWANCE).encodeABI()
}
