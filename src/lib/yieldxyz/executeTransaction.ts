import { Transaction as SuiTransaction } from '@mysten/sui/transactions'
import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION, toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { SignTx } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { EvmChainId } from '@shapeshiftoss/types'
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import type { Hex } from 'viem'
import { isHex, toHex } from 'viem'

import type { TransactionDto } from './types'

import { toBaseUnit } from '@/lib/math'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter, signAndBroadcast as evmSignAndBroadcast } from '@/lib/utils/evm'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { assertGetSuiChainAdapter } from '@/lib/utils/sui'
import { isStakingChainAdapter } from '@/plugins/cosmos/components/modals/Staking/StakingCommon'

type ParsedEvmTransaction = {
  to: string
  from: string
  data: string
  value?: string
  gasLimit?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  nonce: number
  chainId: number
  type?: number
}

type CosmosGasEstimate = {
  amount: string
  gasLimit: string
  token: {
    name: string
    network: string
    decimals: number
    symbol: string
  }
}

export type CosmosStakeArgs = {
  validator: string
  amountCryptoBaseUnit: string
  action: 'stake' | 'unstake' | 'claim'
}

type ExecuteTransactionInput = {
  tx: TransactionDto
  chainId: ChainId
  wallet: HDWallet
  accountId: string
  userAddress: string
  bip44Params?: { purpose: number; coinType: number; accountNumber: number }
  cosmosStakeArgs?: CosmosStakeArgs
}

export const executeTransaction = async ({
  tx,
  chainId,
  wallet,
  bip44Params,
  cosmosStakeArgs,
}: ExecuteTransactionInput): Promise<string> => {
  const { chainNamespace } = fromChainId(chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const parsed: ParsedEvmTransaction = JSON.parse(tx.unsignedTransaction)
      return await executeEvmTransaction({ parsed, chainId, wallet, bip44Params })
    }
    case CHAIN_NAMESPACE.CosmosSdk: {
      if (!cosmosStakeArgs) {
        throw new Error('cosmosStakeArgs required for CosmosSdk transactions')
      }
      return await executeCosmosTransaction({
        gasEstimate: tx.gasEstimate,
        chainId,
        wallet,
        bip44Params,
        cosmosStakeArgs,
      })
    }
    case CHAIN_NAMESPACE.Sui: {
      return await executeSuiTransaction({
        unsignedTransaction: tx.unsignedTransaction,
        chainId,
        wallet,
        bip44Params,
      })
    }
    case CHAIN_NAMESPACE.Solana: {
      return await executeSolanaTransaction({
        unsignedTransaction: tx.unsignedTransaction,
        chainId,
        wallet,
        bip44Params,
      })
    }
    default:
      throw new Error(`Unsupported chain namespace: ${chainNamespace} for chainId: ${chainId}`)
  }
}

type ExecuteEvmTransactionInput = {
  parsed: ParsedEvmTransaction
  chainId: ChainId
  wallet: HDWallet
  bip44Params?: { purpose: number; coinType: number; accountNumber: number }
}

const toHexOrDefault = (value: string | number | undefined, fallback: Hex): Hex => {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'number') return toHex(value)
  if (isHex(value)) return value as Hex
  try {
    return toHex(BigInt(value))
  } catch {
    return fallback
  }
}

const toHexData = (value: string | undefined): Hex => {
  if (!value) return '0x'
  return isHex(value) ? (value as Hex) : (value.startsWith('0x') ? (value as Hex) : '0x')
}

