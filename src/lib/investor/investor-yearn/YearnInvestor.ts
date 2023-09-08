import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { type ChainId, type VaultMetadata, Yearn } from '@yfi/sdk'
import { ethers } from 'ethers'
import { find } from 'lodash'
import filter from 'lodash/filter'
import Web3 from 'web3'
import type { Contract } from 'web3-eth-contract'
import type { Investor } from 'lib/investor'

import { ssRouterAbi, ssRouterContractAddress } from './constants'
import type { PreparedTransaction } from './YearnOpportunity'
import { YearnOpportunity } from './YearnOpportunity'

type ConstructorArgs = {
  chainAdapter: ChainAdapter<KnownChainIds.EthereumMainnet>
  dryRun?: true
  network?: ChainId
  providerUrl: string
}

export class YearnInvestor implements Investor<PreparedTransaction, VaultMetadata> {
  readonly #deps: {
    chainAdapter: ChainAdapter<KnownChainIds.EthereumMainnet>
    contract: Contract
    dryRun?: true
    web3: Web3
    yearnSdk: Yearn<1>
  }
  #opportunities: YearnOpportunity[]

  constructor({ chainAdapter, dryRun, providerUrl, network = 1 }: ConstructorArgs) {
    const httpProvider = new Web3.providers.HttpProvider(providerUrl)
    const jsonRpcProvider = new ethers.providers.JsonRpcBatchProvider(providerUrl)

    const web3 = new Web3(httpProvider)
    this.#deps = Object.freeze({
      chainAdapter,
      contract: new web3.eth.Contract(ssRouterAbi, ssRouterContractAddress),
      dryRun,
      web3,
      yearnSdk: new Yearn(network, { provider: jsonRpcProvider }),
    })
    this.#opportunities = []
  }

  async initialize() {
    await this.#deps.yearnSdk.ready
    this.#opportunities = (await this.#deps.yearnSdk.vaults.get()).map(
      vault => new YearnOpportunity(this.#deps, vault),
    )
  }

  findAll() {
    return Promise.resolve(this.#opportunities)
  }

  async findByOpportunityId(opportunityId: string) {
    return find(
      await this.findAll(),
      (opp: YearnOpportunity) => opp.positionAsset.assetId === opportunityId,
    )
  }

  async findByUnderlyingAssetId(assetId: string) {
    return filter(await this.findAll(), { underlyingAsset: { assetId } })
  }
}
