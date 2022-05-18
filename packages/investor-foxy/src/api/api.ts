import { JsonRpcProvider } from '@ethersproject/providers'
import { CHAIN_REFERENCE, ChainReference, toAssetId } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes, NetworkTypes, WithdrawType } from '@shapeshiftoss/types'
import axios from 'axios'
import { BigNumber } from 'bignumber.js'
import { toLower } from 'lodash'
import Web3 from 'web3'
import { HttpProvider, TransactionReceipt } from 'web3-core/types'
import { Contract } from 'web3-eth-contract'

import { erc20Abi } from '../abi/erc20-abi'
import { foxyAbi } from '../abi/foxy-abi'
import { foxyStakingAbi } from '../abi/foxy-staking-abi'
import { liquidityReserveAbi } from '../abi/liquidity-reserve-abi'
import { tokeManagerAbi } from '../abi/toke-manager-abi'
import { tokePoolAbi } from '../abi/toke-pool-abi'
import { tokeRewardHashAbi } from '../abi/toke-reward-hash-abi'
import {
  DefiType,
  MAX_ALLOWANCE,
  tokeManagerAddress,
  tokePoolAddress,
  tokeRewardHashAddress
} from '../constants'
import { bnOrZero, buildTxToSign } from '../utils'
import {
  AllowanceInput,
  ApproveInput,
  BalanceInput,
  ClaimWithdrawal,
  ContractAddressInput,
  EstimateGasApproveInput,
  EstimateGasTxInput,
  FoxyAddressesType,
  FoxyOpportunityInputData,
  GetTokeRewardAmount,
  RebaseEvent,
  RebaseHistory,
  SignAndBroadcastTx,
  StakingContract,
  StakingContractWithUser,
  TokeClaimIpfs,
  TokenAddressInput,
  TxInput,
  TxInputWithoutAmount,
  TxInputWithoutAmountAndWallet,
  TxReceipt,
  WithdrawEstimateGasInput,
  WithdrawInfo,
  WithdrawInput
} from './foxy-types'

export * from './foxy-types'

type Network =
  | typeof CHAIN_REFERENCE.EthereumMainnet
  | typeof CHAIN_REFERENCE.EthereumRinkeby
  | typeof CHAIN_REFERENCE.EthereumRopsten

export type ConstructorArgs = {
  adapter: ChainAdapter<ChainTypes.Ethereum>
  providerUrl: string
  foxyAddresses: FoxyAddressesType
  network?: Network
}

export const transformData = ({ tvl, apy, expired, ...contractData }: FoxyOpportunityInputData) => {
  return {
    type: DefiType.TokenStaking,
    provider: 'ShapeShift',
    version: '1',
    contractAddress: contractData.staking,
    rewardToken: contractData.foxy,
    stakingToken: contractData.fox,
    chain: ChainTypes.Ethereum,
    tvl,
    apy,
    expired
  }
}

const TOKE_IPFS_URL = 'https://ipfs.tokemaklabs.xyz/ipfs'

export class FoxyApi {
  public adapter: ChainAdapter<ChainTypes.Ethereum>
  public provider: HttpProvider
  private providerUrl: string
  public jsonRpcProvider: JsonRpcProvider
  public web3: Web3
  private foxyStakingContracts: Contract[]
  private liquidityReserveContracts: Contract[]
  private network: ChainReference
  private foxyAddresses: FoxyAddressesType

  constructor({
    adapter,
    providerUrl,
    foxyAddresses,
    network = CHAIN_REFERENCE.EthereumMainnet
  }: ConstructorArgs) {
    this.adapter = adapter
    this.provider = new Web3.providers.HttpProvider(providerUrl)
    this.jsonRpcProvider = new JsonRpcProvider(providerUrl)
    this.web3 = new Web3(this.provider)
    this.foxyStakingContracts = foxyAddresses.map(
      (addresses) => new this.web3.eth.Contract(foxyStakingAbi, addresses.staking)
    )
    this.liquidityReserveContracts = foxyAddresses.map(
      (addresses) => new this.web3.eth.Contract(liquidityReserveAbi, addresses.liquidityReserve)
    )
    this.network = network
    this.providerUrl = providerUrl
    this.foxyAddresses = foxyAddresses
  }

  /**
   * Very large amounts like those found in ERC20s with a precision of 18 get converted
   * to exponential notation ('1.6e+21') in javascript.
   * @param amount
   */
  private normalizeAmount(amount: BigNumber) {
    return this.web3.utils.toBN(amount.toFixed())
  }

