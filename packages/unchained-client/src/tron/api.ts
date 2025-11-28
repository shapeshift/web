import { TronWeb } from 'tronweb'

import type { TronAccount, TronBlock, TronTx } from './types'

export interface TronApiConfig {
  rpcUrl: string
}

export class TronApi {
  private readonly rpcUrl: string
  private tronWeb: TronWeb | null = null
  private requestQueue: Promise<void> = Promise.resolve()
  private readonly minRequestInterval = 1_500

  constructor(config: TronApiConfig) {
    this.rpcUrl = config.rpcUrl
  }

  getRpcUrl(): string {
    return this.rpcUrl
  }

  private async throttle(): Promise<void> {
    // Queue the request and wait for all previous requests to complete
    const currentRequest = this.requestQueue.then(async () => {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval))
    })

    this.requestQueue = currentRequest
    await currentRequest
  }

  private getTronWeb(): TronWeb {
    if (!this.tronWeb) {
      this.tronWeb = new TronWeb({ fullHost: this.rpcUrl })
    }
    return this.tronWeb
  }

  async getAccount(params: { pubkey: string }): Promise<{
    balance: string
    unconfirmedBalance: string
    tokens?: { contractAddress: string; balance: string }[]
  }> {
    await this.throttle()

    const response = await fetch(`${this.rpcUrl}/wallet/getaccount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: params.pubkey, visible: true }),
    })

    const data: TronAccount = await response.json()

    const tokens: { contractAddress: string; balance: string }[] = []

    // Get TRC10 tokens from assetV2
    if (data.assetV2) {
      for (const [key, value] of Object.entries(data.assetV2)) {
        tokens.push({
          contractAddress: key,
          balance: String(value),
        })
      }
    }

    // Get TRC20 tokens from TronGrid API
    try {
      await this.throttle()

      const trc20Response = await fetch(`${this.rpcUrl}/v1/accounts/${params.pubkey}`)
      const trc20Data = await trc20Response.json()

      if (trc20Data.data?.[0]?.trc20 && Array.isArray(trc20Data.data[0].trc20)) {
        // trc20 is an array of objects like [{contractAddress: balance}, ...]
        trc20Data.data[0].trc20.forEach((tokenObj: Record<string, string | number>) => {
          for (const [contractAddress, balance] of Object.entries(tokenObj)) {
            tokens.push({
              contractAddress,
              balance: String(balance),
            })
          }
        })
      }
    } catch (err) {
      // TRC20 fetch failed, continue with just TRC10 tokens
      console.error('Failed to fetch TRC20 tokens:', err)
    }

    return {
      balance: data.balance ? String(data.balance) : '0',
      unconfirmedBalance: '0',
      tokens,
    }
  }

  async getTRC20Balance(params: { address: string; contractAddress: string }): Promise<string> {
    try {
      const tronWeb = await this.getTronWeb()
      const contract = await tronWeb.contract().at(params.contractAddress)
      const balance = await contract.balanceOf(params.address).call()
      return balance.toString()
    } catch (_err) {
      return '0'
    }
  }

  getTxHistory(_params: { pubkey: string; pageSize?: number; cursor?: string }): Promise<{
    txs: TronTx[]
    cursor?: string
  }> {
    throw new Error('Transaction history is not supported for TRON')
  }

  async getTransaction(params: { txid: string }): Promise<TronTx | null> {
    await this.throttle()

    const response = await fetch(`${this.rpcUrl}/wallet/gettransactionbyid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: params.txid, visible: true }),
    })

    if (!response.ok) {
      return null
    }

    const tx = await response.json()

    if (!tx || !tx.txID) {
      return null
    }

    return {
      ...tx,
      txid: tx.txID,
      blockHash: '',
      blockHeight: 0,
      timestamp: 0,
      confirmations: 0,
      value: '0',
      fee: '0',
    }
  }

  async getBlock(params: { height: number }): Promise<TronBlock | null> {
    await this.throttle()

    const response = await fetch(`${this.rpcUrl}/wallet/getblockbynum`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ num: params.height }),
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  }

  async sendTx(params: { sendTxBody: { hex: string } }): Promise<string> {
    const tronWeb = this.getTronWeb()

    try {
      const signedTxJson = JSON.parse(params.sendTxBody.hex)

      const result = await tronWeb.trx.sendRawTransaction(signedTxJson)

      if (!result.result) {
        throw new Error(
          result.message || JSON.stringify(result) || 'Failed to broadcast transaction',
        )
      }

      const txid = result.txid || result.transaction?.txID

      if (!txid) {
        throw new Error('Transaction ID not found in broadcast result')
      }

      return txid
    } catch (error) {
      throw new Error(`Failed to broadcast TRON transaction: ${error}`)
    }
  }

  private async getChainPrices(): Promise<{
    bandwidthPrice: number
    energyPrice: number
  }> {
    try {
      const tronWeb = await this.getTronWeb()
      const params = await tronWeb.trx.getChainParameters()
      const bandwidthPrice = params.find(p => p.key === 'getTransactionFee')?.value ?? 1000
      const energyPrice = params.find(p => p.key === 'getEnergyFee')?.value ?? 420
      return { bandwidthPrice, energyPrice }
    } catch (_err) {
      return { bandwidthPrice: 1000, energyPrice: 420 }
    }
  }

  async estimateFees(params: { estimateFeesBody: { serializedTx: string } }): Promise<string> {
    try {
      const { bandwidthPrice } = await this.getChainPrices()
      const rawDataBytes = Buffer.from(params.estimateFeesBody.serializedTx, 'hex').length
      const signatureBytes = 65
      const totalBytes = rawDataBytes + signatureBytes

      const feeInSun = totalBytes * bandwidthPrice
      return String(feeInSun)
    } catch (err) {
      throw new Error(`Failed to estimate fees: ${err}`)
    }
  }

  async estimateTRC20TransferFee(params: {
    contractAddress: string
    from: string
    to: string
    amount: string
  }): Promise<string> {
    try {
      const tronWeb = await this.getTronWeb()
      const { energyPrice } = await this.getChainPrices()

      const result = await tronWeb.transactionBuilder.triggerConstantContract(
        params.contractAddress,
        'transfer(address,uint256)',
        {},
        [
          { type: 'address', value: params.to },
          { type: 'uint256', value: params.amount },
        ],
        params.from,
      )

      const energyUsed = result.energy_used ?? 0
      const feeInSun = energyUsed * energyPrice

      return String(feeInSun)
    } catch (_err) {
      return '31000000'
    }
  }

  async getPriorityFees(): Promise<{
    baseFee: string
    fast: string
    average: string
    slow: string
    estimatedBandwidth: string
  }> {
    try {
      const { bandwidthPrice } = await this.getChainPrices()
      const estimatedBytes = 268
      const baseFee = String(estimatedBytes * bandwidthPrice)

      return {
        baseFee,
        fast: baseFee,
        average: baseFee,
        slow: baseFee,
        estimatedBandwidth: String(estimatedBytes),
      }
    } catch (_err) {
      const defaultFee = '268000'
      return {
        baseFee: defaultFee,
        fast: defaultFee,
        average: defaultFee,
        slow: defaultFee,
        estimatedBandwidth: '268',
      }
    }
  }
}
