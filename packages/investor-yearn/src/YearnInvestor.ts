import { JsonRpcProvider } from '@ethersproject/providers'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { Investor } from '@shapeshiftoss/investor'
import type { ChainTypes } from '@shapeshiftoss/types'
import { type ChainId, type VaultMetadata, Yearn } from '@yfi/sdk'
import { find } from 'lodash'
import filter from 'lodash/filter'
import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'

import { ssRouterAbi, ssRouterContractAddress } from './constants'
import { PreparedTransaction, YearnOpportunity } from './YearnOpportunity'

type ConstructorArgs = {
  chainAdapter: ChainAdapter<ChainTypes.Ethereum>
  dryRun?: true
  network?: ChainId
  providerUrl: string
}

export class YearnInvestor implements Investor<PreparedTransaction, VaultMetadata> {
  #deps: {
    chainAdapter: ChainAdapter<ChainTypes.Ethereum>
    contract: Contract
    dryRun?: true
    web3: Web3
    yearnSdk: Yearn<1>
  }
  #opportunities: YearnOpportunity[]

  constructor({ chainAdapter, dryRun, providerUrl, network = 1 }: ConstructorArgs) {
    const httpProvider = new Web3.providers.HttpProvider(providerUrl)
    const jsonRpcProvider = new JsonRpcProvider(providerUrl)

    const web3 = new Web3(httpProvider)
    this.#deps = Object.freeze({
      chainAdapter,
      contract: new web3.eth.Contract(ssRouterAbi, ssRouterContractAddress),
      dryRun,
      web3,
      yearnSdk: new Yearn(network, { provider: jsonRpcProvider })
    })
    this.#opportunities = []
  }

  async initialize() {
    await this.#deps.yearnSdk.ready
    this.#opportunities = (await this.#deps.yearnSdk.vaults.get()).map(
      (vault) => new YearnOpportunity(this.#deps, vault)
    )
  }

  async findAll() {
    return this.#opportunities
  }

  async findByOpportunityId(opportunityId: string) {
    return find(
      await this.findAll(),
      (opp: YearnOpportunity) => opp.positionAsset.assetId === opportunityId
    )
  }

  async findByUnderlyingAssetId(assetId: string) {
    return filter(await this.findAll(), { underlyingAsset: { assetId } })
  }
}
