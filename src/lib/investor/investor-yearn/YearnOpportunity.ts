import { toAssetId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import type { Yearn } from '@yfi/sdk'
import { type ChainId, type Vault, type VaultMetadata } from '@yfi/sdk'
import type { BigNumber } from 'bignumber.js'
import isNil from 'lodash/isNil'
import toLower from 'lodash/toLower'
import type Web3 from 'web3'
import type { Contract } from 'web3-eth-contract'
import { numberToHex } from 'web3-utils'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type {
  ApprovalRequired,
  DepositWithdrawArgs,
  FeePriority,
  InvestorOpportunity,
} from 'lib/investor'
import { MAX_ALLOWANCE } from 'lib/investor'
import { erc20Abi } from 'lib/investor/constants'

import { ssRouterContractAddress, yv2VaultAbi } from './constants'

type YearnOpportunityDeps = {
  chainAdapter: ChainAdapter<KnownChainIds.EthereumMainnet>
  contract: Contract
  dryRun?: true
  web3: Web3
  yearnSdk: Yearn<1>
}

export type PreparedTransaction = {
  chainId: number
  data: string
  estimatedGas: BigNumber
  gasPrice: BigNumber
  nonce: string
  to: string
  value: '0'
}

const feeMultiplier: Record<FeePriority, number> = Object.freeze({
  fast: 1,
  average: 0.8,
  slow: 0.5,
})

export class YearnOpportunity
  implements
    InvestorOpportunity<PreparedTransaction, VaultMetadata>,
    ApprovalRequired<PreparedTransaction>
{
  readonly #internals: {
    chainAdapter: ChainAdapter<KnownChainIds.EthereumMainnet>
    dryRun?: true
    routerContract: Contract
    vault: Vault
    web3: Web3
    yearn: Yearn<ChainId>
  }
  public readonly apy: BigNumber
  public readonly displayName: string
  public readonly version: string
  public readonly symbol: string
  public readonly name: string
  public readonly id: string
  public readonly isApprovalRequired = true
  public readonly isNew: boolean
  public readonly metadata: VaultMetadata
  public readonly underlyingAsset: { assetId: string; balance: BigNumber }
  public readonly positionAsset: {
    assetId: string
    balance: BigNumber
    underlyingPerPosition: BigNumber
  }
  public readonly expired: boolean
  public readonly feeAsset: { assetId: string }
  public readonly supply: BigNumber
  public readonly tvl: {
    assetId: string
    balance: BigNumber
    balanceUsdc: BigNumber
  }

  constructor(deps: YearnOpportunityDeps, vault: Vault) {
    this.#internals = {
      chainAdapter: deps.chainAdapter,
      dryRun: deps.dryRun,
      routerContract: deps.contract,
      vault,
      web3: deps.web3,
      yearn: deps.yearnSdk,
    }

    this.id = toLower(vault.address)
    this.metadata = vault.metadata
    this.displayName = vault.metadata.displayName || vault.name
    this.version = vault.version
    this.symbol = vault.symbol
    this.apy = bnOrZero(vault.metadata.apy?.net_apy)
    this.isNew = vault.metadata.apy?.type === 'new'
    this.name = `${vault.metadata.displayName} ${vault.version}`
    this.expired =
      vault.metadata.depositsDisabled ||
      bnOrZero(vault.metadata.depositLimit).lte(0) ||
      vault.metadata.migrationAvailable
    // @TODO TotalSupply from the API awas 0
    this.supply = bnOrZero(vault.metadata.totalSupply)
    this.tvl = {
      balance: bnOrZero(vault.underlyingTokenBalance.amount),
      balanceUsdc: bnOrZero(vault.underlyingTokenBalance.amountUsdc),
      assetId: toAssetId({
        chainId: 'eip155:1',
        assetNamespace: 'erc20',
        assetReference: vault.tokenId || vault.token,
      }),
    }
    this.underlyingAsset = {
      balance: bn(0),
      assetId: toAssetId({
        chainId: 'eip155:1',
        assetNamespace: 'erc20',
        assetReference: vault.tokenId || vault.token,
      }),
    }
    this.positionAsset = {
      balance: bn(0),
      assetId: toAssetId({
        chainId: 'eip155:1',
        assetNamespace: 'erc20',
        assetReference: this.id,
      }),
      underlyingPerPosition: bnOrZero(vault.metadata.pricePerShare),
    }
    this.feeAsset = {
      assetId: 'eip155:1/slip44:60',
    }
  }

  private checksumAddress(address: string): string {
    return this.#internals.web3.utils.toChecksumAddress(address)
  }

  /**
   * From the token contract address and vault address, we need to get the vault id. The router
   * contract needs the vault id to know which vault it is dealing with when depositing, since it
   * takes a token address and a vault id.
   */
  private async getVaultId({
    underlyingAssetAddress,
    vaultAddress,
  }: {
    underlyingAssetAddress: string
    vaultAddress: string
  }): Promise<number> {
    const numVaults = await this.#internals.routerContract.methods
      .numVaults(this.checksumAddress(underlyingAssetAddress))
      .call()
    let id: number | null = null
    for (let i = 0; i <= numVaults && isNil(id); i++) {
      const result = await this.#internals.routerContract.methods
        .vaults(this.checksumAddress(underlyingAssetAddress), i)
        .call()
      if (result === this.checksumAddress(vaultAddress)) id = i
    }
    if (isNil(id))
      throw new Error(
        `Could not find vault id for token: ${underlyingAssetAddress} vault: ${vaultAddress}`,
      )
    return id
  }

  async signAndBroadcast(input: {
    wallet: HDWallet
    tx: PreparedTransaction
    feePriority?: FeePriority
    bip44Params: BIP44Params
  }): Promise<string> {
    const { bip44Params, wallet, tx, feePriority } = input

    if (!bip44Params) throw new Error('bip44Params required for signAndBroadcast')

    const feeSpeed: FeePriority = feePriority ? feePriority : 'fast'
    const chainAdapter = this.#internals.chainAdapter

    const gasPrice = numberToHex(bnOrZero(tx.gasPrice).times(feeMultiplier[feeSpeed]).toString())
    const txToSign: ETHSignTx = {
      ...tx,
      gasPrice,
      // Gas limit safety factor of 50% to prevent out of gas errors on chain.
      gasLimit: numberToHex(tx.estimatedGas.times(1.5).integerValue().toString()),
      nonce: numberToHex(tx.nonce),
      value: numberToHex(tx.value),
      addressNList: toAddressNList(bip44Params),
    }

    if (wallet.supportsOfflineSigning()) {
      const signedTx = await chainAdapter.signTransaction({ txToSign, wallet })
      if (this.#internals.dryRun) return signedTx
      return chainAdapter.broadcastTransaction(signedTx)
    } else if (wallet.supportsBroadcast() && chainAdapter.signAndBroadcastTransaction) {
      if (this.#internals.dryRun) {
        throw new Error(`Cannot perform a dry run with wallet of type ${wallet.getVendor()}`)
      }
      return chainAdapter.signAndBroadcastTransaction({ txToSign, wallet })
    } else {
      throw new Error('Invalid HDWallet configuration')
    }
  }

  async prepareDeposit(input: DepositWithdrawArgs): Promise<PreparedTransaction> {
    const { address, amount } = input

    // In order to properly earn affiliate revenue, we must deposit to the vault through the SS
    // router contract. This is not necessary for withdraws. We can withdraw directly from the vault
    // without affecting the DAOs affiliate revenue.
    const tokenChecksum = this.#internals.web3.utils.toChecksumAddress(
      this.#internals.vault.tokenId,
    )
    const userChecksum = this.#internals.web3.utils.toChecksumAddress(address)
    const vaultIndex = await this.getVaultId({
      underlyingAssetAddress: this.#internals.vault.tokenId,
      vaultAddress: this.#internals.vault.address,
    })

    const preDeposit = await this.#internals.routerContract.methods.deposit(
      tokenChecksum,
      userChecksum,
      amount.toString(),
      vaultIndex,
    )
    const data = await preDeposit.encodeABI({ from: address })
    const estimatedGas = bnOrZero(await preDeposit.estimateGas({ from: address }))

    const nonce = await this.#internals.web3.eth.getTransactionCount(address)
    const gasPrice = bnOrZero(await this.#internals.web3.eth.getGasPrice())

    return {
      chainId: 1,
      data,
      estimatedGas,
      gasPrice,
      nonce: String(nonce),
      to: ssRouterContractAddress,
      value: '0',
    }
  }

  async prepareWithdrawal(input: DepositWithdrawArgs): Promise<PreparedTransaction> {
    const { address, amount } = input
    // We use the vault directly to withdraw the vault tokens. There is no benefit to the DAO to use
    // the router to withdraw funds and there is an extra approval required for the user if we
    // withdrew from the vault using the shapeshift router. Affiliate fees for SS are the same
    // either way. For this reason, we simply withdraw from the vault directly.
    const vaultContract: Contract = new this.#internals.web3.eth.Contract(yv2VaultAbi, this.id)

    const preWithdraw = await vaultContract.methods.withdraw(amount.toString(), address)
    const data = await preWithdraw.encodeABI({ from: address })
    const estimatedGas = bnOrZero(await preWithdraw.estimateGas({ from: address }))

    const nonce = await this.#internals.web3.eth.getTransactionCount(address)
    const gasPrice = bnOrZero(await this.#internals.web3.eth.getGasPrice())

    return {
      chainId: 1,
      data,
      estimatedGas,
      gasPrice,
      nonce: String(nonce),
      to: this.id,
      value: '0',
    }
  }

  public async allowance(address: string): Promise<BigNumber> {
    const depositTokenContract: Contract = new this.#internals.web3.eth.Contract(
      erc20Abi,
      this.#internals.vault.tokenId,
    )
    const allowance = await depositTokenContract.methods
      .allowance(address, this.#internals.routerContract.options.address)
      .call()

    return bnOrZero(allowance)
  }

  async prepareApprove(address: string, amount?: string): Promise<PreparedTransaction> {
    const depositTokenContract = new this.#internals.web3.eth.Contract(
      erc20Abi,
      this.#internals.vault.tokenId,
    )

    const preApprove = await depositTokenContract.methods.approve(
      ssRouterContractAddress,
      amount ? numberToHex(bnOrZero(amount).toString()) : MAX_ALLOWANCE,
    )

    const data = await preApprove.encodeABI({ from: address })
    const estimatedGas = bnOrZero(await preApprove.estimateGas({ from: address }))

    const nonce: number = await this.#internals.web3.eth.getTransactionCount(address)
    const gasPrice = bnOrZero(await this.#internals.web3.eth.getGasPrice())

    return {
      chainId: 1,
      data,
      estimatedGas,
      gasPrice,
      nonce: String(nonce),
      to: this.#internals.vault.tokenId,
      value: '0',
    }
  }

  /**
   * This just makes the logging in the CLI easier to read
   * @returns
   */
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return {
      id: this.id,
      metadata: this.metadata,
      displayName: this.displayName,
      apy: this.apy.toString(),
      // @TODO TotalSupply from the API awas 0
      supply: this.supply.toString(),
      tvl: {
        assetId: this.tvl.assetId,
        balance: this.tvl.balance.toString(),
      },
      underlyingAsset: {
        balance: this.underlyingAsset.balance.toString(),
        assetId: this.underlyingAsset.assetId,
      },
      positionAsset: {
        balance: this.positionAsset.balance.toString(),
        assetId: this.positionAsset.assetId,
        price: this.positionAsset.underlyingPerPosition.toString(),
      },
    }
  }
}
