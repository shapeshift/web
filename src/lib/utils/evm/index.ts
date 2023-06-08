import type { evm, EvmChainAdapter, EvmChainId, SignTx } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type Web3 from 'web3'
import type { AbiItem } from 'web3-utils'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import { erc20Abi } from './abis/erc20'

type GetApproveContractDataArgs = {
  approvalAmountCryptoBaseUnit: string
  to: string
  spender: string
  web3: Web3
}

type BuildArgs = {
  buildCustomTxInput: evm.BuildCustomTxInput
}

type BroadcastArgs = {
  adapter: EvmChainAdapter
  txToSign: SignTx<EvmChainId>
  wallet: HDWallet
}

type BuildAndBroadcastArgs = BuildArgs & Omit<BroadcastArgs, 'txToSign'>

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

type GetFeesArgs = {
  adapter: EvmChainAdapter
  accountNumber: number
  to: string
  value: string
  data: string
  wallet: HDWallet
}

type Fees = evm.Fees & {
  gasLimit: string
  networkFeeCryptoBaseUnit: string
}

export const getFees = async ({
  accountNumber,
  adapter,
  to,
  value,
  data,
  wallet,
}: GetFeesArgs): Promise<Fees> => {
  if (!supportsETH(wallet)) throw new Error('eth wallet required')

  const from = await adapter.getAddress({ accountNumber, wallet })

  const getFeeDataInput = { to, value, chainSpecific: { from, contractData: data } }

  const {
    average: { chainSpecific: feeData },
  } = await adapter.getFeeData(getFeeDataInput)

  const eip1559Support = await wallet.ethSupportsEIP1559()
  const networkFeeCryptoBaseUnit = calcNetworkFeeCryptoBaseUnit({ ...feeData, eip1559Support })

  const { gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas } = feeData

  if (eip1559Support && maxFeePerGas && maxPriorityFeePerGas) {
    return { networkFeeCryptoBaseUnit, gasLimit, maxFeePerGas, maxPriorityFeePerGas }
  }

  return { networkFeeCryptoBaseUnit, gasLimit, gasPrice }
}

type CalcNetworkFeeCryptoBaseUnitArgs = evm.FeeData & {
  eip1559Support: boolean
}

export const calcNetworkFeeCryptoBaseUnit = (args: CalcNetworkFeeCryptoBaseUnitArgs) => {
  const {
    eip1559Support,
    gasLimit,
    gasPrice,
    l1GasLimit,
    l1GasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
  } = args

  // eip1559 fees
  if (eip1559Support && maxFeePerGas && maxPriorityFeePerGas) {
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

export const buildAndBroadcast = async ({
  adapter,
  buildCustomTxInput,
  wallet,
}: BuildAndBroadcastArgs) => {
  const { txToSign } = await adapter.buildCustomTx(buildCustomTxInput)
  return broadcast({ adapter, txToSign, wallet })
}

export const broadcast = async ({ adapter, txToSign, wallet }: BroadcastArgs) => {
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
  web3,
}: GetApproveContractDataArgs): string => {
  const contract = new web3.eth.Contract(erc20Abi, to)
  return contract.methods.approve(spender, approvalAmountCryptoBaseUnit).encodeABI()
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
