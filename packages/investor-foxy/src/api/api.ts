import { JsonRpcProvider } from '@ethersproject/providers'
import { ChainReference } from '@shapeshiftoss/caip/dist/caip2/caip2'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import { BigNumber } from 'bignumber.js'
import { toLower } from 'lodash'
import Web3 from 'web3'
import { HttpProvider, TransactionReceipt } from 'web3-core/types'
import { Contract } from 'web3-eth-contract'

import { DefiType, erc20Abi, foxyStakingAbi, MAX_ALLOWANCE, WithdrawType } from '../constants'
import { foxyAbi } from '../constants/foxy-abi'
import { liquidityReserveAbi } from '../constants/liquidity-reserve-abi'
import { bnOrZero, buildTxToSign } from '../utils'
import {
  AllowanceInput,
  ApproveInput,
  BalanceInput,
  ClaimWithdrawal,
  EstimateGasApproveInput,
  EstimateGasTxInput,
  FoxyAddressesType,
  FoxyOpportunityInputData,
  InstantUnstakeFeeInput,
  SignAndBroadcastTx,
  TokenAddressInput,
  TxInput,
  TxInputWithoutAmount,
  TxInputWithoutAmountAndWallet,
  TxReceipt,
  WithdrawInfo,
  WithdrawInput
} from './foxy-types'

export type ConstructorArgs = {
  adapter: ChainAdapter<ChainTypes>
  providerUrl: string
  foxyAddresses: FoxyAddressesType
  network?:
    | ChainReference.EthereumMainnet
    | ChainReference.EthereumRinkeby
    | ChainReference.EthereumRopsten
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

export class FoxyApi {
  public adapter: ChainAdapter<ChainTypes>
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
    network = ChainReference.EthereumMainnet
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

  private async signAndBroadcastTx(input: SignAndBroadcastTx): Promise<string> {
    const { payload, wallet, dryRun } = input
    const txToSign = buildTxToSign(payload)
    if (wallet.supportsOfflineSigning()) {
      const signedTx = await this.adapter.signTransaction({ txToSign, wallet })
      if (dryRun) return signedTx
      try {
        if (this.providerUrl.includes('localhost')) {
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
        .addLiquidity(amountDesired)
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
        .removeLiquidity(amountDesired)
        .estimateGas({
          from: userAddress
        })
      return bnOrZero(estimatedGas)
    } catch (e) {
      throw new Error(`Failed to get gas ${e}`)
    }
  }

  async estimateWithdrawGas(input: WithdrawInput): Promise<BigNumber> {
    const { amountDesired, userAddress, contractAddress, type } = input
    this.verifyAddresses([userAddress, contractAddress])

    const stakingContract = this.getStakingContract(contractAddress)

    const isDelayed = type === WithdrawType.DELAYED && amountDesired
    if (isDelayed && !amountDesired.gt(0)) throw new Error('Must send valid amount')

    try {
      const estimatedGas = isDelayed
        ? await stakingContract.methods.unstake(amountDesired, true).estimateGas({
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

  async estimateDepositGas(input: EstimateGasTxInput): Promise<BigNumber> {
    const { amountDesired, userAddress, contractAddress } = input
    this.verifyAddresses([userAddress, contractAddress])
    if (!amountDesired.gt(0)) throw new Error('Must send valid amount')

    const stakingContract = this.getStakingContract(contractAddress)

    try {
      const estimatedGas = await stakingContract.methods
        .stake(amountDesired, userAddress)
        .estimateGas({
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

    const data: string = await stakingContract.methods.stake(amountDesired, userAddress).encodeABI({
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
      ? stakingContract.methods.unstake(amountDesired, true).encodeABI({
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

    // TODO: check if can claimWithdraw and throw an error if can't

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

    // TODO: check if can sendWithdrawalRequests and throw an error if can't

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

    const data: string = liquidityReserveContract.methods.addLiquidity(amountDesired).encodeABI({
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

    const data: string = liquidityReserveContract.methods.removeLiquidity(amountDesired).encodeABI({
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

  // returns time in seconds until withdraw request is claimable
  // dependent on rebases happening when epoch.expiry epoch is reached
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
    const epochsLeft = coolDownInfo.endEpoch - epoch.number - 1 // epochs left after the current one
    const blocksLeftInCurrentEpoch =
      epoch.endBlock > currentBlock ? epoch.endBlock - currentBlock : 0
    const blocksLeftInFutureEpochs = epochsLeft > 0 ? epochsLeft * epoch.length : 0
    const blocksUntilClaimable = bnOrZero(blocksLeftInCurrentEpoch).plus(blocksLeftInFutureEpochs)
    const timeUntilClaimable = blocksUntilClaimable.times(13) // average block time is 13 seconds

    return timeUntilClaimable.toString()
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

  async instantUnstakeFee(input: InstantUnstakeFeeInput): Promise<BigNumber> {
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

  // estimated apy
  apy(): string {
    return '.2'
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
}
