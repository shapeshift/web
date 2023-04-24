import { JsonRpcBatchProvider } from '@ethersproject/providers'
import type { ChainReference } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, CHAIN_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import type { ChainAdapter, FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { Logger } from '@shapeshiftoss/logger'
import { KnownChainIds, WithdrawType } from '@shapeshiftoss/types'
import axios from 'axios'
import type { BigNumber } from 'bignumber.js'
import { ethers } from 'ethers'
import { toLower } from 'lodash'
import { numberToHex } from 'web3-utils'

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
  tokeRewardHashAddress,
} from '../constants'
import { bn, bnOrZero, buildTxToSign } from '../utils'
import type {
  AllowanceInput,
  ApproveInput,
  BalanceInput,
  CanClaimWithdrawParams,
  ClaimWithdrawal,
  ContractAddressInput,
  EstimateApproveFeesInput,
  EstimateFeesTxInput,
  EstimateWithdrawFeesInput,
  FoxyAddressesType,
  FoxyOpportunityInputData,
  GetTokeRewardAmount,
  RebaseEvent,
  RebaseHistory,
  SignAndBroadcastTx,
  StakingContract,
  TokeClaimIpfs,
  TokenAddressInput,
  TxInput,
  TxInputWithoutAmount,
  TxInputWithoutAmountAndWallet,
  TxReceipt,
  WithdrawInfo,
  WithdrawInput,
} from './foxy-types'

export * from './foxy-types'

const logger = new Logger({ namespace: ['investor-foxy', 'api'] })

type EthereumChainReference =
  | typeof CHAIN_REFERENCE.EthereumMainnet
  | typeof CHAIN_REFERENCE.EthereumRinkeby
  | typeof CHAIN_REFERENCE.EthereumRopsten

export type ConstructorArgs = {
  adapter: ChainAdapter<KnownChainIds.EthereumMainnet>
  providerUrl: string
  foxyAddresses: FoxyAddressesType
  chainReference?: EthereumChainReference
}

export const transformData = ({ tvl, apy, expired, ...contractData }: FoxyOpportunityInputData) => {
  return {
    type: DefiType.Staking,
    provider: 'ShapeShift',
    version: '1',
    contractAddress: contractData.staking,
    rewardToken: contractData.foxy,
    stakingToken: contractData.fox,
    chain: KnownChainIds.EthereumMainnet,
    tvl,
    apy,
    expired,
  }
}

const TOKE_IPFS_URL = 'https://ipfs.tokemaklabs.xyz/ipfs'

export class FoxyApi {
  public adapter: ChainAdapter<KnownChainIds.EthereumMainnet>
  public provider: JsonRpcBatchProvider
  private providerUrl: string
  public jsonRpcProvider: JsonRpcBatchProvider
  private foxyStakingContracts: ethers.Contract[]
  private liquidityReserveContracts: ethers.Contract[]
  private readonly ethereumChainReference: ChainReference
  private foxyAddresses: FoxyAddressesType

  constructor({
    adapter,
    providerUrl,
    foxyAddresses,
    chainReference = CHAIN_REFERENCE.EthereumMainnet,
  }: ConstructorArgs) {
    this.adapter = adapter
    this.provider = new JsonRpcBatchProvider(providerUrl)
    this.jsonRpcProvider = new JsonRpcBatchProvider(providerUrl)
    this.foxyStakingContracts = foxyAddresses.map(
      addresses => new ethers.Contract(addresses.staking, foxyStakingAbi, this.provider),
    )
    this.liquidityReserveContracts = foxyAddresses.map(
      addresses =>
        new ethers.Contract(addresses.liquidityReserve, liquidityReserveAbi, this.provider),
    )
    this.ethereumChainReference = chainReference
    this.providerUrl = providerUrl
    this.foxyAddresses = foxyAddresses
  }

  /**
   * Very large amounts like those found in ERC20s with a precision of 18 get converted
   * to exponential notation ('1.6e+21') in javascript.
   * @param amount
   */
  private normalizeAmount(amount: BigNumber): ethers.BigNumber {
    return ethers.BigNumber.from(amount.toFixed())
  }

