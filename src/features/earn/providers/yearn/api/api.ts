import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import axios, { AxiosInstance } from 'axios'
import { BigNumber } from 'bignumber.js'
import { MAX_ALLOWANCE } from 'constants/allowance'
import { toLower } from 'lodash'
import isNil from 'lodash/isNil'
import Web3 from 'web3'
import { TransactionReceipt } from 'web3-core/types'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { erc20Abi } from '../constants/erc20-abi'
import { ssRouterContractAddress } from '../constants/router-contract'
import { ssRouterAbi } from '../constants/ss-router-abi'
import { SUPPORTED_VAULTS } from '../constants/vaults'
import { yv2VaultAbi } from '../constants/yv2Vaults-abi'
import { buildTxToSign } from '../helpers/buildTxToSign'
import {
  Allowanceinput,
  ApproveEstimatedGasInput,
  ApproveInput,
  APYInput,
  BalanceInput,
  TokenInput,
  TxEstimatedGasInput,
  TxInput
} from './yearn-types'

export type ConstructorArgs = {
  adapter: ChainAdapter<ChainTypes.Ethereum>
  providerUrl: string
}

export type YearnVault = {
  inception: number
  address: string
  symbol: string
  name: string
  display_name: string
  icon: string
  token: {
    name: string
    symbol: string
    address: string
    decimals: number
    display_name: string
    icon: string
  }
  tvl: {
    total_assets: number
    price: number
    tvl: number
  }
  apy: {
    net_apy: number
  }
  endorsed: boolean
  version: string
  decimals: number
  type: string
  emergency_shutdown: boolean
}

export class YearnVaultApi {
  public adapter: ChainAdapter<ChainTypes.Ethereum>
  public provider: any
  public web3: Web3
  public vaults: YearnVault[]
  public yearnClient: AxiosInstance
  private ssRouterContract: any

  constructor({ adapter, providerUrl }: ConstructorArgs) {
    this.adapter = adapter
    this.provider = new Web3.providers.HttpProvider(providerUrl)
    this.web3 = new Web3(this.provider)
    this.yearnClient = axios.create({
      baseURL: 'https://api.yearn.finance/v1'
    })
    this.ssRouterContract = new this.web3.eth.Contract(ssRouterAbi, ssRouterContractAddress)
    this.vaults = []
  }

  async initialize() {
    this.vaults = await this.findAll()
  }

  async findAll() {
    const response = await this.yearnClient.get(`/chains/1/vaults/all`)
    return response.data.filter((vault: YearnVault) =>
      SUPPORTED_VAULTS.find(supported => toLower(supported.vaultAddress) === toLower(vault.address))
    )
  }

  findByDepositTokenId(tokenId: string) {
    const vault = this.vaults.find(item => toLower(item.token.address) === toLower(tokenId))
    if (!vault) return null
    return vault
  }

  findByVaultTokenId(vaultAddress: string) {
    const vault = this.vaults.find(item => toLower(item.address) === toLower(vaultAddress))
    if (!vault) return null
    return vault
  }

  async getGasPrice() {
    const gasPrice = await this.web3.eth.getGasPrice()
    return bnOrZero(gasPrice)
  }

  async getTxReceipt({ txid }: { txid: string }): Promise<TransactionReceipt> {
    return await this.web3.eth.getTransactionReceipt(txid)
  }

  checksumAddress(address: string): string {
    return this.web3.utils.toChecksumAddress(address)
  }

  // From the token contract address and vault address, we need to get the vault id. The router
  // contract needs the vault id to know which vault it is dealing with when depositing, since it
  // takes a token address and a vault id.
  async getVaultId({
    tokenContractAddress,
    vaultAddress
  }: {
    tokenContractAddress: string
    vaultAddress: string
  }): Promise<number> {
    const numVaults = await this.ssRouterContract.methods
      .numVaults(this.checksumAddress(tokenContractAddress))
      .call()
    let id: number | null = null
    for (let i = 0; i <= numVaults && isNil(id); i++) {
      const result = await this.ssRouterContract.methods
        .vaults(this.checksumAddress(tokenContractAddress), i)
        .call()
      if (result === this.checksumAddress(vaultAddress)) id = i
    }
    if (isNil(id))
      throw new Error(
        `Could not find vault id for token: ${tokenContractAddress} vault: ${vaultAddress}`
      )
    return id
  }

