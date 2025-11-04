import type { IWalletKit, WalletKitTypes } from '@reown/walletkit'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'

import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import type { CustomTransactionData } from '@/plugins/walletConnectToDapps/types'

type ApproveSessionAuthRequestArgs = {
  wallet: HDWallet
  web3wallet: IWalletKit
  sessionAuthRequest: WalletKitTypes.EventArguments['session_authenticate']
  customTransactionData?: CustomTransactionData
  accountId?: string
  chainId?: string
  accountMetadata?: AccountMetadata
}

export const approveSessionAuthRequest = async ({
  wallet,
  web3wallet,
  sessionAuthRequest,
  customTransactionData,
  accountId,
  chainId,
  accountMetadata,
}: ApproveSessionAuthRequestArgs) => {
  const { authPayload } = sessionAuthRequest.params

  const selectedChainId = authPayload.chains?.[0] || chainId

  const selectedAccountId = customTransactionData?.accountId || accountId
  if (!selectedAccountId) throw new Error('No account selected for session authentication')
  if (!selectedChainId) throw new Error('No chain ID available for session authentication')

  const chainAdapter = assertGetEvmChainAdapter(selectedChainId)

  // Build the DID:PKH identifier from the account ID (iss = issuer in SIWE)
  // Format: did:pkh:<account_id> where account_id is already chainId:address format
  // See: https://docs.reown.com/advanced/multichain/rpc-reference/ethereum-rpc#session_authenticate
  const iss = `did:pkh:${selectedAccountId}`

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
