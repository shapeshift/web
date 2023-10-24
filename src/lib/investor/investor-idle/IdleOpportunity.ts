import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import type { BigNumber } from 'bignumber.js'
import { DAO_TREASURY_ETHEREUM_MAINNET } from 'constants/treasury'
import toLower from 'lodash/toLower'
import type { Address, GetContractReturnType } from 'viem'
import { encodeFunctionData, getAddress, getContract } from 'viem'
import { numberToHex } from 'web3-utils'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { viemEthMainnetClient } from 'lib/viem-client'

import type {
  ApprovalRequired,
  DepositWithdrawArgs,
  FeePriority,
  InvestorOpportunity,
} from '../../investor'
import { MAX_ALLOWANCE } from '../constants'
import type { IdleVault, ssRouterAbi } from './constants'
import { erc20Abi, idleCdoAbi, idleStrategyAbi, idleTokenV4Abi } from './constants'
import { ssRouterContractAddress } from './constants/router-contract'

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

type IdleOpportunityDeps = {
  chainAdapter: ChainAdapter<KnownChainIds.EthereumMainnet>
  dryRun?: true
  contract: GetContractReturnType<typeof ssRouterAbi>
  network?: number
}

export type ClaimableToken = {
  assetId: string
  address: string
  amount: number
}

interface IdleClaimableOpportunity {
  getClaimableTokens(address: string): Promise<ClaimableToken[]>
}

