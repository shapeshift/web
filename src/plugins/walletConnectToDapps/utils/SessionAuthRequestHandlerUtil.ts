import type { IWalletKit, WalletKitTypes } from '@reown/walletkit'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { getAddress } from 'viem'

import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import type { CustomTransactionData } from '@/plugins/walletConnectToDapps/types'

type ApproveSessionAuthRequestArgs = {
  wallet: HDWallet
  web3wallet: IWalletKit
  sessionAuthRequest: WalletKitTypes.EventArguments['session_authenticate']
  customTransactionData?: CustomTransactionData
  accountId?: AccountId
  accountMetadata?: AccountMetadata
}

// DID:PKH identifier of the signer (iss in SIWE), EIP-4361 requires the address to be EIP-55 checksummed
export const getSessionAuthIss = (accountId: AccountId): string => {
  const { chainId, account } = fromAccountId(accountId)
  return `did:pkh:${chainId}:${getAddress(account)}`
}

export const approveSessionAuthRequest = async ({
  wallet,
  web3wallet,
  sessionAuthRequest,
  customTransactionData,
  accountId,
  accountMetadata,
}: ApproveSessionAuthRequestArgs) => {
  const { authPayload } = sessionAuthRequest.params

  const selectedChainId = authPayload.chains?.[0]
  if (!selectedChainId) throw new Error('No chain ID in session authentication request')

  const selectedAccountId = customTransactionData?.accountId || accountId
  if (!selectedAccountId) throw new Error('No account selected for session authentication')

  const chainAdapter = assertGetEvmChainAdapter(selectedChainId)

  const iss = getSessionAuthIss(selectedAccountId)

  const message = web3wallet.formatAuthMessage({
    request: authPayload,
    iss,
  })

  const bip44Params = accountMetadata?.bip44Params
  const addressNList = bip44Params ? toAddressNList(chainAdapter.getBip44Params(bip44Params)) : []

  const messageToSign = { addressNList, message }
  const input = { messageToSign, wallet }
  const signature = await chainAdapter.signMessage(input)

  if (!signature) throw new Error('Failed to sign message')

  // Build CACAO (Chain Agnostic CApability Object)
  // See: https://chainagnostic.org/CAIPs/caip-74
  // See: https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-222.md
  const cacaoPayload = {
    ...authPayload,
    iss, // The "iss" field identifies the signer
  }

  const cacao = {
    h: { t: 'caip122' as const }, // Header type: CAIP-122 (SIWx)
    p: cacaoPayload, // Payload with auth request + iss
    s: { t: 'eip191' as const, s: signature }, // Signature type and value
  }

  const approvalResponse = await web3wallet.approveSessionAuthenticate({
    id: sessionAuthRequest.id,
    auths: [cacao],
  })

  return approvalResponse
}