  private async signAndBroadcastTx(input: SignAndBroadcastTx): Promise<string> {
    const { payload, wallet, dryRun } = input
    const txToSign = buildTxToSign(payload)
    if (wallet.supportsOfflineSigning()) {
      const signedTx = await this.adapter.signTransaction({ txToSign, wallet })
      if (dryRun) return signedTx
      try {
        if (this.providerUrl.includes('localhost') || this.providerUrl.includes('127.0.0.1')) {
          const sendSignedTx = await this.web3.eth.sendSignedTransaction(signedTx)
          return sendSignedTx?.blockHash
        }
        return this.adapter.broadcastTransaction(signedTx)
      } catch (e) {
        throw new Error(`Failed to broadcast: ${e}`)
      }
    } else if (wallet.supportsBroadcast() && this.adapter.signAndBroadcastTransaction) {
      if (dryRun) {
        throw new Error(`Cannot perform a dry run with wallet of type ${wallet.getVendor()}`)
      }
      return this.adapter.signAndBroadcastTransaction({ txToSign, wallet })
    } else {
      throw new Error('Invalid HDWallet configuration ')
    }
  }

  checksumAddress(address: string): string {
    return this.web3.utils.toChecksumAddress(address)
  }

  private verifyAddresses(addresses: string[]) {
    try {
      addresses.forEach((address) => {
        this.checksumAddress(address)
      })
    } catch (e) {
      throw new Error(`Verify Address: ${e}`)
    }
  }

  private getStakingContract(contractAddress: string): Contract {
    const stakingContract = this.foxyStakingContracts.find(
      (item) => toLower(item.options.address) === toLower(contractAddress)
    )
    if (!stakingContract) throw new Error('Not a valid contract address')
    return stakingContract
  }

  private getLiquidityReserveContract(liquidityReserveAddress: string): Contract {
    const liquidityReserveContract = this.liquidityReserveContracts.find(
      (item) => toLower(item.options.address) === toLower(liquidityReserveAddress)
    )
    if (!liquidityReserveContract) throw new Error('Not a valid reserve contract address')
    return liquidityReserveContract
  }

  private async getGasPriceAndNonce(userAddress: string) {
    let nonce: number
    try {
      nonce = await this.web3.eth.getTransactionCount(userAddress)
    } catch (e) {
      throw new Error(`Get nonce Error: ${e}`)
    }
    let gasPrice: string
    try {
      gasPrice = await this.web3.eth.getGasPrice()
    } catch (e) {
      throw new Error(`Get gasPrice Error: ${e}`)
    }
    return { nonce: String(nonce), gasPrice }
  }

  async getFoxyOpportunities() {
    try {
      const opportunities = await Promise.all(
        this.foxyAddresses.map(async (addresses) => {
          const stakingContract = this.foxyStakingContracts.find(
            (item) => toLower(item.options.address) === toLower(addresses.staking)
          )
          try {
            const expired = await stakingContract?.methods.pauseStaking().call()
            const tvl = await this.tvl({ tokenContractAddress: addresses.foxy })
            const apy = this.apy()
            return transformData({ ...addresses, expired, tvl, apy })
          } catch (e) {
            throw new Error(`Failed to get contract data ${e}`)
          }
        })
      )
      return opportunities
    } catch (e) {
      throw new Error(`getFoxyOpportunities Error: ${e}`)
    }
  }

  async getFoxyOpportunityByStakingAddress(stakingAddress: string) {
    this.verifyAddresses([stakingAddress])
    const addresses = this.foxyAddresses.find(async (item) => {
      return item.staking === stakingAddress
    })
    if (!addresses) throw new Error('Not a valid address')

    const stakingContract = this.getStakingContract(addresses.staking)

    try {
      const expired = await stakingContract.methods.pauseStaking().call()
      const tvl = await this.tvl({ tokenContractAddress: addresses.foxy })
      const apy = this.apy()
      return transformData({ ...addresses, tvl, apy, expired })
    } catch (e) {
      throw new Error(`Failed to get contract data ${e}`)
    }
  }

  async getGasPrice() {
    const gasPrice = await this.web3.eth.getGasPrice()
    return bnOrZero(gasPrice)
  }

  async getTxReceipt({ txid }: TxReceipt): Promise<TransactionReceipt> {
    if (!txid) throw new Error('Must pass txid')
    return this.web3.eth.getTransactionReceipt(txid)
  }

