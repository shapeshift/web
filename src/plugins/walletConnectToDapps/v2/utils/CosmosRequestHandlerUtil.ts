// import type { JsonRpcResult } from '@json-rpc-tools/utils'
// import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
// import type { AccountId } from '@shapeshiftoss/caip'
// import type { ChainAdapter, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
// import { toAddressNList } from '@shapeshiftoss/chain-adapters'
// import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
// import { Cosmos } from '@shapeshiftoss/hdwallet-core'
// import type { SignClientTypes } from '@walletconnect/types'
// import { getSdkError } from '@walletconnect/utils'
// import type {
//   CosmosSignAminoCallRequest,
//   CosmosSignDirectCallRequest,
//   CustomTransactionData,
//   SupportedSessionRequest,
// } from 'plugins/walletConnectToDapps/v2/types'
// import { CosmosSigningMethod } from 'plugins/walletConnectToDapps/v2/types'
// import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'
// import StdSignature = Cosmos.StdSignature
//
// type ApproveCosmosRequestArgs = {
//   requestEvent: SupportedSessionRequest<CosmosSignAminoCallRequest | CosmosSignDirectCallRequest>
//   wallet: HDWallet
//   chainAdapter: ChainAdapter<CosmosSdkChainId>
//   accountMetadata?: AccountMetadata
//   customTransactionData?: CustomTransactionData
//   accountId?: AccountId
// }
//
// export const approveCosmosRequest = async ({
//   requestEvent,
//   wallet,
//   chainAdapter,
//   accountMetadata,
//   customTransactionData,
//   accountId,
// }: ApproveCosmosRequestArgs): Promise<JsonRpcResult<StdSignature>> => {
//   const { params, id } = requestEvent
//   const { request } = params
//   const bip44Params = accountMetadata?.bip44Params
//   const accountNumber = bip44Params?.accountNumber
//   const addressNList = bip44Params ? toAddressNList(bip44Params) : []
//
//   switch (request.method) {
//     case CosmosSigningMethod.COSMOS_SIGN_AMINO:
//       const transaction = chainAdapter.buildSendTransaction({
//         accountNumber: 0,
//         chainSpecific: {
//           gas: request.params.signDoc.fee.gas,
//           fee: request.params.signDoc.fee.amount[0].amount,
//         },
//         to: request.params.signerAddress,
//         value: '',
//         wallet,
//       })
//       const signedMessage = await chainAdapter.signTransaction({
//         txToSign: {
//           addressNList,
//           tx: transaction,
//           chain_id: request.params.signDoc.chain_id,
//           account_number: accountNumber,
//           sequence: request.params.signDoc.sequence,
//           fee: request.params.signDoc.fee,
//         },
//         wallet,
//       })
//       return formatJsonRpcResult(id, signedMessage)
//
//     case CosmosSigningMethod.COSMOS_SIGN_DIRECT: {
//       // const signedMessage = await chainAdapter.signTransaction(input)
//       // if (!signedMessage) throw new Error('approveEIP155Request: signMessage failed')
//       return formatJsonRpcResult(1, 'signedMessage' as unknown as StdSignature)
//     }
//
//     default:
//       throw new Error(getSdkError('INVALID_METHOD').message)
//   }
// }
//
// export const rejectCosmosRequest = (request: SignClientTypes.EventArguments['session_request']) => {
//   const { id } = request
//   return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
// }
