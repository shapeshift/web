import { ethereum } from '@shapeshiftoss/chain-adapters'
import * as core from '@shapeshiftoss/hdwallet-core'
import { Logger } from '@shapeshiftoss/logger'
import { KnownChainIds } from '@shapeshiftoss/types'
import WalletConnect from '@walletconnect/client'
import type { IWalletConnectSession } from '@walletconnect/types'
import { convertHexToUtf8 } from '@walletconnect/utils'
import Web3 from 'web3'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

import type {
  WalletConnectCallRequest,
  WalletConnectCallRequestResponseMap,
  WalletConnectSessionRequestPayload,
} from './types'

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
    if (!this.wallet) throw new Error('Missing ETH Wallet to connect with')

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

  async _onSessionRequest(error: Error | null, payload: WalletConnectSessionRequestPayload) {
    this.log('Session Request', { error, payload })

    const address = await this.wallet.ethGetAddress({ addressNList })
    if (address) {
      this.connector.approveSession({
        chainId: payload.params[0].chainId ?? 4,
        accounts: [address],
      })
    }
  }

  async _onSessionUpdate(error: Error | null, payload: any) {
    this.log('Session Update', { error, payload })
  }

  async _onConnect(error: Error | null, payload: any) {
    this.log('Connect', { error, payload })
  }

  async _onDisconnect(error: Error | null, payload: any) {
    this.log('Disconnect', { error, payload })
  }

  async _onCallRequest(error: Error | null, payload: WalletConnectCallRequest) {
    this.log('Call Request', { error, payload })

    this.options?.onCallRequest(payload)
  }

  public async approveRequest(
    request: WalletConnectCallRequest,
    approveData: Partial<
      WalletConnectCallRequestResponseMap[keyof WalletConnectCallRequestResponseMap]
    >,
  ) {
    const adapterManager = getChainAdapterManager()
    // TODO work for any chain (avalanche etc)
    const adapter = adapterManager.get(
      KnownChainIds.EthereumMainnet,
    ) as unknown as ethereum.ChainAdapter

    let result: any
    switch (request.method) {
      case 'eth_sign': {
        break
      }
      case 'eth_signTypedData': {
        break
      }
      case 'personal_sign': {
        const response = await this.wallet.ethSignMessage({
          ...approveData,
          addressNList,
          message: this.convertHexToUtf8IfPossible(request.params[0]),
        })
        result = response?.signature
        break
      }
      case 'eth_sendTransaction': {
        const tx = request.params[0]

        const gasFeeData = await adapter.getGasFeeData()

        const account = await adapter.getAccount(`${tx.from}`)
        const nonce = Web3.utils.toHex(account.chainSpecific.nonce)

        const gasPrice = Web3.utils.toHex((gasFeeData as any)[(approveData as any).speed].gasPrice)

        const sendData = {
          addressNList,
          chainId: 1,
          data: tx.data,
          gasLimit: (approveData as any).gasLimit ?? tx.gas,
          to: tx.to,
          value: tx.value,
          nonce,
          gasPrice: (approveData as any).gasPrice ?? tx.gasPrice ?? gasPrice,
        }

        const signedData = await this.wallet.ethSignTx?.(sendData)

        result = await adapter.broadcastTransaction(signedData?.serialized ?? '')
        break
      }
      case 'eth_signTransaction':
        {
          const tx = request.params[0]
          const response = await this.wallet.ethSignTx({
            addressNList,
            chainId: tx.chainId,
            data: tx.data,
            gasLimit: tx.gas,
            nonce: tx.nonce,
            to: tx.to,
            value: tx.value,
            ...approveData,
          })
          result = response?.serialized
        }
        break
      default:
    }

    if (result) {
      this.log('Approve Request', { request, result })
      this.connector.approveRequest({ id: request.id, result })
    } else {
      const message = 'JSON RPC method not supported'
      this.log('Reject Request (catch)', { request, message })
      this.connector.rejectRequest({ id: request.id, error: { message } })
    }
  }

  public async rejectRequest(request: WalletConnectCallRequest) {
    this.log('Reject Request', { request })
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