  async estimateClaimWithdrawGas(input: ClaimWithdrawal): Promise<BigNumber> {
    const { claimAddress, userAddress, contractAddress } = input
    const addressToClaim = claimAddress ?? userAddress
    this.verifyAddresses([addressToClaim, userAddress, contractAddress])

    const stakingContract = this.getStakingContract(contractAddress)

    try {
      const estimatedGas = await stakingContract.methods.claimWithdraw(addressToClaim).estimateGas({
        from: userAddress
      })
      return bnOrZero(estimatedGas)
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async estimateSendWithdrawalRequestsGas(
    input: TxInputWithoutAmountAndWallet
  ): Promise<BigNumber> {
    const { userAddress, contractAddress } = input
    this.verifyAddresses([userAddress, contractAddress])

    const stakingContract = this.getStakingContract(contractAddress)

    try {
      const estimatedGas = await stakingContract.methods.sendWithdrawalRequests().estimateGas({
        from: userAddress
      })
      return bnOrZero(estimatedGas)
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async estimateAddLiquidityGas(input: EstimateGasTxInput): Promise<BigNumber> {
    const { amountDesired, userAddress, contractAddress } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!amountDesired.gt(0)) throw new Error('Must send valid amount')

    const liquidityReserveContract = this.getLiquidityReserveContract(contractAddress)

    try {
      const estimatedGas = await liquidityReserveContract.methods
        .addLiquidity(this.normalizeAmount(amountDesired))
        .estimateGas({
          from: userAddress
        })
      return bnOrZero(estimatedGas)
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async estimateRemoveLiquidityGas(input: EstimateGasTxInput): Promise<BigNumber> {
    const { amountDesired, userAddress, contractAddress } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!amountDesired.gt(0)) throw new Error('Must send valid amount')

    const liquidityReserveContract = this.getLiquidityReserveContract(contractAddress)

    try {
      const estimatedGas = await liquidityReserveContract.methods
        .removeLiquidity(this.normalizeAmount(amountDesired))
        .estimateGas({
          from: userAddress
        })
      return bnOrZero(estimatedGas)
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async estimateWithdrawGas(input: WithdrawEstimateGasInput): Promise<BigNumber> {
    const { amountDesired, userAddress, contractAddress, type } = input
    this.verifyAddresses([userAddress, contractAddress])

    const stakingContract = this.getStakingContract(contractAddress)

    const isDelayed = type === WithdrawType.DELAYED && amountDesired
    if (isDelayed && !amountDesired.gt(0)) throw new Error('Must send valid amount')

    try {
      const estimatedGas = isDelayed
        ? await stakingContract.methods
            .unstake(this.normalizeAmount(amountDesired), true)
            .estimateGas({
              from: userAddress
            })
        : await stakingContract.methods.instantUnstake(true).estimateGas({
            from: userAddress
          })
      return bnOrZero(estimatedGas)
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async estimateApproveGas(input: EstimateGasApproveInput): Promise<BigNumber> {
    const { userAddress, tokenContractAddress, contractAddress } = input
    this.verifyAddresses([userAddress, contractAddress, tokenContractAddress])

    const depositTokenContract = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)

    try {
      const estimatedGas = await depositTokenContract.methods
        .approve(contractAddress, MAX_ALLOWANCE)
        .estimateGas({
          from: userAddress
        })
      return bnOrZero(estimatedGas)
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async estimateDepositGas(input: EstimateGasTxInput): Promise<BigNumber> {
    const { amountDesired, userAddress, contractAddress } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!amountDesired.gt(0)) throw new Error('Must send valid amount')

    const stakingContract = this.getStakingContract(contractAddress)

    try {
      const estimatedGas = await stakingContract.methods
        .stake(this.normalizeAmount(amountDesired), userAddress)
        .estimateGas({
          from: userAddress
        })
      return bnOrZero(estimatedGas)
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async approve(input: ApproveInput): Promise<string> {
    const {
      accountNumber = 0,
      dryRun = false,
      tokenContractAddress,
      userAddress,
      wallet,
      contractAddress
    } = input
    this.verifyAddresses([userAddress, contractAddress, tokenContractAddress])
    if (!wallet) throw new Error('Missing inputs')

    let estimatedGasBN: BigNumber
    try {
      estimatedGasBN = await this.estimateApproveGas(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }
    const depositTokenContract = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)
    const data: string = depositTokenContract.methods
      .approve(contractAddress, MAX_ALLOWANCE)
      .encodeABI({
        from: userAddress
      })

    const { nonce, gasPrice } = await this.getGasPriceAndNonce(userAddress)
    const bip44Params = this.adapter.buildBIP44Params({ accountNumber })
    const chainId = Number(this.network)
    const estimatedGas = estimatedGasBN.toString()
    const payload = {
      bip44Params,
      chainId,
      data,
      estimatedGas,
      gasPrice,
      nonce,
      to: tokenContractAddress,
      value: '0'
    }
    return this.signAndBroadcastTx({ payload, wallet, dryRun })
  }

  async allowance(input: AllowanceInput): Promise<string> {
    const { userAddress, tokenContractAddress, contractAddress } = input
    this.verifyAddresses([userAddress, contractAddress, tokenContractAddress])

    const depositTokenContract: Contract = new this.web3.eth.Contract(
      erc20Abi,
      tokenContractAddress
    )

    let allowance
    try {
      allowance = await depositTokenContract.methods.allowance(userAddress, contractAddress).call()
    } catch (e) {
      throw new Error(`Failed to get allowance ${e}`)
    }
    return allowance
  }

  async deposit(input: TxInput): Promise<string> {
    const {
      amountDesired,
      accountNumber = 0,
      dryRun = false,
      contractAddress,
      userAddress,
      wallet
    } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!amountDesired.gt(0)) throw new Error('Must send valid amount')
    if (!wallet) throw new Error('Missing inputs')

    let estimatedGasBN: BigNumber
    try {
      estimatedGasBN = await this.estimateDepositGas(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }

    const stakingContract = this.getStakingContract(contractAddress)
    const userChecksum = this.web3.utils.toChecksumAddress(userAddress)

    const data: string = await stakingContract.methods
      .stake(this.normalizeAmount(amountDesired), userAddress)
      .encodeABI({
        value: 0,
        from: userChecksum
      })

    const { nonce, gasPrice } = await this.getGasPriceAndNonce(userAddress)
    const estimatedGas = estimatedGasBN.toString()
    const bip44Params = this.adapter.buildBIP44Params({ accountNumber })
    const chainId = Number(this.network)
    const payload = {
      bip44Params,
      chainId,
      data,
      estimatedGas,
      gasPrice,
      nonce,
      to: contractAddress,
      value: '0'
    }
    return this.signAndBroadcastTx({ payload, wallet, dryRun })
  }

  async withdraw(input: WithdrawInput): Promise<string> {
    const {
      amountDesired,
      accountNumber = 0,
      dryRun = false,
      contractAddress,
      userAddress,
      type,
      wallet
    } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!wallet) throw new Error('Missing inputs')

    let estimatedGasBN: BigNumber
    try {
      estimatedGasBN = await this.estimateWithdrawGas(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }

    const stakingContract = this.getStakingContract(contractAddress)

    const isDelayed = type === WithdrawType.DELAYED && amountDesired
    if (isDelayed && !amountDesired.gt(0)) throw new Error('Must send valid amount')

    const data: string = isDelayed
      ? stakingContract.methods.unstake(this.normalizeAmount(amountDesired), true).encodeABI({
          from: userAddress
        })
      : stakingContract.methods.instantUnstake(true).encodeABI({
          from: userAddress
        })

    const { nonce, gasPrice } = await this.getGasPriceAndNonce(userAddress)
    const estimatedGas = estimatedGasBN.toString()
    const bip44Params = this.adapter.buildBIP44Params({ accountNumber })
    const chainId = Number(this.network)
    const payload = {
      bip44Params,
      chainId,
      data,
      estimatedGas,
      gasPrice,
      nonce,
      to: contractAddress,
      value: '0'
    }
    return this.signAndBroadcastTx({ payload, wallet, dryRun })
  }

  async canClaimWithdraw(input: StakingContractWithUser): Promise<boolean> {
    const { userAddress, stakingContract } = input
    const tokeManagerContract = new this.web3.eth.Contract(tokeManagerAbi, tokeManagerAddress)
    const tokePoolContract = new this.web3.eth.Contract(tokePoolAbi, tokePoolAddress)

    const coolDownInfo = await (async () => {
      try {
        const coolDown = await stakingContract.methods.coolDownInfo(userAddress).call()
        return {
          ...coolDown,
          endEpoch: coolDown.expiry
        }
      } catch (e) {
        console.error(`Failed to get coolDowninfo: ${e}`)
      }
    })()

    const epoch = await (async () => {
      try {
        return stakingContract.methods.epoch().call()
      } catch (e) {
        console.error(`Failed to get epoch: ${e}`)
        return {}
      }
    })()

    const requestedWithdrawals = await (async () => {
      try {
        return tokePoolContract.methods.requestedWithdrawals(stakingContract.options.address).call()
      } catch (e) {
        console.error(`Failed to get requestedWithdrawals: ${e}`)
        return {}
      }
    })()

    const currentCycleIndex = await (async () => {
      try {
        return tokeManagerContract.methods.getCurrentCycleIndex().call()
      } catch (e) {
        console.error(`Failed to get currentCycleIndex: ${e}`)
        return 0
      }
    })()

    const withdrawalAmount = await (async () => {
      try {
        return stakingContract.methods.withdrawalAmount().call()
      } catch (e) {
        console.error(`Failed to get currentCycleIndex: ${e}`)
        return 0
      }
    })()

    const epochExpired = epoch.number >= coolDownInfo.endEpoch
    const coolDownValid =
      !bnOrZero(coolDownInfo.endEpoch).eq(0) && !bnOrZero(coolDownInfo.amount).eq(0)

    const pastTokeCycleIndex = bnOrZero(requestedWithdrawals.minCycle).lte(currentCycleIndex)
    const stakingTokenAvailableWithTokemak = bnOrZero(requestedWithdrawals.amount).plus(
      withdrawalAmount
    )
    const stakingTokenAvailable = bnOrZero(withdrawalAmount).gte(coolDownInfo.amount)
    const validCycleAndAmount =
      (pastTokeCycleIndex && stakingTokenAvailableWithTokemak.gte(coolDownInfo.amount)) ||
      stakingTokenAvailable

    return epochExpired && coolDownValid && validCycleAndAmount
  }

  async claimWithdraw(input: ClaimWithdrawal): Promise<string> {
    const {
      accountNumber = 0,
      dryRun = false,
      contractAddress,
      userAddress,
      claimAddress,
      wallet
    } = input
    const addressToClaim = claimAddress ?? userAddress
    this.verifyAddresses([userAddress, contractAddress, addressToClaim])
    if (!wallet) throw new Error('Missing inputs')

    let estimatedGasBN: BigNumber
    try {
      estimatedGasBN = await this.estimateClaimWithdrawGas(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }

    const stakingContract = this.getStakingContract(contractAddress)

    const canClaim = await this.canClaimWithdraw({ userAddress, stakingContract })
    if (!canClaim) throw new Error('Not ready to claim')

    const data: string = stakingContract.methods.claimWithdraw(addressToClaim).encodeABI({
      from: userAddress
    })

    const { nonce, gasPrice } = await this.getGasPriceAndNonce(userAddress)
    const estimatedGas = estimatedGasBN.toString()
    const bip44Params = this.adapter.buildBIP44Params({ accountNumber })
    const chainId = Number(this.network)
    const payload = {
      bip44Params,
      chainId,
      data,
      estimatedGas,
      gasPrice,
      nonce,
      to: contractAddress,
      value: '0'
    }
    return this.signAndBroadcastTx({ payload, wallet, dryRun })
  }

  async canSendWithdrawalRequest(input: StakingContract): Promise<boolean> {
    const { stakingContract } = input
    const tokeManagerContract = new this.web3.eth.Contract(tokeManagerAbi, tokeManagerAddress)

    const requestWithdrawalAmount = await (async () => {
      try {
        return stakingContract.methods.requestWithdrawalAmount().call()
      } catch (e) {
        console.error(`Failed to get requestWithdrawalAmount: ${e}`)
        return 0
      }
    })()

    const timeLeftToRequestWithdrawal = await (async () => {
      try {
        return stakingContract.methods.timeLeftToRequestWithdrawal().call()
      } catch (e) {
        console.error(`Failed to get timeLeftToRequestWithdrawal: ${e}`)
        return 0
      }
    })()

    const lastTokeCycleIndex = await (async () => {
      try {
        return stakingContract.methods.lastTokeCycleIndex().call()
      } catch (e) {
        console.error(`Failed to get lastTokeCycleIndex: ${e}`)
        return 0
      }
    })()

    const duration = await (async () => {
      try {
        return tokeManagerContract.methods.getCycleDuration().call()
      } catch (e) {
        console.error(`Failed to get cycleDuration: ${e}`)
        return 0
      }
    })()

    const currentCycleIndex = await (async () => {
      try {
        return tokeManagerContract.methods.getCurrentCycleIndex().call()
      } catch (e) {
        console.error(`Failed to get currentCycleIndex: ${e}`)
        return 0
      }
    })()

    const currentCycleStart = await (async () => {
      try {
        return tokeManagerContract.methods.getCurrentCycle().call()
      } catch (e) {
        console.error(`Failed to get currentCycle: ${e}`)
        return 0
      }
    })()

    const nextCycleStart = bnOrZero(currentCycleStart).plus(duration)

    const blockNumber = await this.web3.eth.getBlockNumber()
    const timestamp = (await this.web3.eth.getBlock(blockNumber)).timestamp

    const isTimeToRequest = bnOrZero(timestamp)
      .plus(timeLeftToRequestWithdrawal)
      .gte(nextCycleStart)
    const isCorrectIndex = bnOrZero(currentCycleIndex).gt(lastTokeCycleIndex)
    const hasAmount = bnOrZero(requestWithdrawalAmount).gt(0)

    return isTimeToRequest && isCorrectIndex && hasAmount
  }

  async sendWithdrawalRequests(input: TxInputWithoutAmount): Promise<string> {
    const { accountNumber = 0, dryRun = false, contractAddress, userAddress, wallet } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!wallet || !contractAddress) throw new Error('Missing inputs')

    let estimatedGasBN: BigNumber
    try {
      estimatedGasBN = await this.estimateSendWithdrawalRequestsGas(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }

    const stakingContract = this.getStakingContract(contractAddress)

    const canSendRequest = await this.canSendWithdrawalRequest({ stakingContract })
    if (!canSendRequest) throw new Error('Not ready to send request')

    const data: string = stakingContract.methods.sendWithdrawalRequests().encodeABI({
      from: userAddress
    })

    const { nonce, gasPrice } = await this.getGasPriceAndNonce(userAddress)
    const estimatedGas = estimatedGasBN.toString()
    const bip44Params = this.adapter.buildBIP44Params({ accountNumber })
    const chainId = Number(this.network)
    const payload = {
      bip44Params,
      chainId,
      data,
      estimatedGas,
      gasPrice,
      nonce,
      to: contractAddress,
      value: '0'
    }
    return this.signAndBroadcastTx({ payload, wallet, dryRun })
  }

  // not a user facing function
  // utility function for the dao to add liquidity to the lrContract for instantUnstaking
  async addLiquidity(input: TxInput): Promise<string> {
    const {
      amountDesired,
      accountNumber = 0,
      dryRun = false,
      contractAddress,
      userAddress,
      wallet
    } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!amountDesired.gt(0)) throw new Error('Must send valid amount')

    if (!wallet) throw new Error('Missing inputs')

    let estimatedGasBN: BigNumber
    try {
      estimatedGasBN = await this.estimateAddLiquidityGas(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }

    const liquidityReserveContract = this.getLiquidityReserveContract(contractAddress)

    const data: string = liquidityReserveContract.methods
      .addLiquidity(this.normalizeAmount(amountDesired))
      .encodeABI({
        from: userAddress
      })

    const { nonce, gasPrice } = await this.getGasPriceAndNonce(userAddress)
    const estimatedGas = estimatedGasBN.toString()
    const bip44Params = this.adapter.buildBIP44Params({ accountNumber })
    const chainId = Number(this.network)
    const payload = {
      bip44Params,
      chainId,
      data,
      estimatedGas,
      gasPrice,
      nonce,
      to: contractAddress,
      value: '0'
    }
    return this.signAndBroadcastTx({ payload, wallet, dryRun })
  }

  // not a user facing function
  // utility function for the dao to remove liquidity to the lrContract for instantUnstaking
  async removeLiquidity(input: TxInput): Promise<string> {
    const {
      amountDesired,
      accountNumber = 0,
      dryRun = false,
      contractAddress,
      userAddress,
      wallet
    } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!amountDesired.gt(0)) throw new Error('Must send valid amount')
    if (!wallet) throw new Error('Missing inputs')

    let estimatedGasBN: BigNumber
    try {
      estimatedGasBN = await this.estimateRemoveLiquidityGas(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }

    const liquidityReserveContract = this.getLiquidityReserveContract(contractAddress)

    const data: string = liquidityReserveContract.methods
      .removeLiquidity(this.normalizeAmount(amountDesired))
      .encodeABI({
        from: userAddress
      })

    const { nonce, gasPrice } = await this.getGasPriceAndNonce(userAddress)
    const estimatedGas = estimatedGasBN.toString()
    const bip44Params = this.adapter.buildBIP44Params({ accountNumber })
    const chainId = Number(this.network)
    const payload = {
      bip44Params,
      chainId,
      data,
      estimatedGas,
      gasPrice,
      nonce,
      to: contractAddress,
      value: '0'
    }
    return this.signAndBroadcastTx({ payload, wallet, dryRun })
  }

  // returns time when the users withdraw request is claimable
  async getTimeUntilClaimable(input: TxInputWithoutAmountAndWallet): Promise<string> {
    const { contractAddress, userAddress } = input
    this.verifyAddresses([userAddress, contractAddress])

    const stakingContract = this.getStakingContract(contractAddress)

    let coolDownInfo
    try {
      const coolDown = await stakingContract.methods.coolDownInfo(userAddress).call()
      coolDownInfo = {
        ...coolDown,
        endEpoch: coolDown.expiry
      }
    } catch (e) {
      throw new Error(`Failed to get coolDowninfo: ${e}`)
    }
    let epoch
    try {
      epoch = await stakingContract.methods.epoch().call()
    } catch (e) {
      throw new Error(`Failed to get epoch: ${e}`)
    }
    let currentBlock
    try {
      currentBlock = await this.web3.eth.getBlockNumber()
    } catch (e) {
      throw new Error(`Failed to get block number: ${e}`)
    }
    const epochsLeft = bnOrZero(coolDownInfo.endEpoch).minus(epoch.number) // epochs left until can claim
    const blocksLeftInCurrentEpoch =
      epochsLeft.gt(0) && epoch.endBlock > currentBlock ? epoch.endBlock - currentBlock : 0 // calculate time remaining in current epoch
    const blocksLeftInFutureEpochs = epochsLeft.minus(1).gt(0)
      ? epochsLeft.minus(1).times(epoch.length)
      : 0 // don't count current epoch
    const blocksUntilClaimable = bnOrZero(blocksLeftInCurrentEpoch).plus(blocksLeftInFutureEpochs) // total blocks left until can claim
    const secondsUntilClaimable = blocksUntilClaimable.times(13) // average block time is 13 seconds to get total seconds
    const currentDate = new Date()
    currentDate.setSeconds(secondsUntilClaimable.plus(currentDate.getSeconds()).toNumber())

    return currentDate.toString()
  }

  async balance(input: BalanceInput): Promise<BigNumber> {
    const { tokenContractAddress, userAddress } = input
    this.verifyAddresses([userAddress, tokenContractAddress])

    const contract = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)
    try {
      const balance = await contract.methods.balanceOf(userAddress).call()
      return bnOrZero(balance)
    } catch (e) {
      throw new Error(`Failed to get balance: ${e}`)
    }
  }

  async instantUnstakeFee(input: ContractAddressInput): Promise<BigNumber> {
    const { contractAddress } = input
    this.verifyAddresses([contractAddress])
    const stakingContract = this.getStakingContract(contractAddress)

    let liquidityReserveAddress
    try {
      liquidityReserveAddress = await stakingContract.methods.LIQUIDITY_RESERVE().call()
    } catch (e) {
      throw new Error(`Failed to get liquidityReserve address ${e}`)
    }
    const liquidityReserveContract = this.getLiquidityReserveContract(liquidityReserveAddress)
    try {
      const feeInBasisPoints = await liquidityReserveContract.methods.fee().call()
      return bnOrZero(feeInBasisPoints).div(10000) // convert from basis points to decimal percentage
    } catch (e) {
      throw new Error(`Failed to get instantUnstake fee ${e}`)
    }
  }

  async totalSupply({ tokenContractAddress }: TokenAddressInput): Promise<BigNumber> {
    this.verifyAddresses([tokenContractAddress])
    const contract = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)

    try {
      const totalSupply = await contract.methods.totalSupply().call()
      return bnOrZero(totalSupply)
    } catch (e) {
      throw new Error(`Failed to get totalSupply: ${e}`)
    }
  }

  pricePerShare(): BigNumber {
    return bnOrZero(1).times('1e+18')
  }

  // TODO: use tokemak's api to get apy when they build it
  apy(): string {
    return '.15'
  }

  async tvl(input: TokenAddressInput): Promise<BigNumber> {
    const { tokenContractAddress } = input
    this.verifyAddresses([tokenContractAddress])
    const contract = new this.web3.eth.Contract(foxyAbi, tokenContractAddress)

    try {
      const balance = await contract.methods.circulatingSupply().call()
      return bnOrZero(balance)
    } catch (e) {
      throw new Error(`Failed to get tvl: ${e}`)
    }
  }

  async getWithdrawInfo(input: TxInputWithoutAmountAndWallet): Promise<WithdrawInfo> {
    const { contractAddress, userAddress } = input
    this.verifyAddresses([userAddress, contractAddress])
    const stakingContract = this.getStakingContract(contractAddress)

    let coolDownInfo
    try {
      coolDownInfo = await stakingContract.methods.coolDownInfo(userAddress).call()
    } catch (e) {
      throw new Error(`Failed to get coolDowninfo: ${e}`)
    }
    let releaseTime
    try {
      releaseTime = await this.getTimeUntilClaimable(input)
    } catch (e) {
      throw new Error(`Failed to getTimeUntilClaimable: ${e}`)
    }
    return {
      ...coolDownInfo,
      releaseTime
    }
  }

  async getClaimFromTokemakArgs(input: ContractAddressInput): Promise<GetTokeRewardAmount> {
    const { contractAddress } = input
    const rewardHashContract = new this.web3.eth.Contract(tokeRewardHashAbi, tokeRewardHashAddress)
    const latestCycleIndex = await (async () => {
      try {
        return rewardHashContract.methods.latestCycleIndex().call()
      } catch (e) {
        throw new Error(`Failed to get latestCycleIndex, ${e}`)
      }
    })()
    const cycleHashes = await (async () => {
      try {
        return rewardHashContract.methods.cycleHashes(latestCycleIndex).call()
      } catch (e) {
        throw new Error(`Failed to get latestCycleIndex, ${e}`)
      }
    })()

    try {
      const { latestClaimable } = cycleHashes
      const response = await axios.get<TokeClaimIpfs>(
        `${TOKE_IPFS_URL}/${latestClaimable}/${contractAddress.toLowerCase()}.json`
      )
      const {
        data: { payload, signature }
      } = response

      const v = signature.v
      const r = signature.r
      const s = signature.s
      return {
        v,
        r,
        s,
        recipient: payload
      }
    } catch (e) {
      throw new Error(`Failed to get information from Tokemak ipfs ${e}`)
    }
  }

  async getRebaseHistory(input: BalanceInput) {
    const { tokenContractAddress, userAddress } = input
    this.verifyAddresses([tokenContractAddress])

    const foxyContract = new this.web3.eth.Contract(foxyAbi, tokenContractAddress)
    const fromBlock = 14381454 // genesis rebase

    const rebaseEvents = await (async () => {
      try {
        const events = (
          await foxyContract.getPastEvents('LogRebase', {
            fromBlock,
            toBlock: 'latest'
          })
        ).filter((rebase) => rebase.returnValues.rebase !== '0')
        return events
      } catch (e) {
        console.error(`Failed to get rebase events ${e}`)
        return undefined
      }
    })()

    if (!rebaseEvents) return []

    const transferEvents = await (async () => {
      try {
        const events = await foxyContract.getPastEvents('Transfer', {
          fromBlock,
          toBlock: 'latest'
        })
        return events
      } catch (e) {
        console.error(`Failed to get transfer events ${e}`)
        return undefined
      }
    })()

    const events: RebaseEvent[] = rebaseEvents.map((rebaseEvent) => {
      const {
        blockNumber,
        returnValues: { epoch }
      } = rebaseEvent
      return {
        blockNumber,
        epoch
      }
    })

    const chain = ChainTypes.Ethereum
    const network = NetworkTypes.MAINNET
    const assetNamespace = 'erc20'
    const assetReference = tokenContractAddress
    // foxy assetId
    const assetId = toAssetId({ chain, network, assetNamespace, assetReference })

    const results = await Promise.allSettled(
      events.map(async (event) => {
        const { preRebaseBalance, postRebaseBalance } = await (async () => {
          try {
            // check transfer events to see if a user triggered a rebase through unstake or stake
            const unstakedTransferInfo = transferEvents?.filter(
              (e) =>
                e.blockNumber === event.blockNumber &&
                e.returnValues.from.toLowerCase() === userAddress
            )
            const unstakedTransferAmount = unstakedTransferInfo?.[0]?.returnValues?.value ?? 0
            const stakedTransferInfo = transferEvents?.filter(
              (e) =>
                e.blockNumber === event.blockNumber &&
                e.returnValues.to.toLowerCase() === userAddress
            )
            const stakedTransferAmount = stakedTransferInfo?.[0]?.returnValues?.value ?? 0

            const postRebaseBalanceResult = await foxyContract.methods
              .balanceOf(userAddress)
              .call(null, event.blockNumber)
            const unadjustedPreRebaseBalance = await foxyContract.methods
              .balanceOf(userAddress)
              .call(null, event.blockNumber - 1)

            // unstake events can trigger rebases, if they do, adjust the amount to not include that unstake's transfer amount
            const preRebaseBalanceResult = bnOrZero(unadjustedPreRebaseBalance)
              .minus(unstakedTransferAmount)
              .plus(stakedTransferAmount)
              .toString()

            return {
              preRebaseBalance: preRebaseBalanceResult,
              postRebaseBalance: postRebaseBalanceResult
            }
          } catch (e) {
            console.error(`Failed to get balance of address ${e}`)
            return {
              preRebaseBalance: bnOrZero(0).toString(),
              postRebaseBalance: bnOrZero(0).toString()
            }
          }
        })()

        const blockTime = await (async () => {
          try {
            const block = await this.web3.eth.getBlock(event.blockNumber)
            return bnOrZero(block.timestamp).toNumber()
          } catch (e) {
            console.error(`Failed to get timestamp of block ${e}`)
            return 0
          }
        })()

        return { assetId, preRebaseBalance, postRebaseBalance, blockTime }
      })
    )

    const actualResults = results.reduce<RebaseHistory[]>((acc, cur) => {
      if (cur.status === 'rejected') {
        console.error('getFoxyRebaseHistory: balanceOf call failed - charts will be wrong')
        return acc
      }
      if (cur.value.preRebaseBalance === '0') return acc // don't return rebase history with 0 balance diff

      const balanceDiff = bnOrZero(cur.value.postRebaseBalance)
        .minus(cur.value.preRebaseBalance)
        .toString()

      acc.push({
        balanceDiff,
        ...cur.value
      })
      return acc
    }, [])

    return actualResults
  }
}