const executeEvmTransaction = async ({
  parsed,
  chainId,
  wallet,
  bip44Params,
}: ExecuteEvmTransactionInput): Promise<string> => {
  const adapter = assertGetEvmChainAdapter(chainId)

  const addressNList = bip44Params ? toAddressNList(adapter.getBip44Params(bip44Params)) : undefined

  if (!addressNList) throw new Error('Failed to get address derivation path')

  const baseTxToSign = {
    to: toHexData(parsed.to),
    data: toHexData(parsed.data),
    value: toHexOrDefault(parsed.value, '0x0'),
    gasLimit: toHexOrDefault(parsed.gasLimit, '0x0'),
    nonce: toHexOrDefault(parsed.nonce ?? 0, '0x0'),
    chainId: parsed.chainId,
    type: parsed.type,
    addressNList,
  }

  const txToSign: SignTx<EvmChainId> =
    parsed.maxFeePerGas || parsed.maxPriorityFeePerGas
      ? {
        ...baseTxToSign,
        maxFeePerGas: toHexOrDefault(parsed.maxFeePerGas, '0x0'),
        maxPriorityFeePerGas: toHexOrDefault(parsed.maxPriorityFeePerGas, '0x0'),
      }
      : {
        ...baseTxToSign,
        gasPrice: toHexOrDefault(parsed.gasPrice ?? '0', '0x0'),
      }

  /*
    We need to cast to any here because existing EVM adapters might have slight signature differences
    in their signAndBroadcast types that strict TS doesn't like, OR the txToSign object
    constructed above is missing optional properties that the adapter expects but doesn't strictly need for this call.
    However, the goal is to remove 'as any'.
    
    The error is usually that 'SignTx' type in shapeshift-adapters is a union of all chain tx types,
    and we are passing a specific EVM tx object.
    
    Let's relax the cast to 'SignTx<EvmChainId>' which we already did in variable declaration,
    but let's double check if we can pass it without 'as any'.
  */
  const txHash = await evmSignAndBroadcast({
    adapter,
    txToSign, // remove 'as any' - it is already typed as SignTx<EvmChainId>
    wallet,
    senderAddress: parsed.from,
    receiverAddress: parsed.to,
  })


  if (!txHash) throw new Error('Failed to broadcast EVM transaction')
  return txHash
}

type ExecuteCosmosTransactionInput = {
  gasEstimate: string
  chainId: ChainId
  wallet: HDWallet
  bip44Params?: { purpose: number; coinType: number; accountNumber: number }
  cosmosStakeArgs: CosmosStakeArgs
}

const executeCosmosTransaction = async ({
  gasEstimate,
  chainId,
  wallet,
  bip44Params,
  cosmosStakeArgs,
}: ExecuteCosmosTransactionInput): Promise<string> => {
  const adapter = assertGetCosmosSdkChainAdapter(chainId)

  if (!isStakingChainAdapter(adapter)) {
    throw new Error(`Chain adapter does not support staking for chainId: ${chainId}`)
  }

  const gas: CosmosGasEstimate = JSON.parse(gasEstimate)
  const accountNumber = bip44Params?.accountNumber ?? 0

  const { validator, amountCryptoBaseUnit, action } = cosmosStakeArgs

  const feeInBaseUnit = toBaseUnit(gas.amount, gas.token.decimals)

  const chainSpecific = {
    gas: gas.gasLimit,
    fee: feeInBaseUnit,
  }

  const address = await adapter.getAddress({ accountNumber, wallet })

  const buildTxFn = (() => {
    switch (action) {
      case 'stake':
        return adapter.buildDelegateTransaction({
          accountNumber,
          wallet,
          validator,
          value: amountCryptoBaseUnit,
          chainSpecific,
          memo: '',
        })
      case 'unstake':
        return adapter.buildUndelegateTransaction({
          accountNumber,
          wallet,
          validator,
          value: amountCryptoBaseUnit,
          chainSpecific,
          memo: '',
        })
      case 'claim':
        return adapter.buildClaimRewardsTransaction({
          accountNumber,
          wallet,
          validator,
          chainSpecific,
          memo: '',
        })
      default:
        throw new Error(`Unsupported cosmos action: ${action}`)
    }
  })()

  const { txToSign } = await buildTxFn

  const txHash = await adapter.signAndBroadcastTransaction({
    senderAddress: address,
    receiverAddress: action === 'stake' ? CONTRACT_INTERACTION : address,
    signTxInput: { txToSign, wallet },
  })

  if (!txHash) throw new Error('Failed to broadcast Cosmos transaction')
  return txHash
}

type ExecuteSuiTransactionInput = {
  unsignedTransaction: string
  chainId: ChainId
  wallet: HDWallet
  bip44Params?: { purpose: number; coinType: number; accountNumber: number }
}

