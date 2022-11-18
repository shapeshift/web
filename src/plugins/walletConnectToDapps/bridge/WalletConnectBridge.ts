import type { ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter, EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import * as core from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import WalletConnect from '@walletconnect/client'
import type { IWalletConnectSession } from '@walletconnect/types'
import { convertHexToUtf8 } from '@walletconnect/utils'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

// import { logger } from 'lib/logger'
import type {
  WalletConnectCallRequest,
  WalletConnectCallRequestResponseMap,
  WalletConnectSessionRequestPayload,
} from './types'

const addressNList = core.bip32ToAddressNList("m/44'/60'/0'/0/0")

export type HDWalletWCBridgeOptions = {
  onCallRequest(request: WalletConnectCallRequest): void
}

// const moduleLogger = logger.child({ namespace: ['WalletConnectBridge'] })

export class WalletConnectBridge {
  chainAdapter: ChainAdapter<KnownChainIds>
  constructor(
    private wallet: core.ETHWallet,
    public readonly connector: WalletConnect,
    private chainId: ChainId,
    private account: string | null,
    private readonly options?: HDWalletWCBridgeOptions,
  ) {
    this.chainAdapter = getChainAdapterManager().get(chainId) as ChainAdapter<KnownChainIds>
  }

  static fromURI(
    uri: string,
    wallet: core.ETHWallet,
    chainId: ChainId,
    account: string | null,
    options?: HDWalletWCBridgeOptions,
  ) {
    return new WalletConnectBridge(wallet, new WalletConnect({ uri }), chainId, account, options)
  }

  static fromSession(
    session: IWalletConnectSession,
    wallet: core.ETHWallet,
    chainId: ChainId,
    account: string | null,
    options?: HDWalletWCBridgeOptions,
  ) {
    return new WalletConnectBridge(
      wallet,
      new WalletConnect({ session }),
      chainId,
      account,
      options,
    )
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
    // moduleLogger.log('Session Request', { error })

    const address = this.account ?? (await this.wallet.ethGetAddress({ addressNList }))
    if (address) {
      this.connector.approveSession({
        chainId: parseInt(fromChainId(this.chainId).chainReference),
        accounts: [address],
      })
    }
  }

  async updateSession({
    chainId,
    wallet,
    account,
  }: {
    chainId: ChainId
    wallet: core.ETHWallet
    account?: string
  }) {
    this.wallet = wallet
    this.chainId = chainId
    this.account = account ?? null
    this.chainAdapter = getChainAdapterManager().get(chainId) as ChainAdapter<KnownChainIds>
    const address = account ?? (await wallet.ethGetAddress({ addressNList }))
    if (address) {
      this.connector.updateSession({
        chainId: parseInt(fromChainId(chainId).chainReference),
        accounts: [address],
      })
    }
  }

  async _onSessionUpdate(error: Error | null, payload: any) {
    // moduleLogger.info("Session Update", { error, payload });
  }

  async _onConnect(error: Error | null, payload: any) {
    // moduleLogger.info("Connect", { error, payload })
  }

  async _onDisconnect(error: Error | null, payload: any) {
    // moduleLogger.info("Disconnect", { error, payload });
  }

  async _onCallRequest(error: Error | null, payload: WalletConnectCallRequest) {
    // moduleLogger.info("Call Request", { error, payload });

    this.options?.onCallRequest(payload)
  }

  public async approveRequest(
    request: WalletConnectCallRequest,
    approveData?: Partial<
      WalletConnectCallRequestResponseMap[keyof WalletConnectCallRequestResponseMap]
    >,
  ) {
    let result: any
    // console.info(request, approveData);
    switch (request.method) {
      case 'eth_sign': {
        result = await this.signMessage(this.convertHexToUtf8IfPossible(request.params[1]))
        break
      }
      case 'eth_signTypedData': {
        result = await this.signMessage(request.params[1])
        break
      }
      case 'personal_sign': {
        result = await this.signMessage(this.convertHexToUtf8IfPossible(request.params[0]))
        break
      }
      case 'eth_sendTransaction': {
        const tx = request.params[0]
        const response = await this.wallet.ethSendTx?.({
          addressNList,
          chainId: parseInt(fromChainId(this.chainId).chainReference),
          data: tx.data,
          gasLimit: tx.gas,
          nonce: tx.nonce,
          to: tx.to,
          value: tx.value,
          ...approveData,
        })
        result = response?.hash
        break
      }
      case 'eth_signTransaction': {
        const tx = request.params[0]
        const response = await this.wallet.ethSignTx({
          addressNList,
          chainId: parseInt(fromChainId(this.chainId).chainReference),
          data: tx.data,
          gasLimit: tx.gas,
          nonce: tx.nonce,
          to: tx.to,
          value: tx.value,
          ...approveData,
        })
        result = response?.serialized
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

  public async rejectRequest(request: WalletConnectCallRequest) {
    // moduleLogger.info("Reject Request", { request })
    this.connector.rejectRequest({ id: request.id, error: { message: 'Rejected by user' } })
  }

  async signMessage(message: string) {
    return await (this.chainAdapter as unknown as EvmBaseAdapter<EvmChainId>).signMessage({
      messageToSign: {
        addressNList,
        message,
      },
      wallet: this.wallet,
    })
  }

  private convertHexToUtf8IfPossible(hex: string) {
    try {
      return convertHexToUtf8(hex)
    } catch (e) {
      return hex
    }
  }
}
