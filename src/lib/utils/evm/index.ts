import { CHAIN_NAMESPACE, type ChainId } from '@shapeshiftoss/caip'
import type {
  ContractInteraction,
  evm,
  EvmChainAdapter,
  EvmChainId,
  SignTx,
} from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Fees } from '@shapeshiftoss/utils/dist/evm'
import { getFees } from '@shapeshiftoss/utils/dist/evm'
import { getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import { encodeFunctionData, getAddress } from 'viem'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { PartialFields } from 'lib/types'

import { getSupportedChainIdsByChainNamespace } from '..'

type GetApproveContractDataArgs = {
  approvalAmountCryptoBaseUnit: string
  to: string
  spender: string
  chainId: ChainId
}

type BuildArgs = {
  buildCustomTxInput: evm.BuildCustomTxInput
}

type BroadcastArgs = {
  senderAddress: string
  receiverAddress: string | ContractInteraction
  adapter: EvmChainAdapter
  txToSign: SignTx<EvmChainId>
  wallet: HDWallet
  checkLedgerAppOpenIfLedgerConnected: (chainId: ChainId) => Promise<void>
}

type BuildAndBroadcastArgs = BuildArgs &
  Omit<BroadcastArgs, 'senderAddress' | 'txToSign' | 'wallet'>

type CreateBuildCustomTxInputArgs = {
  accountNumber: number
  from: string
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

type GetFeesCommonArgs = {
  adapter: EvmChainAdapter
  data: string
  to: string
  value: string
  from: string
}

export type GetFeesWithWalletEip1559SupportArgs = GetFeesCommonArgs & {
  wallet: HDWallet
}

export type MaybeGetFeesWithWalletEip1559Args = PartialFields<
  Omit<GetFeesWithWalletEip1559SupportArgs, 'wallet'>,
  'adapter' | 'data' | 'to' | 'from'
> & {
  wallet: HDWallet | null
}

export const isGetFeesWithWalletEIP1559SupportArgs = (
  input: MaybeGetFeesWithWalletEip1559Args,
): input is GetFeesWithWalletEip1559SupportArgs =>
  Boolean(input.adapter && input.wallet && input.data && input.to && input.from)

export const getFeesWithWalletEIP1559Support = async (
  args: GetFeesWithWalletEip1559SupportArgs,
): Promise<Fees> => {
  const { wallet, ...rest } = args

  const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

  return getFees({ ...rest, supportsEIP1559 })
}

export const createBuildCustomTxInput = async (
  args: CreateBuildCustomTxInputArgs,
): Promise<evm.BuildCustomTxInput> => {
  const fees = await getFeesWithWalletEIP1559Support(args)
  return { ...args, ...fees }
}

export const createBuildCustomApiTxInput = async (
  args: CreateBuildCustomApiTxInputArgs,
): Promise<evm.BuildCustomApiTxInput> => {
  const { accountNumber, from, supportsEIP1559, ...rest } = args
  const fees = await getFees({ ...rest, from, supportsEIP1559 })
  return { ...args, ...fees }
}

export const buildAndBroadcast = async ({
  adapter,
  buildCustomTxInput,
  receiverAddress,
  checkLedgerAppOpenIfLedgerConnected,
}: BuildAndBroadcastArgs) => {
  await checkLedgerAppOpenIfLedgerConnected(adapter.getChainId())
  const senderAddress = await adapter.getAddress(buildCustomTxInput)
  const { txToSign } = await adapter.buildCustomTx(buildCustomTxInput)

  return signAndBroadcast({
    adapter,
    txToSign,
    wallet: buildCustomTxInput.wallet,
    senderAddress,
    receiverAddress,
    checkLedgerAppOpenIfLedgerConnected,
  })
}

export const signAndBroadcast = async ({
  adapter,
  txToSign,
  wallet,
  senderAddress,
  receiverAddress,
  checkLedgerAppOpenIfLedgerConnected,
}: BroadcastArgs) => {
  if (!wallet) throw new Error('Wallet is required to broadcast EVM Txs')

  if (wallet.supportsOfflineSigning()) {
    const signedTx = await adapter.signTransaction({
      txToSign,
      wallet,
      checkLedgerAppOpenIfLedgerConnected,
    })
    const txid = await adapter.broadcastTransaction({
      senderAddress,
      receiverAddress,
      hex: signedTx,
    })
    return txid
  }

  if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
    // note that txToSign.to is often a contract address and not the actual receiver
    // TODO: do we want to validate contract addresses too?
    const txid = await adapter.signAndBroadcastTransaction({
      senderAddress,
      receiverAddress,
      signTxInput: { txToSign, wallet, checkLedgerAppOpenIfLedgerConnected },
    })
    return txid
  }

  throw new Error('buildAndBroadcast: no broadcast support')
}

export const getApproveContractData = ({
  approvalAmountCryptoBaseUnit,
  to,
  spender,
  chainId,
}: GetApproveContractDataArgs): string => {
  const address = getAddress(to)
  const contract = getOrCreateContractByType({
    address,
    type: ContractType.ERC20,
    chainId,
  })
  const data = encodeFunctionData({
    abi: contract.abi,
    functionName: 'approve',
    args: [getAddress(spender), BigInt(approvalAmountCryptoBaseUnit)],
  })
  return data
}

export const getErc20Allowance = async ({
  address,
  from,
  spender,
  chainId,
}: GetErc20AllowanceArgs): Promise<string> => {
  const contract = getOrCreateContractByType({
    address,
    type: ContractType.ERC20,
    chainId,
  })
  const allowance = await contract.read.allowance([getAddress(from), getAddress(spender)])
  // TODO(gomes): fix types
  return allowance.toString()
}

export const isEvmChainAdapter = (chainAdapter: unknown): chainAdapter is EvmChainAdapter => {
  return evmChainIds.includes((chainAdapter as EvmChainAdapter).getChainId() as EvmChainId)
}

export const assertGetEvmChainAdapter = (chainId: ChainId | KnownChainIds): EvmChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isEvmChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}

export const getSupportedEvmChainIds = () => {
  return getSupportedChainIdsByChainNamespace()[CHAIN_NAMESPACE.Evm]
}
