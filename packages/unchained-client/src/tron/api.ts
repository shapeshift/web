import type { Types } from 'tronweb'
import { TronWeb } from 'tronweb'

import type { TronAccount, TronBlock, TronTx } from './types'

// tronweb's TransactionWrapper omits transaction.ret, which is where a simulated revert is reported
type SimulationResult = Omit<Types.TransactionWrapper, 'transaction'> & {
  transaction?: Partial<Types.TransactionWrapper['transaction']> & { ret?: { ret?: string }[] }
}

const PRECISION_READ_TIMEOUT_MS = 10_000

export interface TronApiConfig {
  rpcUrl: string
  apiKey?: string
}

// How a contract's energy is split between the caller and its deployer
export type TronContractEnergyShare = {
  // consume_user_resource_percent: the slice the caller always pays
  callerPercent: number
  // origin_energy_limit: the most the deployer covers on a single call
  originEnergyLimit: number
  // energy the deployer currently has staked and unspent
  originEnergyAvailable: number
}

const TRON_CALLER_PAYS_ALL: TronContractEnergyShare = {
  callerPercent: 100,
  originEnergyLimit: 0,
  originEnergyAvailable: 0,
}

type TronContract = {
  consume_user_resource_percent?: number
  origin_energy_limit?: number
  origin_address?: string
}

// java-tron reads a stored zero, which TronGrid omits, as this creator default
const TRON_CREATOR_DEFAULT_ENERGY_LIMIT = 10_000_000
// A deployer's unspent energy moves slowly next to how often the swappers re-estimate
const TRON_ORIGIN_ENERGY_TTL_MS = 15_000
// A deployer can raise the caller's share after deployment, so the split is re-read within the minute
const TRON_CONTRACT_TTL_MS = 60_000

// The deployer covers the rest only out of what they have staked, so a dry deployer (Tether) leaves the caller paying in full
export const getCallerEnergy = (energyUsed: number, share: TronContractEnergyShare): number => {
  const originShare = Math.floor((energyUsed * (100 - share.callerPercent)) / 100)
  const originCovered = Math.max(
    0,
    Math.min(originShare, share.originEnergyLimit, share.originEnergyAvailable),
  )

  return energyUsed - originCovered
}

export class TronApi {
  private readonly rpcUrl: string
  private readonly apiKey: string
  private tronWeb: TronWeb | null = null
  private readonly contracts = new Map<string, { readAt: number; value: Promise<TronContract> }>()
  private readonly originEnergy = new Map<string, { readAt: number; value: Promise<number> }>()
  private requestQueue: Promise<void> = Promise.resolve()
  private readonly minRequestInterval = 1_500

  constructor(config: TronApiConfig) {
    this.rpcUrl = config.rpcUrl
    this.apiKey = config.apiKey ?? ''
  }

  getRpcUrl(): string {
    return this.rpcUrl
  }

