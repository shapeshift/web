import { Logger } from '@keepkey/logger'
import * as core from '@shapeshiftoss/hdwallet-core'
import WalletConnect from '@walletconnect/client'
import type { IWalletConnectSession } from '@walletconnect/types'
import { convertHexToUtf8 } from '@walletconnect/utils'
import { ipcRenderer } from 'electron'
import type { TxData } from 'plugins/walletConnectToDapps/components/modal/callRequest/SendTransactionConfirmation'
import { web3ByChainId } from 'context/WalletProvider/web3byChainId'

import type { WalletConnectCallRequest, WalletConnectSessionRequestPayload } from './types'

const addressNList = core.bip32ToAddressNList("m/44'/60'/0'/0/0")

type WCServiceOptions = {
  onCallRequest(request: WalletConnectCallRequest): void
}

export class WCService {
  private logger = new Logger({ name: 'WCService', level: 'debug' })

  constructor(
    private readonly wallet: core.ETHWallet,
    public readonly connector: WalletConnect,
    private readonly options?: WCServiceOptions,
  ) {}

  static fromURI(uri: string, wallet: core.ETHWallet, options?: WCServiceOptions) {
    return new WCService(wallet, new WalletConnect({ uri }), options)
  }

  static fromSession(
    session: IWalletConnectSession,
    wallet: core.ETHWallet,
    options?: WCServiceOptions,
  ) {
    return new WCService(wallet, new WalletConnect({ session }), options)
  }

  async connect() {
    if (!this.connector.connected) {
      await this.connector.createSession()
    }
    this.subscribeToEvents()
  }

  disconnect = async () => {
    await this.connector.killSession()
    this.connector.off('session_request')
    this.connector.off('session_update')
    this.connector.off('connect')
    this.connector.off('call_request')
    this.connector.off('wallet_switchEthereumChain')
  }

  private subscribeToEvents() {
    this.connector.on('session_request', this._onSessionRequest.bind(this))
    this.connector.on('connect', this._onConnect.bind(this))
    this.connector.on('call_request', this._onCallRequest.bind(this))
    this.connector.on('wallet_switchEthereumChain', this._onSwitchChain.bind(this))
  }

  async _onSessionRequest(error: Error | null, payload: WalletConnectSessionRequestPayload) {
    this.log('Session Request', { error, payload })

    const address = await this.wallet.ethGetAddress({ addressNList, showDisplay: false })

    if (address) {
      this.connector.approveSession({
        chainId: 137,
        accounts: [address],
      })
    }
  }

  async _onConnect(error: Error | null, payload: any) {
    if (this.connector.connected && this.connector.peerMeta) {
      ipcRenderer.send('@walletconnect/pairing', {
        serviceName: this.connector.peerMeta.name,
        serviceImageUrl: this.connector.peerMeta.icons[0],
        serviceHomePage: this.connector.peerMeta.url,
      })
    }
    this.log('Connect', { error, payload })
  }

  async _onCallRequest(_: Error | null, payload: WalletConnectCallRequest) {
    this.options?.onCallRequest(payload)
  }

  // ****************
  // ****************
  // ****************
  // TODO we need a dropdown to allow them to update session with a new chain id client side
  async _onSwitchChain(_: Error | null, payload: any) {
    this.connector.approveRequest({
      id: payload.id,
      result: 'success',
    })
    this.connector.updateSession({
      chainId: payload.params[0].chainId,
      accounts: payload.params[0].accounts,
    })
  }

  public async approve(request: WalletConnectCallRequest, txData: TxData) {
    if (request.method === 'personal_sign') {
      const response = await this.wallet.ethSignMessage({
        ...txData,
        addressNList,
        message: this.convertHexToUtf8IfPossible(request.params[0]),
      })
      const result = response?.signature
      this.connector.approveRequest({ id: request.id, result })
    } else if (request.method === 'eth_sendTransaction') {
      const sendData: any = {
        addressNList,
        chainId: this.connector.chainId,
        data: txData.data,
        gasLimit: txData.gasLimit,
        to: txData.to,
        value: txData.value ?? '0x0',
        nonce: txData.nonce,
        maxPriorityFeePerGas: txData.maxPriorityFeePerGas,
        maxFeePerGas: txData.maxFeePerGas,
      }

      // if gasPrice was passed in it means we couldnt get maxPriorityFeePerGas & maxFeePerGas
      if (txData.gasPrice) {
        sendData['gasPrice'] = txData.gasPrice
        delete sendData.maxPriorityFeePerGas
        delete sendData.maxFeePerGas
      }

      const signedData = await this.wallet.ethSignTx?.(sendData)

      const chainWeb3 = web3ByChainId(this.connector.chainId) as any
      await chainWeb3.eth.sendSignedTransaction(signedData?.serialized)
      const txid = await chainWeb3.utils.sha3(signedData?.serialized)
      this.connector.approveRequest({ id: request.id, result: txid })
    } else if (request.method === 'eth_signTransaction') {
      const response = await this.wallet.ethSignTx({
        addressNList,
        chainId: this.connector.chainId,
        data: txData.data,
        gasLimit: txData.gasLimit,
        nonce: txData.nonce,
        to: txData.to,
        value: txData.value,
      })
      const result = response?.serialized
      this.connector.approveRequest({ id: request.id, result })
    } else {
      const message = 'JSON RPC method not supported'
      this.connector.rejectRequest({ id: request.id, error: { message } })
    }
  }

  public async reject(request: WalletConnectCallRequest) {
    this.connector.rejectRequest({ id: request.id, error: { message: 'Rejected by user' } })
  }

  private log(eventName: string, properties: object) {
    this.logger.debug(properties, eventName)
  }

  private convertHexToUtf8IfPossible(hex: string) {
    try {
      return convertHexToUtf8(hex)
    } catch (e) {
      return hex
    }
  }
}
