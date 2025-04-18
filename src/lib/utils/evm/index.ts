import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId } from '@shapeshiftoss/caip'
import type { ContractInteraction, EvmChainAdapter, SignTx } from '@shapeshiftoss/chain-adapters'
import { evm, evmChainIds, isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { ContractType, getOrCreateContractByType } from '@shapeshiftoss/contracts'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { EvmChainId, KnownChainIds } from '@shapeshiftoss/types'
import { encodeFunctionData, getAddress } from 'viem'

import { getSupportedChainIdsByChainNamespace } from '..'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import type { PartialFields } from '@/lib/types'

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
): Promise<evm.Fees> => {
  const { wallet, ...rest } = args

  const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

  return evm.getFees({ ...rest, supportsEIP1559 })
}

export const createBuildCustomTxInput = async (
  args: CreateBuildCustomTxInputArgs,
): Promise<evm.BuildCustomTxInput> => {
  const fees = await getFeesWithWalletEIP1559Support(args)
  return { ...args, ...fees }
}

export const buildAndBroadcast = async ({
  adapter,
  buildCustomTxInput,
  receiverAddress,
}: BuildAndBroadcastArgs) => {
  const senderAddress = await adapter.getAddress(buildCustomTxInput)
  const { txToSign } = await adapter.buildCustomTx(buildCustomTxInput)
  return signAndBroadcast({
    adapter,
    txToSign,
    wallet: buildCustomTxInput.wallet,
    senderAddress,
    receiverAddress,
  })
}

export const signAndBroadcast = async ({
  adapter,
  txToSign,
  wallet,
  senderAddress,
  receiverAddress,
}: BroadcastArgs) => {
  if (!wallet) throw new Error('Wallet is required to broadcast EVM Txs')

  if (wallet.supportsOfflineSigning()) {
    const signedTx = await adapter.signTransaction({ txToSign, wallet })
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
      signTxInput: { txToSign, wallet },
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

export const accountIdsToEvmAddresses = (accountIds: AccountId[]): string[] =>
  Array.from(
    new Set(
      accountIds
        .map(fromAccountId)
        .filter(({ chainId }) => isEvmChainId(chainId))
        .map(({ account }) => account),
    ),
  )