export class IdleOpportunity
  implements
    InvestorOpportunity<PreparedTransaction, IdleVault>,
    ApprovalRequired<PreparedTransaction>,
    IdleClaimableOpportunity
{
  readonly #internals: {
    chainAdapter: ChainAdapter<KnownChainIds.EthereumMainnet>
    dryRun?: true
    routerContract: GetContractReturnType<typeof ssRouterAbi>
    network?: number
  }

  /**
   * Opportunity id e.g., contract address or validator address
   */
  readonly active: boolean
  readonly id: string
  readonly version: string
  readonly strategy: string
  readonly name: string
  readonly displayName: string
  readonly isApprovalRequired = true
  readonly underlyingAsset: { assetId: string; balance: BigNumber }
  readonly positionAsset: {
    /**
     * Asset that represents their position
     */
    assetId: string
    /**
     * The amount of the position asset belonging to the user
     *
     * This represents the value of their staked/delegated position
     *
     * Amount is an integer value without precision applied
     */
    balance: BigNumber // This is probably a wallet concern not a opportunity concern
    /**
     * The ratio of value between the underlying asset and the position asset
     * in terms of underlying asset per position asset.
     *
     * Multiply the position asset amount by this value to calculate the amount of
     * underlying asset that will be received for a withdrawal
     */
    underlyingPerPosition: BigNumber
  }
  readonly feeAsset: {
    /**
     * Asset used to pay transaction fees
     */
    assetId: string
  }
  /**
   * The estimated return on deposited assets
   *
   * @example An APY of "1.0" means 100%
   */
  readonly apy: BigNumber
  readonly tvl: {
    assetId: string
    balance: BigNumber
    balanceUsdc: BigNumber
  }

  /**
   * Protocol specific information
   */
  readonly metadata: IdleVault
  readonly isNew: boolean
  readonly expired: boolean

  constructor(deps: IdleOpportunityDeps, vault: IdleVault) {
    this.#internals = {
      chainAdapter: deps.chainAdapter,
      dryRun: deps.dryRun,
      routerContract: deps.contract,
      network: deps.network,
    }

    // this.metadata = vault.metadata
    this.id = toLower(vault.address)
    this.active = !vault.isPaused
    this.metadata = {
      ...vault,
      apy: {
        net_apy: parseFloat(bnOrZero(vault.apr).div(100).toFixed()),
      },
    }
    this.version = `${vault.protocolName} ${vault.strategy}`.trim()
    this.strategy = vault.strategy
    this.name = vault.poolName
    this.displayName = vault.poolName
    this.isNew = false
    this.expired = false
    this.apy = bnOrZero(vault.apr).div(100)
    this.tvl = {
      balanceUsdc: bnOrZero(vault.tvl),
      balance: bnOrZero(vault.underlyingTVL),
      assetId: toAssetId({
        chainId: 'eip155:1',
        assetNamespace: 'erc20',
        assetReference: vault.address,
      }),
    }
    this.underlyingAsset = {
      balance: bn(0),
      assetId: toAssetId({
        chainId: 'eip155:1',
        assetNamespace: 'erc20',
        assetReference: vault.underlyingAddress,
      }),
    }
    this.positionAsset = {
      balance: bn(0),
      assetId: toAssetId({
        chainId: 'eip155:1',
        assetNamespace: 'erc20',
        assetReference: vault.address,
      }),
      underlyingPerPosition: bnOrZero(vault.pricePerShare),
    }
    this.feeAsset = {
      assetId: 'eip155:1/slip44:60',
    }
  }

  /**
   * Prepare an unsigned withdrawal transaction
   *
   * @param input.address - The user's wallet address where the funds are
   * @param input.amount - The amount (as an integer value) of the position asset
   */
  async prepareWithdrawal(input: DepositWithdrawArgs): Promise<PreparedTransaction> {
    const { address, amount } = input
    // We use the vault directly to withdraw the vault tokens. There is no benefit to the DAO to use
    // the router to withdraw funds and there is an extra approval required for the user if we
    // withdrew from the vault using the shapeshift router. Affiliate fees for SS are the same
    // either way. For this reason, we simply withdraw from the vault directly.

    let methodName: string
    let vaultAddress: string
    let vaultContractAbi

    // Handle Tranche Withdraw
    if (this.metadata.cdoAddress) {
      vaultAddress = this.metadata.cdoAddress
      vaultContractAbi = idleCdoAbi
      const trancheType = /senior/i.test(this.metadata.strategy) ? 'AA' : 'BB'
      methodName = `withdraw${trancheType}`
    } else {
      vaultAddress = this.id
      vaultContractAbi = idleTokenV4Abi
      methodName = `redeemIdleToken`
    }

    const data = encodeFunctionData({
      abi: vaultContractAbi,
      functionName: methodName as 'withdrawAA' | 'withdrawBB' | 'redeemIdleToken',
      args: [BigInt(amount.toFixed())],
    })

    const estimatedGas = bn(
      (
        await viemEthMainnetClient.estimateGas({
          account: address as Address,
          to: vaultAddress as Address,
          data,
        })
      ).toString(),
    )

    const nonce = await viemEthMainnetClient.getTransactionCount({ address: address as Address })
    const gasPrice = bn((await viemEthMainnetClient.getGasPrice()).toString())

    return {
      chainId: 1,
      data,
      estimatedGas,
      gasPrice,
      nonce: String(nonce),
      to: vaultAddress,
      value: '0',
    }
  }

  public async prepareClaimTokens(address: string): Promise<PreparedTransaction> {
    const data = encodeFunctionData({
      abi: idleTokenV4Abi,
      functionName: 'redeemIdleToken',
      args: [BigInt(0)],
    })

    const estimatedGas = bn(
      (
        await viemEthMainnetClient.estimateGas({
          account: address as Address,
          to: this.id as Address,
          data,
        })
      ).toString(),
    )

    const nonce = await viemEthMainnetClient.getTransactionCount({ address: address as Address })
    const gasPrice = bn((await viemEthMainnetClient.getGasPrice()).toString())

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

  /**
   * Prepare an unsigned deposit transaction
   *
   * @param input.address - The user's wallet address where the funds are
   * @param input.amount - The amount (as an integer value) of the underlying asset
   */
  async prepareDeposit(input: DepositWithdrawArgs): Promise<PreparedTransaction> {
    const { address, amount } = input

    // In order to properly earn affiliate revenue, we must deposit to the vault through the SS
    // router contract. This is not necessary for withdraws. We can withdraw directly from the vault
    // without affecting the DAOs affiliate revenue.

    let methodName: string
    let methodParams: string[]
    let vaultContractAddress: Address
    let vaultContractAbi

    // Handle Tranche Deposit
    if (this.metadata.cdoAddress) {
      // TODO(gomes): we don't need to pass contract instances around like that anymore now that we use viem
      vaultContractAddress = this.#internals.routerContract.address
      vaultContractAbi = this.#internals.routerContract.abi
      const trancheType = /senior/i.test(this.metadata.strategy) ? 'AA' : 'BB'
      methodName = `deposit${trancheType}`
      methodParams = [this.metadata.cdoAddress, amount.toFixed()]
    } else {
      methodName = 'mintIdleToken'
      methodParams = [amount.toFixed(), 'true', DAO_TREASURY_ETHEREUM_MAINNET]
      vaultContractAddress = this.id as Address
      vaultContractAbi = idleTokenV4Abi
    }

    const data = encodeFunctionData({
      abi: vaultContractAbi,
      functionName: methodName,
      args: methodParams,
    })

    const estimatedGas = bn(
      (
        await viemEthMainnetClient.estimateGas({
          account: address as Address,
          to: vaultContractAddress,
          data,
        })
      ).toString(),
    )

    const nonce = await viemEthMainnetClient.getTransactionCount({ address: address as Address })

    const gasPrice = bn((await viemEthMainnetClient.getGasPrice()).toString())
    return {
      chainId: 1,
      data,
      estimatedGas,
      gasPrice,
      nonce: String(nonce),
      to: vaultContractAddress,
      value: '0',
    }
  }

  async getRewardAssetIds(): Promise<AssetId[]> {
    let govTokens: string[]

    if (this.metadata.cdoAddress) {
      const cdoContract = getContract({
        abi: idleCdoAbi,
        address: this.metadata.cdoAddress as Address,
        publicClient: viemEthMainnetClient,
      })

      const strategyContractAddress = await cdoContract.read.strategy()
      const strategyContract = getContract({
        abi: idleStrategyAbi,
        address: strategyContractAddress as Address,
        publicClient: viemEthMainnetClient,
      })
      govTokens = (await strategyContract.read.getRewardTokens()) as string[]
    } else {
      const vaultContract = getContract({
        abi: idleTokenV4Abi,
        address: this.id as Address,
        publicClient: viemEthMainnetClient,
      })

      govTokens = (await vaultContract.read.getGovTokens().catch((e: Error) => {
        // the contract may not actually implement the abi documented by idle, so swallow the
        // error in this case
        if (e.message?.includes('execution reverted')) return []
        throw e
      })) as string[]
    }

    const rewardAssetIds = govTokens.map((token: string) =>
      toAssetId({
        assetNamespace: 'erc20',
        assetReference: token,
        chainId: ethChainId,
      }),
    )

    return rewardAssetIds
  }

  /**
   * Prepare an unsigned deposit transaction
   *
   * @param address - The user's wallet address where the funds are
   */
  async getClaimableTokens(_address: string): Promise<ClaimableToken[]> {
    const address = getAddress(_address)
    if (this.metadata.cdoAddress) {
      return []
    }

    const claimableTokens: ClaimableToken[] = []
    const vaultContract = getContract({
      abi: idleTokenV4Abi,
      address: this.id as Address,
      publicClient: viemEthMainnetClient,
    })
    const govTokensAmounts = (await vaultContract.read
      .getGovTokensAmounts([address])
      .catch(() => [])) as number[]

    for (let i = 0; i < govTokensAmounts.length; i++) {
      const govTokenAddress = (await vaultContract.read.govTokens([BigInt(i)])) as string

      if (govTokenAddress) {
        claimableTokens.push({
          assetId: toAssetId({
            chainId: 'eip155:1',
            assetNamespace: 'erc20',
            assetReference: govTokenAddress,
          }),
          address: govTokenAddress,
          amount: govTokensAmounts[i],
        })
      }
    }

    return claimableTokens
  }

  public async allowance(address: string): Promise<BigNumber> {
    const depositTokenContract = getContract({
      abi: erc20Abi,
      address: this.metadata.underlyingAddress as Address,
      publicClient: viemEthMainnetClient,
    })

    let vaultContractAddress: Address

    // Handle Tranche Withdraw
    if (this.metadata.cdoAddress) {
      vaultContractAddress = this.#internals.routerContract.address
    } else {
      vaultContractAddress = this.id as Address
    }

    const allowance = bn(
      // TODO(gomes): fix unknown here
      // @ts-ignore TODO, just getting this to compile
      (
        await depositTokenContract.read.allowance([address as Address, vaultContractAddress])
      ).toString(),
    )

    return bnOrZero(allowance)
  }

  async prepareApprove(address: string): Promise<PreparedTransaction> {
    const depositTokenContract = getContract({
      abi: erc20Abi,
      address: this.metadata.underlyingAddress as Address,
      publicClient: viemEthMainnetClient,
    })

    let vaultContractAddress: Address

    // Handle Tranche Withdraw
    if (this.metadata.cdoAddress) {
      vaultContractAddress = ssRouterContractAddress
    } else {
      vaultContractAddress = this.id as Address
    }

    const data = encodeFunctionData({
      // @ts-ignore this is actually valid erc20 ABI
      abi: erc20Abi,
      function: 'approve',
      parameters: [vaultContractAddress, MAX_ALLOWANCE],
    })
    const estimatedGas = bn(
      (
        await viemEthMainnetClient.estimateGas({
          account: address as Address,
          to: depositTokenContract.address,
          data,
        })
      ).toString(),
    )

    const nonce = (
      await viemEthMainnetClient.getTransactionCount({ address: address as Address })
    ).toString()
    const gasPrice = bn((await viemEthMainnetClient.getGasPrice()).toString())

    return {
      chainId: 1,
      data,
      estimatedGas,
      gasPrice,
      nonce,
      to: this.metadata.underlyingAddress,
      value: '0',
    }
  }

  /**
   * Sign and broadcast a previously prepared transaction
   */
  async signAndBroadcast(input: {
    wallet: HDWallet
    tx: PreparedTransaction
    feePriority?: FeePriority
    bip44Params: BIP44Params
  }): Promise<string> {
    const { wallet, tx, feePriority, bip44Params } = input
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

    const senderAddress = await chainAdapter.getAddress({
      accountNumber: bip44Params.accountNumber,
      wallet,
    })

    if (wallet.supportsOfflineSigning()) {
      const signedTx = await chainAdapter.signTransaction({ txToSign, wallet })
      if (this.#internals.dryRun) return signedTx
      return chainAdapter.broadcastTransaction({
        senderAddress,
        receiverAddress: undefined, // no receiver for this contract call
        hex: signedTx,
      })
    } else if (wallet.supportsBroadcast() && chainAdapter.signAndBroadcastTransaction) {
      if (this.#internals.dryRun) {
        throw new Error(`Cannot perform a dry run with wallet of type ${wallet.getVendor()}`)
      }
      return chainAdapter.signAndBroadcastTransaction({
        senderAddress,
        receiverAddress: undefined, // no receiver for this contract call
        signTxInput: { txToSign, wallet },
      })
    } else {
      throw new Error('Invalid HDWallet configuration')
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
        price: this.positionAsset.underlyingPerPosition.toFixed(),
      },
    }
  }
}
