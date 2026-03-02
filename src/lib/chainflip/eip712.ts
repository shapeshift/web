import { ethChainId } from '@shapeshiftoss/caip'
import type { SignTypedDataInput } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTypedData, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'
import type { TypedData } from 'eip-712'
import { Signature } from 'ethers'

import { BLOCKS_TO_EXPIRY } from './constants'
import { authorSubmitExtrinsic, cfEncodeNonNativeCall, stateGetRuntimeVersion } from './rpc'
import { encodeNonNativeSignedCall } from './scale'

import { assertGetEvmChainAdapter } from '@/lib/utils/evm'

export type SignChainflipCallInput = {
  wallet: HDWallet
  accountMetadata: AccountMetadata
  encodedCall: string
  blocksToExpiry?: number
  nonceOrAccount: number | string
}

export type SignChainflipCallOutput = {
  signedExtrinsicHex: string
  signature: string
  signer: string
  transactionMetadata: { nonce: number; expiryBlock: number }
}

const normalizeSignature = (rawSignature: string): string => {
  return Signature.from(Signature.from(rawSignature)).serialized
}

export const signChainflipCall = async ({
  wallet,
  accountMetadata,
  encodedCall,
  blocksToExpiry = BLOCKS_TO_EXPIRY,
  nonceOrAccount,
}: SignChainflipCallInput): Promise<SignChainflipCallOutput> => {
  const version = await stateGetRuntimeVersion()
  if (version.specVersion < 20012) {
    throw new Error(`Chainflip spec version too old: ${version.specVersion}`)
  }

  const adapter = assertGetEvmChainAdapter(ethChainId)
  const accountNumber = accountMetadata.bip44Params.accountNumber
  const signer = await adapter.getAddress({ accountNumber, wallet })

  const [payload, transactionMetadata] = await cfEncodeNonNativeCall({
    hexCall: encodedCall,
    blocksToExpiry,
    nonceOrAccount,
  })

  const typedData = payload.Eip712 as TypedData
  const typedDataToSign: ETHSignTypedData = {
    addressNList: toAddressNList(adapter.getBip44Params(accountMetadata.bip44Params)),
    typedData,
  }

  const signTypedDataInput: SignTypedDataInput<ETHSignTypedData> = {
    typedDataToSign,
    wallet,
  }

  const rawSignature = await adapter.signTypedData(signTypedDataInput)
  const signature = normalizeSignature(rawSignature)
  const signedExtrinsicHex = encodeNonNativeSignedCall(
    encodedCall,
    { nonce: transactionMetadata.nonce, expiryBlock: transactionMetadata.expiry_block },
    { signature, signer },
  )

  return {
    signedExtrinsicHex,
    signature,
    signer,
    transactionMetadata: {
      nonce: transactionMetadata.nonce,
      expiryBlock: transactionMetadata.expiry_block,
    },
  }
}

export const submitSignedCall = (signedExtrinsicHex: string): Promise<string> =>
  authorSubmitExtrinsic(signedExtrinsicHex)

export const signAndSubmitChainflipCall = async (
  input: SignChainflipCallInput,
): Promise<{ signedExtrinsicHex: string; txHash: string; nonce: number }> => {
  const { signedExtrinsicHex, transactionMetadata } = await signChainflipCall(input)
  const txHash = await submitSignedCall(signedExtrinsicHex)
  return { signedExtrinsicHex, txHash, nonce: transactionMetadata.nonce }
}
