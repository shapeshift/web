import { Transaction as SuiTransaction } from '@mysten/sui/transactions'
import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION, toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'

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

const executeEvmTransaction = async ({
  parsed,
  chainId,
  wallet,
  bip44Params,
}: ExecuteEvmTransactionInput): Promise<string> => {
  const adapter = assertGetEvmChainAdapter(chainId)

  const addressNList = bip44Params ? toAddressNList(adapter.getBip44Params(bip44Params)) : undefined

  if (!addressNList) throw new Error('Failed to get address derivation path')

  const txToSign = {
    to: parsed.to,
    from: parsed.from,
    data: parsed.data ?? '0x0',
    value: parsed.value ?? '0x0',
    gasLimit: parsed.gasLimit ?? '0x0',
    maxFeePerGas: parsed.maxFeePerGas ?? '0x0',
    maxPriorityFeePerGas: parsed.maxPriorityFeePerGas ?? '0x0',
    nonce: String(parsed.nonce ?? 0),
    chainId: parsed.chainId,
    type: parsed.type,
    addressNList,
  }

  const txHash = await evmSignAndBroadcast({
    adapter,
    txToSign: txToSign as any,
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
  console.log('[executeSolanaTransaction] Starting with:', {
    chainId,
    accountNumber: bip44Params?.accountNumber,
  })

  const adapter = assertGetSolanaChainAdapter(chainId)
  const accountNumber = bip44Params?.accountNumber ?? 0

  const txData = unsignedTransaction.startsWith('0x')
    ? unsignedTransaction.slice(2)
    : unsignedTransaction
  console.log('[executeSolanaTransaction] Deserializing tx, length:', txData.length)

  const versionedTransaction = VersionedTransaction.deserialize(
    new Uint8Array(Buffer.from(txData, 'hex')),
  )
  console.log('[executeSolanaTransaction] Deserialized versionedTransaction:', {
    numSignatures: versionedTransaction.signatures.length,
    numLookupTables: versionedTransaction.message.addressTableLookups.length,
  })

  const addressLookupTableAccountKeys = versionedTransaction.message.addressTableLookups.map(
    lookup => lookup.accountKey.toString(),
  )
  console.log('[executeSolanaTransaction] Lookup table keys:', addressLookupTableAccountKeys)

  const addressLookupTableAccountsInfos = await adapter.getAddressLookupTableAccounts(
    addressLookupTableAccountKeys,
  )
  console.log(
    '[executeSolanaTransaction] Got lookup table infos:',
    addressLookupTableAccountsInfos.length,
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
  console.log('[executeSolanaTransaction] Decompiled message:', {
    numInstructions: decompiledMessage.instructions.length,
    payerKey: decompiledMessage.payerKey.toString(),
    recentBlockhash: decompiledMessage.recentBlockhash,
  })

  const computeBudgetProgramId = ComputeBudgetProgram.programId.toString()
  const nonComputeBudgetInstructions = decompiledMessage.instructions.filter(
    ix => ix.programId.toString() !== computeBudgetProgramId,
  )
  console.log('[executeSolanaTransaction] Filtered instructions (excluding compute budget):', {
    original: decompiledMessage.instructions.length,
    filtered: nonComputeBudgetInstructions.length,
  })

  const from = await adapter.getAddress({ accountNumber, wallet })
  console.log('[executeSolanaTransaction] Got address:', from)

  const { fast } = await adapter.getFeeData({
    to: '',
    value: '0',
    chainSpecific: {
      from,
      addressLookupTableAccounts: addressLookupTableAccountKeys,
      instructions: nonComputeBudgetInstructions,
    },
  })
  console.log('[executeSolanaTransaction] Fee data:', {
    computeUnits: fast.chainSpecific.computeUnits,
    priorityFee: fast.chainSpecific.priorityFee,
  })

  const convertedInstructions = nonComputeBudgetInstructions.map(instruction =>
    adapter.convertInstruction(instruction),
  )
  console.log('[executeSolanaTransaction] Converted instructions:', convertedInstructions.length)

  const STAKE_COMPUTE_UNIT_BUFFER = 50000
  const estimatedComputeUnits = Math.max(
    Number(fast.chainSpecific.computeUnits),
    STAKE_COMPUTE_UNIT_BUFFER,
  )
  console.log('[executeSolanaTransaction] Using compute units:', estimatedComputeUnits)

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
  console.log('[executeSolanaTransaction] Built txToSign:', {
    addressNList: txToSign.addressNList,
    blockHash: txToSign.blockHash,
    computeUnitLimit: txToSign.computeUnitLimit,
    computeUnitPrice: txToSign.computeUnitPrice,
    numInstructions: txToSign.instructions?.length,
    to: txToSign.to,
    value: txToSign.value,
  })

  console.log('[executeSolanaTransaction] Signing transaction...')
  const signedTx = await adapter.signTransaction({ txToSign, wallet })
  console.log(
    '[executeSolanaTransaction] Signed tx:',
    signedTx ? `${signedTx.substring(0, 50)}...` : 'null',
  )

  if (!signedTx) throw new Error('Failed to sign Solana transaction')

  console.log('[executeSolanaTransaction] Broadcasting transaction...')
  try {
    const txHash = await adapter.broadcastTransaction({
      senderAddress: from,
      receiverAddress: CONTRACT_INTERACTION,
      hex: signedTx,
    })
    console.log('[executeSolanaTransaction] Got txHash:', txHash)

    if (!txHash) throw new Error('Failed to broadcast Solana transaction')
    return txHash
  } catch (err) {
    console.error('[executeSolanaTransaction] Broadcast error:', err)
    console.error('[executeSolanaTransaction] Signed tx (base64):', signedTx)
    throw err
  }
}
