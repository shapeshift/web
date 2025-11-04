import type { IWalletKit, WalletKitTypes } from '@reown/walletkit'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'

import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import type { CustomTransactionData } from '@/plugins/walletConnectToDapps/types'
import { WalletConnectActionType } from '@/plugins/walletConnectToDapps/types'

type ApproveSessionAuthRequestArgs = {
  wallet: HDWallet
  web3wallet: IWalletKit
  sessionAuthRequest: WalletKitTypes.EventArguments['session_authenticate']
  customTransactionData?: CustomTransactionData
  accountId?: string
  chainId?: string
  portfolioAccountMetadata: Record<string, AccountMetadata>
  dispatch: (action: any) => void
}

export const approveSessionAuthRequest = async ({
  wallet,
  web3wallet,
  sessionAuthRequest,
  customTransactionData,
  accountId,
  chainId,
  portfolioAccountMetadata,
  dispatch,
}: ApproveSessionAuthRequestArgs) => {
  const { authPayload } = sessionAuthRequest.params

  const sessionAuthChainId = authPayload.chains?.[0] || chainId

  const selectedAccountId = customTransactionData?.accountId || accountId
  if (!selectedAccountId) throw new Error('No account selected for session authentication')
  if (!sessionAuthChainId) throw new Error('No chain ID available for session authentication')

  const chainAdapter = assertGetEvmChainAdapter(sessionAuthChainId)

  const address = selectedAccountId.split(':')[2]
  const caipChainId = authPayload.chains?.[0] || sessionAuthChainId
  const iss = `did:pkh:${caipChainId}:${address}`

  const message = web3wallet.formatAuthMessage({
    request: authPayload,
    iss,
  })

  const selectedAccountMetadata = portfolioAccountMetadata[selectedAccountId]
  const bip44Params = selectedAccountMetadata?.bip44Params
  const addressNList = bip44Params ? toAddressNList(chainAdapter.getBip44Params(bip44Params)) : []

  const messageToSign = { addressNList, message }
  const input = { messageToSign, wallet }
  const signature = await chainAdapter.signMessage(input)

  if (!signature) throw new Error('Failed to sign message')

  // Ensure signature has 0x prefix
  const formattedSignature = signature.startsWith('0x') ? signature : `0x${signature}`

  // CACAO payload needs to include the iss field
  const cacaoPayload = {
    ...authPayload,
    iss,
  }

  const cacao = {
    h: { t: 'caip122' as const },
    p: cacaoPayload,
    s: { t: 'eip191' as const, s: formattedSignature },
  }

  const approvalResponse = await web3wallet.approveSessionAuthenticate({
    id: sessionAuthRequest.id,
    auths: [cacao],
  })

  if (approvalResponse?.session) {
    dispatch({
      type: WalletConnectActionType.ADD_SESSION,
      payload: approvalResponse.session,
    })
  }

  return approvalResponse
}
