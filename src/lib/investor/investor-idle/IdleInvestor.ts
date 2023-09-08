import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
// import https from 'https'
import { find } from 'lodash'
import filter from 'lodash/filter'
import Web3 from 'web3'
import type { Contract } from 'web3-eth-contract'

import type { Investor } from '../../investor'
import type { IdleVault } from './constants'
import { ssRouterAbi } from './constants'
import { ssRouterContractAddress } from './constants/router-contract'
import type { PreparedTransaction } from './IdleOpportunity'
import { IdleOpportunity } from './IdleOpportunity'
import { IdleSdk } from './IdleSdk'

type ConstructorArgs = {
  chainAdapter: ChainAdapter<KnownChainIds.EthereumMainnet>
  dryRun?: true
  network?: number
  providerUrl: string
}

const idleSdk = new IdleSdk()

export class IdleInvestor implements Investor<PreparedTransaction, IdleVault> {
  readonly #deps: {
    chainAdapter: ChainAdapter<KnownChainIds.EthereumMainnet>
    dryRun?: true
    contract: Contract
    network?: number
    web3: Web3
  }
  #opportunities: IdleOpportunity[]

  constructor({ chainAdapter, dryRun, providerUrl, network = 1 }: ConstructorArgs) {
    const httpProvider = new Web3.providers.HttpProvider(providerUrl)
    // const jsonRpcProvider = new JsonRpcProvider(providerUrl)
    const web3 = new Web3(httpProvider)
    const contract = new web3.eth.Contract(ssRouterAbi, ssRouterContractAddress)
    this.#deps = Object.freeze({
      chainAdapter,
      contract,
      network,
      dryRun,
      web3,
    })
    this.#opportunities = []
  }

  async initialize() {
    const vaults: IdleVault[] = await idleSdk.getVaults()
    this.#opportunities = vaults.map(vault => new IdleOpportunity(this.#deps, vault))
  }

  findAll() {
    return Promise.resolve(this.#opportunities)
  }

  async findByOpportunityId(opportunityId: string) {
    return find(
      await this.findAll(),
      (opp: IdleOpportunity) => opp.positionAsset.assetId === opportunityId,
    )
  }

  async findByUnderlyingAssetId(assetId: string) {
    return filter(await this.findAll(), { underlyingAsset: { assetId } })
  }
}