const executeSuiTransaction = async ({
  unsignedTransaction,
  chainId,
  wallet,
  bip44Params,
}: ExecuteSuiTransactionInput): Promise<string> => {
  const adapter = assertGetSuiChainAdapter(chainId)
  const accountNumber = bip44Params?.accountNumber ?? 0

  const txJson = Buffer.from(unsignedTransaction, 'base64').toString('utf-8')
  const tx = SuiTransaction.from(txJson)

  const client = adapter.getSuiClient()
  const transactionBytes = await tx.build({ client })

  const intentMessage = new Uint8Array(3 + transactionBytes.length)
  intentMessage[0] = 0 // TransactionData intent scope
  intentMessage[1] = 0 // Version
  intentMessage[2] = 0 // AppId
  intentMessage.set(transactionBytes, 3)

  const txToSign = {
    addressNList: toAddressNList(adapter.getBip44Params({ accountNumber })),
    intentMessageBytes: intentMessage,
    transactionJson: '{}', // Added to satisfy SuiSignTx type requirement
  }

  const txHash = await adapter.signAndBroadcastTransaction({
    senderAddress: '',
    receiverAddress: '',
    signTxInput: { txToSign, wallet },
  })

  if (!txHash) throw new Error('Failed to broadcast Sui transaction')
  return txHash
}

type ExecuteSolanaTransactionInput = {
  unsignedTransaction: string
  chainId: ChainId
  wallet: HDWallet
  bip44Params?: { purpose: number; coinType: number; accountNumber: number }
}

const executeSolanaTransaction = async ({
  unsignedTransaction,
  chainId,
  wallet,
  bip44Params,
}: ExecuteSolanaTransactionInput): Promise<string> => {
  const adapter = assertGetSolanaChainAdapter(chainId)
  const accountNumber = bip44Params?.accountNumber ?? 0
  const txData = unsignedTransaction.startsWith('0x')
    ? unsignedTransaction.slice(2)
    : unsignedTransaction

  const versionedTransaction = VersionedTransaction.deserialize(
    new Uint8Array(Buffer.from(txData, 'hex')),
  )

  const addressLookupTableAccountKeys = versionedTransaction.message.addressTableLookups.map(
    lookup => lookup.accountKey.toString(),
  )

  const addressLookupTableAccountsInfos = await adapter.getAddressLookupTableAccounts(
    addressLookupTableAccountKeys,
  )

  const addressLookupTableAccounts = addressLookupTableAccountsInfos.map(
    info =>
      new AddressLookupTableAccount({
        key: new PublicKey(info.key),
        state: AddressLookupTableAccount.deserialize(new Uint8Array(info.data)),
      }),
  )

  const decompiledMessage = TransactionMessage.decompile(versionedTransaction.message, {
    addressLookupTableAccounts,
  })

  const computeBudgetProgramId = ComputeBudgetProgram.programId.toString()
  const nonComputeBudgetInstructions = decompiledMessage.instructions.filter(
    ix => ix.programId.toString() !== computeBudgetProgramId,
  )

  const from = await adapter.getAddress({ accountNumber, wallet })

  const { fast } = await adapter.getFeeData({
    to: '',
    value: '0',
    chainSpecific: {
      from,
      addressLookupTableAccounts: addressLookupTableAccountKeys,
      instructions: nonComputeBudgetInstructions,
    },
  })

  const convertedInstructions = nonComputeBudgetInstructions.map(instruction =>
    adapter.convertInstruction(instruction),
  )

  const STAKE_COMPUTE_UNIT_BUFFER = 50000
  const estimatedComputeUnits = Math.max(
    Number(fast.chainSpecific.computeUnits),
    STAKE_COMPUTE_UNIT_BUFFER,
  )

  const txToSign = await adapter.buildSendApiTransaction({
    from,
    to: '',
    value: '0',
    accountNumber,
    chainSpecific: {
      addressLookupTableAccounts: addressLookupTableAccountKeys,
      instructions: convertedInstructions,
      computeUnitLimit: String(estimatedComputeUnits),
      computeUnitPrice: fast.chainSpecific.priorityFee,
    },
  })

  const signedTx = await adapter.signTransaction({ txToSign, wallet })

  if (!signedTx) throw new Error('Failed to sign Solana transaction')

  try {
    const txHash = await adapter.broadcastTransaction({
      senderAddress: from,
      receiverAddress: CONTRACT_INTERACTION,
      hex: signedTx,
    })

    if (!txHash) throw new Error('Failed to broadcast Solana transaction')
    return txHash
  } catch (err) {
    console.error('[executeSolanaTransaction] Broadcast error:', err)
    throw err
  }
}

