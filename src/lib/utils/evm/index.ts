import type { ChainId } from '@shapeshiftoss/caip'
import type { evm, EvmChainAdapter, EvmChainId, SignTx } from '@shapeshiftoss/chain-adapters'
import type { BuildCustomApiTxInput } from '@shapeshiftoss/chain-adapters/src/evm/types'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import { ethers } from 'ethers'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

type GetApproveContractDataArgs = {
  approvalAmountCryptoBaseUnit: string
  to: string
  spender: string
}

type BuildArgs = {
  buildCustomTxInput: evm.BuildCustomTxInput
}

type BroadcastArgs = {
  adapter: EvmChainAdapter
  txToSign: SignTx<EvmChainId>
  wallet: HDWallet
}

type BuildAndBroadcastArgs = BuildArgs & Omit<BroadcastArgs, 'txToSign' | 'wallet'>

type CreateBuildCustomTxInputArgs = {
  accountNumber: number
  adapter: EvmChainAdapter
  to: string
  data: string
  value: string
  wallet: HDWallet
}

type CreateBuildCustomApiTxInputArgs = {
  accountNumber: number
  adapter: EvmChainAdapter
  from: string
  to: string
  data: string
  value: string
  supportsEIP1559: boolean
}

type GetErc20AllowanceArgs = {
  address: string
  from: string
  spender: string
  chainId: ChainId
}

type GetFeesArgs = {
  adapter: EvmChainAdapter
  data: string
  to: string
  value: string
} & (
  | {
      from: string
      supportsEIP1559: boolean
      accountNumber?: never
      wallet?: never
    }
  | {
      from?: never
      supportsEIP1559?: never
      accountNumber: number
      wallet: HDWallet
    }
)

export type Fees = evm.Fees & {
  gasLimit: string
  networkFeeCryptoBaseUnit: string
}

export const getFees = async (args: GetFeesArgs): Promise<Fees> => {
  const { accountNumber, adapter, data, to, value, from, supportsEIP1559, wallet } = args

  const getFeeDataInput = {
    to,
    value,
    chainSpecific: {
      from: from ?? (await adapter.getAddress({ accountNumber, wallet })),
      contractData: data,
    },
  }

  const {
    average: { chainSpecific: feeData },
  } = await adapter.getFeeData(getFeeDataInput)

  const networkFeeCryptoBaseUnit = calcNetworkFeeCryptoBaseUnit({
    ...feeData,
    supportsEIP1559:
      supportsEIP1559 ?? (supportsETH(wallet) && (await wallet.ethSupportsEIP1559())),
  })

  const { gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas } = feeData

  if (supportsEIP1559 && maxFeePerGas && maxPriorityFeePerGas) {
    return { networkFeeCryptoBaseUnit, gasLimit, maxFeePerGas, maxPriorityFeePerGas }
  }

  return { networkFeeCryptoBaseUnit, gasLimit, gasPrice }
}

type CalcNetworkFeeCryptoBaseUnitArgs = evm.FeeData & {
  supportsEIP1559: boolean
}

export const calcNetworkFeeCryptoBaseUnit = (args: CalcNetworkFeeCryptoBaseUnitArgs) => {
  const {
    supportsEIP1559,
    gasLimit,
    gasPrice,
    l1GasLimit,
    l1GasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
  } = args

  // eip1559 fees
  if (supportsEIP1559 && maxFeePerGas && maxPriorityFeePerGas) {
    return bn(gasLimit).times(maxFeePerGas).toString()
  }

  // optimism l1 fee if exists or 0
  const l1Fee = bnOrZero(l1GasPrice).times(bnOrZero(l1GasLimit))

  // legacy fees
  return bn(gasLimit).times(gasPrice).plus(l1Fee).toString()
}

export const createBuildCustomTxInput = async (
  args: CreateBuildCustomTxInputArgs,
): Promise<evm.BuildCustomTxInput> => {
  const fees = await getFees(args)
  return { ...args, ...fees }
}

export const createBuildCustomApiTxInput = async (
  args: CreateBuildCustomApiTxInputArgs,
): Promise<BuildCustomApiTxInput> => {
  const { accountNumber, from, supportsEIP1559, ...rest } = args
  const fees = await getFees({ ...rest, from, supportsEIP1559 })
  return { ...args, ...fees }
}

export const buildAndBroadcast = async ({ adapter, buildCustomTxInput }: BuildAndBroadcastArgs) => {
  const { txToSign } = await adapter.buildCustomTx(buildCustomTxInput)
  return signAndBroadcast({ adapter, txToSign, wallet: buildCustomTxInput.wallet })
}

export const signAndBroadcast = async ({ adapter, txToSign, wallet }: BroadcastArgs) => {
  if (!wallet) throw new Error('Wallet is required to broadcast EVM Txs')

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

export const getApproveContractData = ({
  approvalAmountCryptoBaseUnit,
  to,
  spender,
}: GetApproveContractDataArgs): string => {
  const address = ethers.utils.getAddress(to)
  const contract = getOrCreateContractByType({ address, type: ContractType.ERC20 })
  return contract.interface.encodeFunctionData('approve', [spender, approvalAmountCryptoBaseUnit])
}

export const getErc20Allowance = async ({
  address,
  from,
  spender,
  chainId,
}: GetErc20AllowanceArgs): Promise<string> => {
  const contract = getOrCreateContractByType({ address, type: ContractType.ERC20, chainId })
  const allowance = await contract.allowance(from, spender)
  return allowance.toString()
}