  private async signAndBroadcastTx(input: SignAndBroadcastTx): Promise<string> {
    const { payload, wallet, dryRun } = input
    const txToSign = buildTxToSign(payload)
    if (wallet.supportsOfflineSigning()) {
      const signedTx = await this.adapter.signTransaction({ txToSign, wallet })
      if (dryRun) return signedTx
      try {
        if (this.providerUrl.includes('localhost') || this.providerUrl.includes('127.0.0.1')) {
          const sendSignedTx = await this.provider.sendTransaction(signedTx)
          return sendSignedTx?.blockHash ?? ''
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
    // ethers always returns checksum addresses from getAddress() calls
    return ethers.utils.getAddress(address)
  }

  private verifyAddresses(addresses: string[]) {
    try {
      addresses.forEach(address => {
        this.checksumAddress(address)
      })
    } catch (e) {
      throw new Error(`Verify Address: ${e}`)
    }
  }

  private getStakingContract(contractAddress: string): ethers.Contract {
    const stakingContract = this.foxyStakingContracts.find(
      item => toLower(item.address) === toLower(contractAddress),
    )
    if (!stakingContract) throw new Error('Not a valid contract address')
    return stakingContract
  }

  private getLiquidityReserveContract(liquidityReserveAddress: string): ethers.Contract {
    const liquidityReserveContract = this.liquidityReserveContracts.find(
      item => toLower(item.address) === toLower(liquidityReserveAddress),
    )
    if (!liquidityReserveContract) throw new Error('Not a valid reserve contract address')
    return liquidityReserveContract
  }

  private async getNonce(userAddress: string): Promise<{ nonce: string }> {
    let nonce
    try {
      nonce = (await this.provider.getTransactionCount(userAddress)).toString()
    } catch (e) {
      throw new Error(`Get nonce Error: ${e}`)
    }

    return { nonce }
  }

  async getFoxyOpportunities() {
    try {
      const opportunities = await Promise.all(
        this.foxyAddresses.map(async addresses => {
          const stakingContract = this.foxyStakingContracts.find(
            item => toLower(item.address) === toLower(addresses.staking),
          )
          try {
            const expired = await stakingContract?.pauseStaking()
            const tvl = await this.tvl({ tokenContractAddress: addresses.foxy })
            const apy = this.apy()
            return transformData({ ...addresses, expired, tvl, apy })
          } catch (e) {
            throw new Error(`Failed to get contract data ${e}`)
          }
        }),
      )
      return opportunities
    } catch (e) {
      throw new Error(`getFoxyOpportunities Error: ${e}`)
    }
  }

  async getFoxyOpportunityByStakingAddress(stakingAddress: string) {
    this.verifyAddresses([stakingAddress])
    const addresses = this.foxyAddresses.find(item => {
      return item.staking === stakingAddress
    })
    if (!addresses) throw new Error('Not a valid address')

    const stakingContract = this.getStakingContract(addresses.staking)

    try {
      const expired = await stakingContract.pauseStaking()
      const tvl = await this.tvl({ tokenContractAddress: addresses.foxy })
      const apy = this.apy()
      return transformData({ ...addresses, tvl, apy, expired })
    } catch (e) {
      throw new Error(`Failed to get contract data ${e}`)
    }
  }

  getTxReceipt({ txid }: TxReceipt): Promise<ethers.providers.TransactionReceipt> {
    if (!txid) throw new Error('Must pass txid')
    return this.provider.getTransactionReceipt(txid)
  }

  async estimateClaimWithdrawFees(
    input: ClaimWithdrawal,
  ): Promise<FeeDataEstimate<KnownChainIds.EthereumMainnet>> {
    const { claimAddress, userAddress, contractAddress } = input
    const addressToClaim = claimAddress ?? userAddress
    this.verifyAddresses([addressToClaim, userAddress, contractAddress])

    const stakingContract = this.getStakingContract(contractAddress)

    try {
      const data = stakingContract.interface.encodeFunctionData('claimWithdraw', [addressToClaim])
      const estimatedFees = await this.adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: userAddress,
        },
      })

      const {
        chainSpecific: { gasLimit: gasLimitBase },
      } = estimatedFees.fast
      const safeGasLimit = bnOrZero(gasLimitBase).times('1.05').toFixed(0)
      estimatedFees.fast.chainSpecific.gasLimit = safeGasLimit

      return estimatedFees
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async estimateSendWithdrawalRequestsFees(
    input: TxInputWithoutAmountAndWallet,
  ): Promise<FeeDataEstimate<KnownChainIds.EthereumMainnet>> {
    const { userAddress, contractAddress } = input
    this.verifyAddresses([userAddress, contractAddress])

    const stakingContract = this.getStakingContract(contractAddress)

    try {
      const data = stakingContract.interface.encodeFunctionData('sendWithdrawalRequests', [])
      const estimatedFees = await this.adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: userAddress,
        },
      })

      const {
        chainSpecific: { gasLimit: gasLimitBase },
      } = estimatedFees.fast
      const safeGasLimit = bnOrZero(gasLimitBase).times('1.05').toFixed(0)
      estimatedFees.fast.chainSpecific.gasLimit = safeGasLimit

      return estimatedFees
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async estimateAddLiquidityFees(
    input: EstimateFeesTxInput,
  ): Promise<FeeDataEstimate<KnownChainIds.EthereumMainnet>> {
    const { amountDesired, userAddress, contractAddress } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!amountDesired.gt(0)) throw new Error('Must send valid amount')

    const liquidityReserveContract = this.getLiquidityReserveContract(contractAddress)

    try {
      const data = liquidityReserveContract.interface.encodeFunctionData('addLiquidity', [
        this.normalizeAmount(amountDesired),
      ])
      const estimatedFees = await this.adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: userAddress,
        },
      })

      const {
        chainSpecific: { gasLimit: gasLimitBase },
      } = estimatedFees.fast
      const safeGasLimit = bnOrZero(gasLimitBase).times('1.05').toFixed(0)
      estimatedFees.fast.chainSpecific.gasLimit = safeGasLimit

      return estimatedFees
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async estimateRemoveLiquidityFees(
    input: EstimateFeesTxInput,
  ): Promise<FeeDataEstimate<KnownChainIds.EthereumMainnet>> {
    const { amountDesired, userAddress, contractAddress } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!amountDesired.gt(0)) throw new Error('Must send valid amount')

    const liquidityReserveContract = this.getLiquidityReserveContract(contractAddress)

    try {
      const data = liquidityReserveContract.encodeFunctionData('removeLiquidity', [
        this.normalizeAmount(amountDesired),
      ])

      const estimatedFees = await this.adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: userAddress,
        },
      })

      const {
        chainSpecific: { gasLimit: gasLimitBase },
      } = estimatedFees.fast
      const safeGasLimit = bnOrZero(gasLimitBase).times('1.05').toFixed(0)
      estimatedFees.fast.chainSpecific.gasLimit = safeGasLimit

      return estimatedFees
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async estimateWithdrawFees(
    input: EstimateWithdrawFeesInput,
  ): Promise<FeeDataEstimate<KnownChainIds.EthereumMainnet>> {
    const { amountDesired, userAddress, contractAddress, type } = input
    this.verifyAddresses([userAddress, contractAddress])

    const stakingContract = this.getStakingContract(contractAddress)

    const isDelayed = type === WithdrawType.DELAYED && amountDesired
    if (isDelayed && !amountDesired.gt(0)) throw new Error('Must send valid amount')

    try {
      const data = isDelayed
        ? stakingContract.interface.encodeFunctionData('unstake(uint256,bool)', [
            this.normalizeAmount(amountDesired),
            true,
          ])
        : stakingContract.interface.encodeFunctionData('instantUnstake', [true])

      const estimatedFees = await this.adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: userAddress,
        },
      })

      const {
        chainSpecific: { gasLimit: gasLimitBase },
      } = estimatedFees.fast
      const safeGasLimit = bnOrZero(gasLimitBase).times('1.05').toFixed(0)
      estimatedFees.fast.chainSpecific.gasLimit = safeGasLimit

      return estimatedFees
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async estimateApproveFees(
    input: EstimateApproveFeesInput,
  ): Promise<FeeDataEstimate<KnownChainIds.EthereumMainnet>> {
    const { userAddress, tokenContractAddress, contractAddress } = input
    this.verifyAddresses([userAddress, contractAddress, tokenContractAddress])

    const depositTokenContract = new ethers.Contract(tokenContractAddress, erc20Abi, this.provider)

    try {
      const data = depositTokenContract.interface.encodeFunctionData('approve', [
        contractAddress,
        MAX_ALLOWANCE,
      ])
      const estimatedFees = await this.adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: userAddress,
        },
      })

      const {
        chainSpecific: { gasLimit: gasLimitBase },
      } = estimatedFees.fast
      const safeGasLimit = bnOrZero(gasLimitBase).times('1.05').toFixed(0)
      estimatedFees.fast.chainSpecific.gasLimit = safeGasLimit

      return estimatedFees
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async estimateDepositFees(
    input: EstimateFeesTxInput,
  ): Promise<FeeDataEstimate<KnownChainIds.EthereumMainnet>> {
    const { amountDesired, userAddress, contractAddress } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!amountDesired.gt(0)) throw new Error('Must send valid amount')

    const stakingContract = this.getStakingContract(contractAddress)

    try {
      const data = stakingContract.interface.encodeFunctionData('stake(uint256)', [
        this.normalizeAmount(amountDesired),
      ])

      const estimatedFees = await this.adapter.getFeeData({
        to: contractAddress,
        value: '0',
        chainSpecific: {
          contractData: data,
          from: userAddress,
        },
      })

      const {
        chainSpecific: { gasLimit: gasLimitBase },
      } = estimatedFees.fast
      const safeGasLimit = bnOrZero(gasLimitBase).times('1.05').toFixed(0)
      estimatedFees.fast.chainSpecific.gasLimit = safeGasLimit

      return estimatedFees
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async approve(input: ApproveInput): Promise<string> {
    const {
      amount,
      bip44Params,
      dryRun = false,
      tokenContractAddress,
      userAddress,
      wallet,
      contractAddress,
    } = input
    this.verifyAddresses([userAddress, contractAddress, tokenContractAddress])
    if (!wallet) throw new Error('Missing inputs')

    let estimatedFees: FeeDataEstimate<KnownChainIds.EthereumMainnet>
    try {
      estimatedFees = await this.estimateApproveFees(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }
    const depositTokenContract = new ethers.Contract(tokenContractAddress, erc20Abi, this.provider)
    const data: string = depositTokenContract.interface.encodeFunctionData('approve', [
      contractAddress,
      amount ? numberToHex(bnOrZero(amount).toString()) : MAX_ALLOWANCE,
    ])

    const { nonce } = await this.getNonce(userAddress)
    const chainReferenceAsNumber = Number(this.ethereumChainReference)
    const payload = {
      bip44Params,
      chainId: chainReferenceAsNumber,
      data,
      estimatedFees,
      nonce,
      to: tokenContractAddress,
      value: '0',
    }
    return this.signAndBroadcastTx({ payload, wallet, dryRun })
  }

  async allowance(input: AllowanceInput): Promise<string> {
    const { userAddress, tokenContractAddress, contractAddress } = input
    this.verifyAddresses([userAddress, contractAddress, tokenContractAddress])

    const depositTokenContract: ethers.Contract = new ethers.Contract(
      tokenContractAddress,
      erc20Abi,
      this.provider,
    )

    let allowance
    try {
      allowance = await depositTokenContract.allowance(userAddress, contractAddress)
    } catch (e) {
      throw new Error(`Failed to get allowance ${e}`)
    }
    return allowance.toString()
  }

  async deposit(input: TxInput): Promise<string> {
    const {
      amountDesired,
      bip44Params,
      dryRun = false,
      contractAddress,
      userAddress,
      wallet,
    } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!amountDesired.gt(0)) throw new Error('Must send valid amount')
    if (!wallet) throw new Error('Missing inputs')

    let estimatedFees: FeeDataEstimate<KnownChainIds.EthereumMainnet>
    try {
      estimatedFees = await this.estimateDepositFees(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }

    const stakingContract = this.getStakingContract(contractAddress)

    const data = stakingContract.interface.encodeFunctionData('stake(uint256,address)', [
      this.normalizeAmount(amountDesired),
      userAddress,
    ])

    const { nonce } = await this.getNonce(userAddress)
    const chainReferenceAsNumber = Number(this.ethereumChainReference)
    const payload = {
      bip44Params,
      chainId: chainReferenceAsNumber,
      data,
      estimatedFees,
      nonce,
      to: contractAddress,
      value: '0',
    }
    return this.signAndBroadcastTx({ payload, wallet, dryRun })
  }

  async withdraw(input: WithdrawInput): Promise<string> {
    const {
      amountDesired,
      bip44Params,
      dryRun = false,
      contractAddress,
      userAddress,
      type,
      wallet,
    } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!wallet) throw new Error('Missing inputs')

    let estimatedFees: FeeDataEstimate<KnownChainIds.EthereumMainnet>
    try {
      estimatedFees = await this.estimateWithdrawFees(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }

    const stakingContract = this.getStakingContract(contractAddress)

    const isDelayed = type === WithdrawType.DELAYED && amountDesired
    if (isDelayed && !amountDesired.gt(0)) throw new Error('Must send valid amount')

    const stakingContractCallInput: Parameters<
      typeof stakingContract.interface.encodeFunctionData
    > = isDelayed
      ? ['unstake(uint256,bool)', [this.normalizeAmount(amountDesired), true]]
      : ['instantUnstake', ['true']]
    const data: string = stakingContract.interface.encodeFunctionData(...stakingContractCallInput)

    const { nonce } = await this.getNonce(userAddress)
    const chainReferenceAsNumber = Number(this.ethereumChainReference)
    const payload = {
      bip44Params,
      chainId: chainReferenceAsNumber,
      data,
      estimatedFees,
      nonce,
      to: contractAddress,
      value: '0',
    }
    return this.signAndBroadcastTx({ payload, wallet, dryRun })
  }

  async canClaimWithdraw(input: CanClaimWithdrawParams): Promise<boolean> {
    const { userAddress, contractAddress } = input
    const tokeManagerContract = new ethers.Contract(
      tokeManagerAddress,
      tokeManagerAbi,
      this.provider,
    )
    const tokePoolContract = new ethers.Contract(tokePoolAddress, tokePoolAbi, this.provider)
    const stakingContract = this.getStakingContract(contractAddress)

    const coolDownInfo = await (async () => {
      try {
        const coolDown = await stakingContract.coolDownInfo(userAddress)
        return {
          ...coolDown,
          endEpoch: coolDown.expiry,
        }
      } catch (e) {
        logger.error(e, 'failed to get coolDowninfo')
      }
    })()

    const epoch = await (() => {
      try {
        return stakingContract.epoch()
      } catch (e) {
        logger.error(e, 'failed to get epoch')
        return {}
      }
    })()

    const requestedWithdrawals = await (() => {
      try {
        return tokePoolContract.requestedWithdrawals(stakingContract.address)
      } catch (e) {
        logger.error(e, 'failed to get requestedWithdrawals')
        return {}
      }
    })()

    const currentCycleIndex = await (() => {
      try {
        return tokeManagerContract.getCurrentCycleIndex()
      } catch (e) {
        logger.error(e, 'failed to get currentCycleIndex')
        return 0
      }
    })()

    const withdrawalAmount = await (() => {
      try {
        return stakingContract.withdrawalAmount()
      } catch (e) {
        logger.error(e, 'failed to get currentCycleIndex')
        return 0
      }
    })()

    const epochExpired = epoch.number >= coolDownInfo.endEpoch
    const coolDownValid =
      !bnOrZero(coolDownInfo.endEpoch).eq(0) && !bnOrZero(coolDownInfo.amount).eq(0)

    const pastTokeCycleIndex = bnOrZero(requestedWithdrawals.minCycle).lte(currentCycleIndex)
    const stakingTokenAvailableWithTokemak = bnOrZero(requestedWithdrawals.amount).plus(
      withdrawalAmount,
    )
    const stakingTokenAvailable = bnOrZero(withdrawalAmount).gte(coolDownInfo.amount)
    const validCycleAndAmount =
      (pastTokeCycleIndex && stakingTokenAvailableWithTokemak.gte(coolDownInfo.amount)) ||
      stakingTokenAvailable

    return epochExpired && coolDownValid && validCycleAndAmount
  }

  async claimWithdraw(input: ClaimWithdrawal): Promise<string> {
    const {
      bip44Params,
      dryRun = false,
      contractAddress,
      userAddress,
      claimAddress,
      wallet,
    } = input
    const addressToClaim = claimAddress ?? userAddress
    this.verifyAddresses([userAddress, contractAddress, addressToClaim])
    if (!wallet) throw new Error('Missing inputs')

    let estimatedFees: FeeDataEstimate<KnownChainIds.EthereumMainnet>
    try {
      estimatedFees = await this.estimateClaimWithdrawFees(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }

    const stakingContract = this.getStakingContract(contractAddress)

    const canClaim = await this.canClaimWithdraw({ userAddress, contractAddress })
    if (!canClaim) throw new Error('Not ready to claim')

    const data: string = stakingContract.interface.encodeFunctionData('claimWithdraw', [
      addressToClaim,
    ])

    const { nonce } = await this.getNonce(userAddress)
    const chainReferenceAsNumber = Number(this.ethereumChainReference)
    const payload = {
      bip44Params,
      chainId: chainReferenceAsNumber,
      data,
      estimatedFees,
      nonce,
      to: contractAddress,
      value: '0',
    }
    return this.signAndBroadcastTx({ payload, wallet, dryRun })
  }

  async canSendWithdrawalRequest(input: StakingContract): Promise<boolean> {
    const { stakingContract } = input
    const tokeManagerContract = new ethers.Contract(
      tokeManagerAddress,
      tokeManagerAbi,
      this.provider,
    )

    const requestWithdrawalAmount = await (() => {
      try {
        return stakingContract.requestWithdrawalAmount()
      } catch (e) {
        logger.error(e, 'failed to get requestWithdrawalAmount')
        return 0
      }
    })()

    const timeLeftToRequestWithdrawal = await (() => {
      try {
        return stakingContract.timeLeftToRequestWithdrawal()
      } catch (e) {
        logger.error(e, 'failed to get timeLeftToRequestWithdrawal')
        return 0
      }
    })()

    const lastTokeCycleIndex = await (() => {
      try {
        return stakingContract.methods.lastTokeCycleIndex().call()
      } catch (err) {
        logger.error(err, 'failed to get lastTokeCycleIndex')
        return 0
      }
    })()

    const duration = await (() => {
      try {
        return tokeManagerContract.getCycleDuration()
      } catch (e) {
        logger.error(e, 'failed to get cycleDuration')
        return 0
      }
    })()

    const currentCycleIndex = await (() => {
      try {
        return tokeManagerContract.getCurrentCycleIndex()
      } catch (e) {
        logger.error(e, 'failed to get currentCycleIndex')
        return 0
      }
    })()

    const currentCycleStart = await (() => {
      try {
        return tokeManagerContract.getCurrentCycle()
      } catch (e) {
        logger.error(e, 'failed to get currentCycle')
        return 0
      }
    })()

    const nextCycleStart = bnOrZero(currentCycleStart).plus(duration)

    const blockNumber = await this.provider.getBlockNumber()
    const timestamp = (await this.provider.getBlock(blockNumber)).timestamp

    const isTimeToRequest = bnOrZero(timestamp)
      .plus(timeLeftToRequestWithdrawal)
      .gte(nextCycleStart)
    const isCorrectIndex = bnOrZero(currentCycleIndex).gt(lastTokeCycleIndex)
    const hasAmount = bnOrZero(requestWithdrawalAmount).gt(0)

    return isTimeToRequest && isCorrectIndex && hasAmount
  }

  async sendWithdrawalRequests(input: TxInputWithoutAmount): Promise<string> {
    const { bip44Params, dryRun = false, contractAddress, userAddress, wallet } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!wallet || !contractAddress) throw new Error('Missing inputs')

    let estimatedFees: FeeDataEstimate<KnownChainIds.EthereumMainnet>
    try {
      estimatedFees = await this.estimateSendWithdrawalRequestsFees(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }

    const stakingContract = this.getStakingContract(contractAddress)

    const canSendRequest = await this.canSendWithdrawalRequest({ stakingContract })
    if (!canSendRequest) throw new Error('Not ready to send request')

    const data: string = stakingContract.interface.encodeFunctionData('sendWithdrawalRequests')
    const { nonce } = await this.getNonce(userAddress)
    const chainReferenceAsNumber = Number(this.ethereumChainReference)
    const payload = {
      bip44Params,
      chainId: chainReferenceAsNumber,
      data,
      estimatedFees,
      nonce,
      to: contractAddress,
      value: '0',
    }
    return this.signAndBroadcastTx({ payload, wallet, dryRun })
  }

  // not a user facing function
  // utility function for the dao to add liquidity to the lrContract for instantUnstaking
  async addLiquidity(input: TxInput): Promise<string> {
    const {
      amountDesired,
      bip44Params,
      dryRun = false,
      contractAddress,
      userAddress,
      wallet,
    } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!amountDesired.gt(0)) throw new Error('Must send valid amount')

    if (!wallet) throw new Error('Missing inputs')

    let estimatedFees: FeeDataEstimate<KnownChainIds.EthereumMainnet>
    try {
      estimatedFees = await this.estimateAddLiquidityFees(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }

    const liquidityReserveContract = this.getLiquidityReserveContract(contractAddress)

    const data: string = liquidityReserveContract.interface.encodeFunctionData('addLiquidity', [
      this.normalizeAmount(amountDesired),
    ])

    const { nonce } = await this.getNonce(userAddress)
    const chainReferenceAsNumber = Number(this.ethereumChainReference)
    const payload = {
      bip44Params,
      chainId: chainReferenceAsNumber,
      data,
      estimatedFees,
      nonce,
      to: contractAddress,
      value: '0',
    }
    return this.signAndBroadcastTx({ payload, wallet, dryRun })
  }

  // not a user facing function
  // utility function for the dao to remove liquidity to the lrContract for instantUnstaking
  async removeLiquidity(input: TxInput): Promise<string> {
    const {
      amountDesired,
      bip44Params,
      dryRun = false,
      contractAddress,
      userAddress,
      wallet,
    } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!amountDesired.gt(0)) throw new Error('Must send valid amount')
    if (!wallet) throw new Error('Missing inputs')

    let estimatedFees: FeeDataEstimate<KnownChainIds.EthereumMainnet>
    try {
      estimatedFees = await this.estimateRemoveLiquidityFees(input)
    } catch (e) {
      throw new Error(`Estimate Gas Error: ${e}`)
    }

    const liquidityReserveContract = this.getLiquidityReserveContract(contractAddress)

    const data: string = liquidityReserveContract.interface.encodeFunctionData('removeLiquidity', [
      this.normalizeAmount(amountDesired),
    ])

    const { nonce } = await this.getNonce(userAddress)
    const chainReferenceAsNumber = Number(this.ethereumChainReference)
    const payload = {
      bip44Params,
      chainId: chainReferenceAsNumber,
      data,
      estimatedFees,
      nonce,
      to: contractAddress,
      value: '0',
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
      const coolDown = await stakingContract.coolDownInfo(userAddress)
      coolDownInfo = {
        ...coolDown,
        endEpoch: coolDown.expiry,
      }
    } catch (e) {
      throw new Error(`Failed to get coolDowninfo: ${e}`)
    }
    let epoch
    try {
      epoch = await stakingContract.epoch()
    } catch (e) {
      throw new Error(`Failed to get epoch: ${e}`)
    }
    let currentBlock
    try {
      currentBlock = await this.provider.getBlockNumber()
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

    const contract = new ethers.Contract(tokenContractAddress, erc20Abi, this.provider)
    try {
      const balance = await contract.balanceOf(userAddress)
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
      liquidityReserveAddress = await stakingContract.LIQUIDITY_RESERVE()
    } catch (e) {
      throw new Error(`Failed to get liquidityReserve address ${e}`)
    }
    const liquidityReserveContract = this.getLiquidityReserveContract(liquidityReserveAddress)
    try {
      const feeInBasisPoints = await liquidityReserveContract.fee()
      return bnOrZero(feeInBasisPoints).div(10000) // convert from basis points to decimal percentage
    } catch (e) {
      throw new Error(`Failed to get instantUnstake fee ${e}`)
    }
  }

  async totalSupply({ tokenContractAddress }: TokenAddressInput): Promise<BigNumber> {
    this.verifyAddresses([tokenContractAddress])
    const contract = new ethers.Contract(tokenContractAddress, erc20Abi, this.provider)

    try {
      const totalSupply = await contract.totalSupply()
      return bnOrZero(totalSupply)
    } catch (e) {
      throw new Error(`Failed to get totalSupply: ${e}`)
    }
  }

  pricePerShare(): BigNumber {
    return bn(1).times('1e+18')
  }

  // TODO: use tokemak's api to get apy when they build it
  apy(): string {
    return '.15'
  }

  async tvl(input: TokenAddressInput): Promise<BigNumber> {
    const { tokenContractAddress } = input
    this.verifyAddresses([tokenContractAddress])
    const contract = new ethers.Contract(tokenContractAddress, foxyAbi, this.provider)

    try {
      const balance = await contract.circulatingSupply()
      return bnOrZero(balance)
    } catch (e) {
      throw new Error(`Failed to get tvl: ${e}`)
    }
  }

  async getWithdrawInfo(input: TxInputWithoutAmountAndWallet): Promise<WithdrawInfo> {
    const { contractAddress, userAddress } = input
    this.verifyAddresses([userAddress, contractAddress])
    const stakingContract = this.getStakingContract(contractAddress)

    let coolDownInfo: [amount: string, gons: string, expiry: string]
    try {
      coolDownInfo = (await stakingContract.coolDownInfo(userAddress)).map(
        (info: ethers.BigNumber) => info.toString(),
      )
    } catch (e) {
      throw new Error(`Failed to get coolDowninfo: ${e}`)
    }
    let releaseTime
    try {
      releaseTime = await this.getTimeUntilClaimable(input)
    } catch (e) {
      throw new Error(`Failed to getTimeUntilClaimable: ${e}`)
    }

    const [amount, gons, expiry] = coolDownInfo
    return {
      amount,
      gons,
      expiry,
      releaseTime,
    }
  }

  async getClaimFromTokemakArgs(input: ContractAddressInput): Promise<GetTokeRewardAmount> {
    const { contractAddress } = input
    const rewardHashContract = new ethers.Contract(
      tokeRewardHashAddress,
      tokeRewardHashAbi,
      this.provider,
    )
    const latestCycleIndex = await (() => {
      try {
        return rewardHashContract.latestCycleIndex()
      } catch (e) {
        throw new Error(`Failed to get latestCycleIndex, ${e}`)
      }
    })()
    const cycleHashes = await (() => {
      try {
        return rewardHashContract.cycleHashes(latestCycleIndex)
      } catch (e) {
        throw new Error(`Failed to get latestCycleIndex, ${e}`)
      }
    })()

    try {
      const { latestClaimable } = cycleHashes
      const response = await axios.get<TokeClaimIpfs>(
        `${TOKE_IPFS_URL}/${latestClaimable}/${contractAddress.toLowerCase()}.json`,
      )
      const {
        data: { payload, signature },
      } = response

      const v = signature.v
      const r = signature.r
      const s = signature.s
      return {
        v,
        r,
        s,
        recipient: payload,
      }
    } catch (e) {
      throw new Error(`Failed to get information from Tokemak ipfs ${e}`)
    }
  }

  async getRebaseHistory(input: BalanceInput) {
    const { tokenContractAddress, userAddress } = input
    this.verifyAddresses([tokenContractAddress])

    const foxyContract = new ethers.Contract(tokenContractAddress, foxyAbi, this.provider)
    const fromBlock = 14381454 // genesis rebase

    const rebaseEvents = await (async () => {
      try {
        const filter = foxyContract.filters.LogRebase()
        const events = await foxyContract.queryFilter(filter, fromBlock, 'latest')
        const filteredEvents = events.filter(
          rebase => rebase.args?.rebase && !rebase.args.rebase.isZero(),
        )
        return filteredEvents
      } catch (e) {
        logger.error(e, 'failed to get rebase events')
        return undefined
      }
    })()

    if (!rebaseEvents) return []

    const transferEvents = await (async () => {
      try {
        const filter = foxyContract.filters.Transfer()
        const events = await foxyContract.queryFilter(filter, fromBlock, 'latest')
        return events
      } catch (e) {
        logger.error(e, 'failed to get transfer events')
        return undefined
      }
    })()

    const events: RebaseEvent[] = rebaseEvents.map(rebaseEvent => {
      const { blockNumber, args: { epoch } = { epoch: '' } } = rebaseEvent
      return {
        blockNumber,
        epoch,
      }
    })

    const chainNamespace = CHAIN_NAMESPACE.Evm
    const chainReference = CHAIN_REFERENCE.EthereumMainnet
    const assetNamespace = 'erc20'
    const assetReference = tokenContractAddress
    // foxy assetId
    const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })

    const results = await Promise.allSettled(
      events.map(async event => {
        const { preRebaseBalance, postRebaseBalance } = await (async () => {
          try {
            // check transfer events to see if a user triggered a rebase through unstake or stake
            const unstakedTransferInfo = transferEvents?.filter(
              e =>
                e.blockNumber === event.blockNumber && e.args?.from.toLowerCase() === userAddress,
            )
            const unstakedTransferAmount = unstakedTransferInfo?.[0]?.args?.value ?? 0
            const stakedTransferInfo = transferEvents?.filter(
              e => e.blockNumber === event.blockNumber && e.args?.to.toLowerCase() === userAddress,
            )
            const stakedTransferAmount = stakedTransferInfo?.[0]?.args?.value ?? 0

            const postRebaseBalanceResult = await foxyContract.balanceOf(userAddress, {
              blockTag: event.blockNumber,
            })
            const unadjustedPreRebaseBalance = await foxyContract.balanceOf(userAddress, {
              blockTag: event.blockNumber - 1,
            })

            // unstake events can trigger rebases, if they do, adjust the amount to not include that unstake's transfer amount
            const preRebaseBalanceResult = bnOrZero(unadjustedPreRebaseBalance)
              .minus(unstakedTransferAmount)
              .plus(stakedTransferAmount)
              .toString()

            return {
              preRebaseBalance: preRebaseBalanceResult,
              postRebaseBalance: postRebaseBalanceResult,
            }
          } catch (e) {
            logger.error(e, 'failed to get balance of address')
            return {
              preRebaseBalance: bn(0).toString(),
              postRebaseBalance: bn(0).toString(),
            }
          }
        })()

        const blockTime = await (async () => {
          try {
            const block = await this.provider.getBlock(event.blockNumber)
            return bnOrZero(block.timestamp).toNumber()
          } catch (e) {
            logger.error(e, 'failed to get timestamp of block')
            return 0
          }
        })()

        return { assetId, preRebaseBalance, postRebaseBalance, blockTime }
      }),
    )

    const actualResults = results.reduce<RebaseHistory[]>((acc, cur) => {
      if (cur.status === 'rejected') {
        logger.error('getFoxyRebaseHistory: balanceOf call failed - charts will be wrong')
        return acc
      }
      if (cur.value.preRebaseBalance === '0') return acc // don't return rebase history with 0 balance diff

      const balanceDiff = bnOrZero(cur.value.postRebaseBalance)
        .minus(cur.value.preRebaseBalance)
        .toString()

      acc.push({
        balanceDiff,
        ...cur.value,
      })
      return acc
    }, [])

    return actualResults
  }
}
