import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import * as core from '@shapeshiftoss/hdwallet-core'
import WalletConnect from '@walletconnect/client'
import type { IWalletConnectSession } from '@walletconnect/types'
import { convertHexToUtf8 } from '@walletconnect/utils'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { logger } from 'lib/logger'

import type { WalletConnectCallRequest, WalletConnectCallRequestResponseMap } from './types'

const addressNList = core.bip32ToAddressNList("m/44'/60'/0'/0/0")

export type WCBridgeOptions = {
  onCallRequest(request: WalletConnectCallRequest): void
}

const moduleLogger = logger.child({ namespace: ['WalletConnectBridge'] })

export class WalletConnectBridge {
  constructor(
    public readonly connector: WalletConnect,
    private accountId: AccountId,
    private readonly options?: WCBridgeOptions,
  ) {}

  static fromURI(uri: string, accountId: AccountId, options?: WCBridgeOptions) {
    return new WalletConnectBridge(new WalletConnect({ uri }), accountId, options)
  }

  static fromSession(
    session: IWalletConnectSession,
    accountId: AccountId,
    options?: WCBridgeOptions,
  ) {
    return new WalletConnectBridge(new WalletConnect({ session }), accountId, options)
  }

  async connect() {
    if (!this.connector.connected) {
      await this.connector.createSession()
    }

    this.subscribeToEvents()
  }

  async disconnect() {
    await this.connector.killSession()
    this.connector.off('session_request')
    this.connector.off('session_update')
    this.connector.off('connect')
    this.connector.off('disconnect')
    this.connector.off('call_request')
  }

  private subscribeToEvents() {
    this.connector.on('session_request', this._onSessionRequest.bind(this))
    this.connector.on('session_update', this._onSessionUpdate.bind(this))
    this.connector.on('connect', this._onConnect.bind(this))
    this.connector.on('disconnect', this._onDisconnect.bind(this))
    this.connector.on('call_request', this._onCallRequest.bind(this))
  }

  _onSessionRequest

  async _onSessionUpdate(error: Error | null, _payload: any) {
    if (error) moduleLogger.error(error, { fn: '_onSessionUpdate' }, 'Error updating session')
  }

  async _onConnect(error: Error | null, _payload: any) {
    if (error) moduleLogger.error(error, { fn: '_onConnect' }, 'Error connecting to a new session')
  }

  async _onDisconnect(error: Error | null, _payload: any) {
    if (error)
      moduleLogger.error(error, { fn: '_onDisconnect' }, 'Error disconnecting from the session')
  }

  async _onCallRequest(error: Error | null, payload: WalletConnectCallRequest) {
    if (error) moduleLogger.error(error, { fn: '_onCallRequest' }, 'Error on call request')

    this.options?.onCallRequest(payload)
  }

  public async approveRequest(
    request: WalletConnectCallRequest,
    approveData?: Partial<
      WalletConnectCallRequestResponseMap[keyof WalletConnectCallRequestResponseMap]
    >,
  ) {
    // TODO(0xdef1cafe): IIFE
    let result: any
    // console.info(request, approveData);
    switch (request.method) {
      case 'eth_sign': {
        result = await this.signMessage(convertHexToUtf8(request.params[1]))
        break
      }
      case 'eth_signTypedData': {
        result = await this.signMessage(request.params[1])
        break
      }
      case 'personal_sign': {
        result = await this.signMessage(convertHexToUtf8(request.params[0]))
        break
      }
      case 'eth_sendTransaction': {
        const tx = request.params[0]
        const { bip44Params } = this.accountMetadata[this.account!]
        const { txToSign } = await this.chainAdapter.buildSendTransaction({
          to: tx.to,
          value: tx.value,
          wallet,
          bip44Params,
          chainSpecific: {
            gasLimit: tx.gas,
            gasPrice: tx.gasPrice,
          },
        })
        console.info(request, txToSign, approveData)
        try {
          result = await (async () => {
            if (wallet.supportsOfflineSigning()) {
              console.info('here')
              const signedTx = await this.chainAdapter.signTransaction({
                txToSign,
                wallet,
              })
              console.info(signedTx)
              return this.chainAdapter.broadcastTransaction(signedTx)
            } else if (wallet.supportsBroadcast()) {
              /**
               * signAndBroadcastTransaction is an optional method on the HDWallet interface.
               * Check and see if it exists; if so, call and make sure a txhash is returned
               */
              if (!this.chainAdapter.signAndBroadcastTransaction) {
                throw new Error('signAndBroadcastTransaction undefined for wallet')
              }
              return this.chainAdapter.signAndBroadcastTransaction?.({ txToSign, wallet })
            } else {
              throw new Error('Bad hdwallet config')
            }
          })()
        } catch (error) {
          console.error(error)
          moduleLogger.error(error, { fn: 'eth_sendTransaction' }, 'Error sending transaction')
        }
        break
      }
      case 'eth_signTransaction': {
        const tx = request.params[0]
        result = await this.chainAdapter.signTransaction({
          txToSign: {
            addressNList,
            chainId: parseInt(fromChainId(this.chainId).chainReference),
            data: tx.data,
            gasLimit: tx.gas,
            nonce: tx.nonce,
            to: tx.to,
            value: tx.value,
            ...approveData,
          },
          wallet,
        })
        break
      }
      default:
        break
    }
    if (result) {
      // moduleLogger.info('Approve Request', { request, result })
      this.connector.approveRequest({ id: request.id, result })
    } else {
      const message = 'JSON RPC method not supported'
      // moduleLogger.info("Reject Request (catch)", { request, message })
      this.connector.rejectRequest({ id: request.id, error: { message } })
    }
  }

  public rejectRequest(request: WalletConnectCallRequest) {
    // moduleLogger.info("Reject Request", { request })
    this.connector.rejectRequest({ id: request.id, error: { message: 'Rejected by user' } })
  }

  async signMessage(message: string) {
    return await this.chainAdapter.signMessage({
      messageToSign: {
        addressNList,
        message,
      },
      wallet,
    })
  }
}
