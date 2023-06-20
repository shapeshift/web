import type { ChainId } from '@shapeshiftoss/caip'
import type {
  ChainSpecificBuildTxData,
  evm,
  EvmChainAdapter,
  EvmChainId,
  SignTx,
} from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
// import { supportsETH } from '@shapeshiftoss/hdwallet-core'
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

type BuildAndBroadcastArgs = BuildArgs & Omit<BroadcastArgs, 'txToSign'>

type CreateBuildCustomTxInputArgs = {
  supportsEIP1559: boolean | undefined
  adapter: EvmChainAdapter
  to: string
  data: string
  value: string
  from: string
} & {
  accountNumber: number
  wallet: HDWallet | undefined
} & ChainSpecificBuildTxData<KnownChainIds>

type GetErc20AllowanceArgs = {
  address: string
  from: string
  spender: string
  chainId: ChainId
}

type GetFeesArgs = {
  adapter: EvmChainAdapter
  supportsEIP1559: boolean | undefined
  to: string
  value: string
  data: string
  from: string
}

type Fees = evm.Fees & {
  gasLimit: string
  networkFeeCryptoBaseUnit: string
}

export const getFees = async ({
  adapter,
  to,
  value,
  data,
  from,
  supportsEIP1559,
}: GetFeesArgs): Promise<Fees> => {
  // TODO(gomes): lift me up as an assertion
  // if (!supportsETH(wallet)) throw new Error('eth wallet required')

  const getFeeDataInput = { to, value, chainSpecific: { from, contractData: data } }

  const {
    average: { chainSpecific: feeData },
  } = await adapter.getFeeData(getFeeDataInput)

  // TODO(gomes): lift me up as a flag
  // const eip1559Support = await wallet.ethSupportsEIP1559()
  const networkFeeCryptoBaseUnit = calcNetworkFeeCryptoBaseUnit({
    ...feeData,
    supportsEIP1559: Boolean(supportsEIP1559),
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
): Promise<evm.BuildCustomTxInput & ChainSpecificBuildTxData<KnownChainIds>> => {
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