  async approveEstimatedGas(input: ApproveEstimatedGasInput): Promise<BigNumber> {
    const { userAddress, tokenContractAddress } = input
    const depositTokenContract = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)
    const estimatedGas = await depositTokenContract.methods
      .approve(ssRouterContractAddress, MAX_ALLOWANCE)
      .estimateGas({
        from: userAddress
      })
    return bnOrZero(estimatedGas)
  }

  async approve(input: ApproveInput): Promise<string> {
    const { accountNumber = 0, dryRun = false, tokenContractAddress, userAddress, wallet } = input
    if (!wallet) throw new Error('Missing inputs')
    const estimatedGas: BigNumber = await this.approveEstimatedGas(input)
    const depositTokenContract = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)
    const data: string = depositTokenContract.methods
      .approve(ssRouterContractAddress, MAX_ALLOWANCE)
      .encodeABI({
        from: userAddress
      })
    const nonce: number = await this.web3.eth.getTransactionCount(userAddress)
    const gasPrice: string = await this.web3.eth.getGasPrice()

    const txToSign = buildTxToSign({
      bip44Params: this.adapter.buildBIP44Params({ accountNumber }),
      chainId: 1,
      data,
      estimatedGas: estimatedGas.toString(),
      gasPrice,
      nonce: String(nonce),
      to: tokenContractAddress,
      value: '0'
    })
    if (wallet.supportsOfflineSigning()) {
      const signedTx = await this.adapter.signTransaction({ txToSign, wallet })
      if (dryRun) return signedTx
      return this.adapter.broadcastTransaction(signedTx)
    } else if (wallet.supportsBroadcast() && this.adapter.signAndBroadcastTransaction) {
      if (dryRun) {
        throw new Error(`Cannot perform a dry run with wallet of type ${wallet.getVendor()}`)
      }
      return this.adapter.signAndBroadcastTransaction({ txToSign, wallet })
    } else {
      throw new Error('Invalid HDWallet configuration ')
    }
  }

  async allowance(input: Allowanceinput): Promise<string> {
    const { userAddress, tokenContractAddress } = input
    const depositTokenContract: any = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)
    return depositTokenContract.methods.allowance(userAddress, ssRouterContractAddress).call()
  }

  async depositEstimatedGas(input: TxEstimatedGasInput): Promise<BigNumber> {
    const { amountDesired, userAddress, tokenContractAddress, vaultAddress } = input

    const vaultIndex = await this.getVaultId({ tokenContractAddress, vaultAddress })
    const tokenChecksum = this.web3.utils.toChecksumAddress(tokenContractAddress)
    const userChecksum = this.web3.utils.toChecksumAddress(userAddress)
    const estimatedGas = await this.ssRouterContract.methods
      .deposit(tokenChecksum, userChecksum, amountDesired.toString(), vaultIndex)
      .estimateGas({
        value: 0,
        from: userChecksum
      })
    return bnOrZero(estimatedGas)
  }

  async deposit(input: TxInput): Promise<string> {
    const {
      amountDesired,
      accountNumber = 0,
      dryRun = false,
      tokenContractAddress,
      vaultAddress,
      userAddress,
      wallet
    } = input
    if (!wallet || !vaultAddress) throw new Error('Missing inputs')
    const estimatedGas: BigNumber = await this.depositEstimatedGas(input)

    // In order to properly earn affiliate revenue, we must deposit to the vault through the SS
    // router contract. This is not necessary for withdraws. We can withdraw directly from the vault
    // without affecting the DAOs affiliate revenue.
    const tokenChecksum = this.web3.utils.toChecksumAddress(tokenContractAddress)
    const userChecksum = this.web3.utils.toChecksumAddress(userAddress)
    const vaultIndex = await this.getVaultId({ tokenContractAddress, vaultAddress })
    const data: string = await this.ssRouterContract.methods
      .deposit(tokenChecksum, userChecksum, amountDesired.toString(), vaultIndex)
      .encodeABI({
        value: 0,
        from: userChecksum
      })
    const nonce = await this.web3.eth.getTransactionCount(userAddress)
    const gasPrice = await this.web3.eth.getGasPrice()

    const txToSign = buildTxToSign({
      bip44Params: this.adapter.buildBIP44Params({ accountNumber }),
      chainId: 1,
      data,
      estimatedGas: estimatedGas.toString(),
      gasPrice,
      nonce: String(nonce),
      to: ssRouterContractAddress,
      value: '0'
    })
    if (wallet.supportsOfflineSigning()) {
      const signedTx = await this.adapter.signTransaction({ txToSign, wallet })
      if (dryRun) return signedTx
      return this.adapter.broadcastTransaction(signedTx)
    } else if (wallet.supportsBroadcast() && this.adapter.signAndBroadcastTransaction) {
      if (dryRun) {
        throw new Error(`Cannot perform a dry run with wallet of type ${wallet.getVendor()}`)
      }
      return this.adapter.signAndBroadcastTransaction({ txToSign, wallet })
    } else {
      throw new Error('Invalid HDWallet configuration ')
    }
  }

  // Withdraws are done through the vault contract itself, there is no need to go through the SS
  // router contract, so we estimate the gas from the vault itself.
  async withdrawEstimatedGas(input: TxEstimatedGasInput): Promise<BigNumber> {
    const { amountDesired, userAddress, vaultAddress } = input
    const vaultContract = new this.web3.eth.Contract(yv2VaultAbi, vaultAddress)
    const estimatedGas = await vaultContract.methods
      .withdraw(amountDesired.toString(), userAddress)
      .estimateGas({
        from: userAddress
      })
    return bnOrZero(estimatedGas)
  }

  async withdraw(input: TxInput): Promise<string> {
    const {
      amountDesired,
      accountNumber = 0,
      dryRun = false,
      vaultAddress,
      userAddress,
      wallet
    } = input
    if (!wallet || !vaultAddress) throw new Error('Missing inputs')
    const estimatedGas: BigNumber = await this.withdrawEstimatedGas(input)

    // We use the vault directly to withdraw the vault tokens. There is no benefit to the DAO to use
    // the router to withdraw funds and there is an extra approval required for the user if we
    // withdrew from the vault using the shapeshift router. Affiliate fees for SS are the same
    // either way. For this reason, we simply withdraw from the vault directly.
    const vaultContract: any = new this.web3.eth.Contract(yv2VaultAbi, vaultAddress)
    const data: string = vaultContract.methods
      .withdraw(amountDesired.toString(), userAddress)
      .encodeABI({
        from: userAddress
      })
    const nonce = await this.web3.eth.getTransactionCount(userAddress)
    const gasPrice = await this.web3.eth.getGasPrice()

    const txToSign = buildTxToSign({
      bip44Params: this.adapter.buildBIP44Params({ accountNumber }),
      chainId: 1,
      data,
      estimatedGas: estimatedGas.toString(),
      gasPrice,
      nonce: String(nonce),
      to: vaultAddress,
      value: '0'
    })
    if (wallet.supportsOfflineSigning()) {
      const signedTx = await this.adapter.signTransaction({ txToSign, wallet })
      if (dryRun) return signedTx
      return this.adapter.broadcastTransaction(signedTx)
    } else if (wallet.supportsBroadcast() && this.adapter.signAndBroadcastTransaction) {
      if (dryRun) {
        throw new Error(`Cannot perform a dry run with wallet of type ${wallet.getVendor()}`)
      }
      return this.adapter.signAndBroadcastTransaction({ txToSign, wallet })
    } else {
      throw new Error('Invalid HDWallet configuration ')
    }
  }

  async balance(input: BalanceInput): Promise<BigNumber> {
    const { vaultAddress, userAddress } = input
    const contract = new this.web3.eth.Contract(yv2VaultAbi, vaultAddress)
    const balance = await contract.methods.balanceOf(userAddress).call()
    return bnOrZero(balance)
  }

  async token(input: TokenInput): Promise<string> {
    const { vaultAddress } = input
    const contract = new this.web3.eth.Contract(yv2VaultAbi, vaultAddress)
    const address = await contract.methods.token().call()
    return address
  }

  async totalSupply({ contractAddress }: { contractAddress: string }): Promise<BigNumber> {
    const contract = new this.web3.eth.Contract(erc20Abi, contractAddress)
    const totalSupply = await contract.methods.totalSupply().call()
    return bnOrZero(totalSupply)
  }

  async pricePerShare(input: { vaultAddress: string }): Promise<BigNumber> {
    const contract = new this.web3.eth.Contract(yv2VaultAbi, input.vaultAddress)
    const pricePerShare = await contract.methods.pricePerShare().call()
    return bnOrZero(pricePerShare)
  }

  async apy(input: APYInput): Promise<string> {
    const response = await this.yearnClient.get(`/chains/1/vaults/all`)
    const vaultsData = response?.data
    const vaultData = vaultsData.find((vault: any) => vault.address === input.vaultAddress)
    if (!vaultData?.apy?.net_apy) {
      throw new Error('Not Found')
    }
    return String(vaultData.apy.net_apy)
  }
}