  private get tronGridHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'TRON-PRO-API-KEY': this.apiKey } : {}),
    }
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
      this.tronWeb = new TronWeb({
        fullHost: this.rpcUrl,
        headers: this.apiKey ? { 'TRON-PRO-API-KEY': this.apiKey } : {},
      })
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
      headers: this.tronGridHeaders,
      body: JSON.stringify({ address: params.pubkey, visible: true }),
    })

    const data: TronAccount = await response.json()

    const tokens: { contractAddress: string; balance: string }[] = []

    // Get TRC10 tokens from assetV2
    if (data.assetV2) {
      data.assetV2.forEach(token => {
        tokens.push({
          contractAddress: token.key,
          balance: String(token.value),
        })
      })
    }

    // Get TRC20 tokens from TronGrid API
    try {
      await this.throttle()

      const trc20Response = await fetch(`${this.rpcUrl}/v1/accounts/${params.pubkey}`, {
        headers: this.tronGridHeaders,
      })
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
      } else if (!trc20Data.data || trc20Data.data.length === 0) {
        // Non-activated account: /v1/accounts returns data:[] for addresses that have never sent TRX.
        // Fall back to discovering TRC20 balances via received transactions + hardcoded top tokens.
        try {
          await this.throttle()

          const HARDCODED_TOP_TOKENS = [
            'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT
            'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', // USDC
          ]

          const MAX_FALLBACK_CONTRACTS = 20
          const discoveredContracts = new Set<string>(HARDCODED_TOP_TOKENS)

          const trc20TxResponse = await fetch(
            `${this.rpcUrl}/v1/accounts/${params.pubkey}/transactions/trc20?limit=200&only_to=true`,
            { headers: this.tronGridHeaders },
          )

          if (trc20TxResponse.ok) {
            const trc20TxData = await trc20TxResponse.json()

            if (trc20TxData.data && Array.isArray(trc20TxData.data)) {
              trc20TxData.data.forEach((tx: { token_info?: { address?: string } }) => {
                const contractAddress = tx.token_info?.address
                if (contractAddress) discoveredContracts.add(contractAddress)
              })
            }
          }

          for (const contractAddress of Array.from(discoveredContracts).slice(
            0,
            MAX_FALLBACK_CONTRACTS,
          )) {
            await this.throttle()
            await this.getTrc20Balance({ contractAddress, address: params.pubkey })
              .then(balance => {
                if (balance !== '0') tokens.push({ contractAddress, balance })
              })
              .catch(() => undefined)
          }
        } catch (fallbackErr) {
          console.error('Failed TRC20 fallback discovery for non-activated TRON account', {
            address: `${params.pubkey.slice(0, 6)}...${params.pubkey.slice(-4)}`,
            error: fallbackErr,
          })
        }
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

  async getTrc20Decimals(params: { contractAddress: string }): Promise<number | undefined> {
    try {
      const tronWeb = this.getTronWeb()
      const result: SimulationResult = await tronWeb.transactionBuilder.triggerConstantContract(
        params.contractAddress,
        'decimals()',
        {},
        [],
        params.contractAddress,
      )

      const [decimalsHex] = result.constant_result ?? []
      if (this.isReverted(result) || !decimalsHex) return

      // decimals() is a uint8; anything larger is a contract answering something else
      const decimals = Number(BigInt(`0x${decimalsHex}`))
      return decimals > 255 ? undefined : decimals
    } catch (err) {
      console.error(`[tron] failed to read decimals of ${params.contractAddress}`, err)
      return
    }
  }

  async getTrc10Precision(params: { id: string }): Promise<number | undefined> {
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), PRECISION_READ_TIMEOUT_MS)

    try {
      const response = await fetch(`${this.rpcUrl}/v1/assets/${params.id}`, {
        headers: this.tronGridHeaders,
        signal: abort.signal,
      })

      const data: { data?: { precision?: number }[] } = await response.json()
      return data.data?.[0]?.precision
    } catch (err) {
      console.error(`[tron] failed to read precision of trc10 ${params.id}`, err)
      return
    } finally {
      clearTimeout(timer)
    }
  }

  async getTrc20Balance(params: { contractAddress: string; address: string }): Promise<string> {
    const result = await this.getTronWeb().transactionBuilder.triggerConstantContract(
      params.contractAddress,
      'balanceOf(address)',
      {},
      [{ type: 'address', value: params.address }],
      params.address,
    )

    const [balance] = result.constant_result ?? []
    if (!balance) throw new Error('[tron] balanceOf call returned no data')

    return BigInt(`0x${balance}`).toString()
  }

  // A direct selector call - contract().at() would first fetch the ABI, doubling the requests
  async getTrc20Allowance(params: {
    contractAddress: string
    owner: string
    spender: string
  }): Promise<string> {
    const tronWeb = this.getTronWeb()

    const result = await tronWeb.transactionBuilder.triggerConstantContract(
      params.contractAddress,
      'allowance(address,address)',
      {},
      [
        { type: 'address', value: params.owner },
        { type: 'address', value: params.spender },
      ],
      params.owner,
    )

    const [allowance] = result.constant_result ?? []
    if (!allowance) throw new Error('[tron] allowance call returned no data')

    return BigInt(`0x${allowance}`).toString()
  }

  // Accounts exist on-chain only once they have received TRX; a fresh address returns {}
  async isAccountActivated(address: string): Promise<boolean> {
    const response = await fetch(`${this.rpcUrl}/wallet/getaccount`, {
      method: 'POST',
      headers: this.tronGridHeaders,
      body: JSON.stringify({ address, visible: true }),
    })

    if (!response.ok) throw new Error(`[tron] getaccount failed: ${response.status}`)

    const data: TronAccount = await response.json()

    return !!data.address
  }

  getTxHistory(_params: { pubkey: string; pageSize?: number; cursor?: string }): Promise<{
    txs: TronTx[]
    cursor?: string
  }> {
    throw new Error('Transaction history is not supported for TRON')
  }

  async getTransaction(params: { txid: string }): Promise<TronTx | null> {
    await this.throttle()

    const [txResponse, infoResponse] = await Promise.all([
      fetch(`${this.rpcUrl}/wallet/gettransactionbyid`, {
        method: 'POST',
        headers: this.tronGridHeaders,
        body: JSON.stringify({ value: params.txid, visible: true }),
      }),
      fetch(`${this.rpcUrl}/wallet/gettransactioninfobyid`, {
        method: 'POST',
        headers: this.tronGridHeaders,
        body: JSON.stringify({ value: params.txid, visible: true }),
      }),
    ])

    if (!txResponse.ok) return null

    const tx = await txResponse.json()
    if (!tx || !tx.txID) return null

    let blockNumber = 0
    let blockTimeStamp = 0
    let fee = '0'
    let log: { address: string; topics: string[]; data: string }[] = []
    let internal_transactions: {
      hash: string
      caller_address: string
      transferTo_address: string
      callValueInfo: { callValue?: number; tokenId?: string }[]
      note: string
      rejected?: boolean
    }[] = []

    if (infoResponse.ok) {
      const info = await infoResponse.json()
      blockNumber = info.blockNumber || 0
      blockTimeStamp = info.blockTimeStamp || 0
      fee = info.fee ? String(info.fee) : '0'
      log = info.log || []
      internal_transactions = info.internal_transactions || []
    }

    return {
      ...tx,
      txid: tx.txID,
      blockHash: '',
      blockHeight: blockNumber,
      timestamp: blockTimeStamp,
      confirmations: blockNumber > 0 ? 1 : 0,
      value: '0',
      fee,
      log,
      internal_transactions,
    }
  }

  async getBlock(params: { height: number }): Promise<TronBlock | null> {
    await this.throttle()

    const response = await fetch(`${this.rpcUrl}/wallet/getblockbynum`, {
      method: 'POST',
      headers: this.tronGridHeaders,
      body: JSON.stringify({ num: params.height }),
    })

    if (!response.ok) return null

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
      if (!txid) throw new Error('Transaction ID not found in broadcast result')

      return txid
    } catch (error) {
      throw new Error(`Failed to broadcast TRON transaction: ${error}`)
    }
  }

  async getChainPrices(): Promise<{
    bandwidthPrice: number
    energyPrice: number
    memoFee: number
  }> {
    const params = await this.getTronWeb().trx.getChainParameters()

    const param = (key: string): number => {
      const value = params.find(p => p.key === key)?.value
      if (value === undefined) throw new Error(`[tron] chain parameter ${key} missing`)
      return value
    }

    return {
      bandwidthPrice: param('getTransactionFee'),
      energyPrice: param('getEnergyFee'),
      memoFee: param('getMemoFee'),
    }
  }

  // A plain address answers getcontract with {} and pays in full
  async getContractEnergyShare(contractAddress: string): Promise<TronContractEnergyShare> {
    const contract = await this.getContract(contractAddress)
    if (!contract.origin_address) return TRON_CALLER_PAYS_ALL

    // TronGrid omits zero-valued fields, so a contract whose deployer pays everything carries no percent at all
    const callerPercent = contract.consume_user_resource_percent ?? 0
    if (callerPercent >= 100) return TRON_CALLER_PAYS_ALL

    return {
      callerPercent,
      originEnergyLimit: contract.origin_energy_limit || TRON_CREATOR_DEFAULT_ENERGY_LIMIT,
      originEnergyAvailable: await this.getOriginEnergyAvailable(contract.origin_address),
    }
  }

  private getContract(contractAddress: string): Promise<TronContract> {
    const cached = this.contracts.get(contractAddress)
    if (cached && Date.now() - cached.readAt < TRON_CONTRACT_TTL_MS) return cached.value

    const value = this.post<TronContract & { Error?: string }>('/wallet/getcontract', {
      value: contractAddress,
      visible: true,
    })
      .then(body => {
        if (body.Error) throw new Error(`[tron] getcontract failed: ${body.Error}`)
        // only a contract record is worth keeping; an empty body is re-read next time
        if (!body.origin_address && this.contracts.get(contractAddress)?.value === value) {
          this.contracts.delete(contractAddress)
        }
        return body
      })
      .catch(err => {
        if (this.contracts.get(contractAddress)?.value === value) {
          this.contracts.delete(contractAddress)
        }
        throw err
      })

    this.contracts.set(contractAddress, { readAt: Date.now(), value })

    return value
  }

  // A failed share lookup prices the simulation as if the caller paid in full, unless the caller must not guess
  private async getPricingContext(contractAddress: string, requireEnergyShare = false) {
    const [{ energyPrice }, share] = await Promise.all([
      this.getChainPrices(),
      this.getContractEnergyShare(contractAddress).catch((error: unknown) => {
        if (requireEnergyShare) throw error

        console.warn(
          `[tron] energy share lookup failed for ${contractAddress}, pricing in full`,
          error,
        )
        return TRON_CALLER_PAYS_ALL
      }),
    ])

    return { energyPrice, share }
  }

  private getOriginEnergyAvailable(originAddress: string): Promise<number> {
    const cached = this.originEnergy.get(originAddress)
    if (cached && Date.now() - cached.readAt < TRON_ORIGIN_ENERGY_TTL_MS) return cached.value

    const value = this.post<{ EnergyLimit?: number; EnergyUsed?: number; Error?: string }>(
      '/wallet/getaccountresource',
      { address: originAddress, visible: true },
    )
      .then(body => {
        if (body.Error) throw new Error(`[tron] getaccountresource failed: ${body.Error}`)
        return Math.max(0, (body.EnergyLimit ?? 0) - (body.EnergyUsed ?? 0))
      })
      .catch(err => {
        if (this.originEnergy.get(originAddress)?.value === value) {
          this.originEnergy.delete(originAddress)
        }
        throw err
      })

    this.originEnergy.set(originAddress, { readAt: Date.now(), value })

    return value
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.rpcUrl}${path}`, {
      method: 'POST',
      headers: this.tronGridHeaders,
      body: JSON.stringify(body),
    })

    if (!response.ok) throw new Error(`[tron] ${path} failed: ${response.status}`)

    return response.json()
  }

  async estimateTrc20TransferFee(params: {
    contractAddress: string
    from: string
    to: string
    amount: string
    requireEnergyShare?: boolean
  }): Promise<string> {
    const tronWeb = this.getTronWeb()
    const { energyPrice, share } = await this.getPricingContext(
      params.contractAddress,
      params.requireEnergyShare,
    )

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

    const energy = this.getSimulatedEnergy(result, 'trc20 transfer')

    return String(getCallerEnergy(energy, share) * energyPrice)
  }

  async estimateContractCallFee(params: {
    contractAddress: string
    from: string
    data: string
    callValue?: string
    requireEnergyShare?: boolean
  }): Promise<string> {
    const { energyPrice, share } = await this.getPricingContext(
      params.contractAddress,
      params.requireEnergyShare,
    )

    const response = await fetch(`${this.rpcUrl}/wallet/triggerconstantcontract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.tronGridHeaders },
      body: JSON.stringify({
        owner_address: params.from,
        contract_address: params.contractAddress,
        data: params.data.startsWith('0x') ? params.data.slice(2) : params.data,
        call_value: Number(params.callValue) || 0,
        visible: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`[tron] contract call simulation request failed: ${response.status}`)
    }

    const result: SimulationResult = await response.json()
    const energy = this.getSimulatedEnergy(result, 'contract call')

    return String(getCallerEnergy(energy, share) * energyPrice)
  }

  // A revert still reports result.result: true - the failure is only visible on the transaction's ret
  private isReverted(result: SimulationResult): boolean {
    const failed = result.transaction?.ret?.some(ret => ret.ret === 'FAILED')
    return result.result?.result !== true || Boolean(failed)
  }

  // Trusting a revert's partial energy would underestimate
  private getSimulatedEnergy(result: SimulationResult, label: string): number {
    if (this.isReverted(result) || !result.energy_used) {
      throw new Error(
        `[tron] ${label} simulation failed: ${result.result?.message ?? 'unknown error'}`,
      )
    }

    return result.energy_used
  }
}
