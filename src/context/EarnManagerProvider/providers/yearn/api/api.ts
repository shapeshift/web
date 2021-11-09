import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import axios, { AxiosInstance } from 'axios'
import { BigNumber } from 'bignumber.js'
import { MAX_ALLOWANCE } from 'constants/allowance'
import { toLower } from 'lodash'
import Web3 from 'web3'
import { TransactionReceipt } from 'web3-core/types'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { erc20Abi } from '../constants/erc20-abi'
import { SUPPORTED_VAULTS } from '../constants/vaults'
import { yv2VaultAbi } from '../constants/yv2Vaults-abi'
import { buildTxToSign } from '../helpers/buildTxToSign'
import {
  Allowanceinput,
  ApproveEstimatedGasInput,
  ApproveInput,
  APYInput,
  BalanceInput,
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

  constructor({ adapter, providerUrl }: ConstructorArgs) {
    this.adapter = adapter
    this.provider = new Web3.providers.HttpProvider(providerUrl)
    this.web3 = new Web3(this.provider)
    this.yearnClient = axios.create({
      baseURL: 'https://api.yearn.finance/v1'
    })
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

  async approveEstimatedGas(input: ApproveEstimatedGasInput): Promise<BigNumber> {
    const { userAddress, spenderAddress, tokenContractAddress } = input
    const depositTokenContract = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)
    const estimatedGas = await depositTokenContract.methods
      .approve(spenderAddress, MAX_ALLOWANCE)
      .estimateGas({
        from: userAddress
      })
    return bnOrZero(estimatedGas)
  }

  async approve(input: ApproveInput): Promise<string> {
    const {
      accountNumber = 0,
      dryRun = false,
      spenderAddress,
      tokenContractAddress,
      userAddress,
      wallet
    } = input
    if (!wallet) throw new Error('Missing inputs')
    const estimatedGas: BigNumber = await this.approveEstimatedGas(input)
    const depositTokenContract = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)
    const data: string = depositTokenContract.methods
      .approve(spenderAddress, MAX_ALLOWANCE)
      .encodeABI({
        from: userAddress
      })
    const nonce: number = await this.web3.eth.getTransactionCount(userAddress)
    const gasPrice: string = await this.web3.eth.getGasPrice()

    const txToSign = buildTxToSign({
      bip32Params: this.adapter.buildBIP32Params({ accountNumber }),
      chainId: 1,
      data,
      estimatedGas: estimatedGas.toString(),
      gasPrice,
      nonce: String(nonce),
      to: tokenContractAddress,
      value: '0'
    })
    const signedTx = await this.adapter.signTransaction({ txToSign, wallet })
    if (dryRun) return signedTx
    return this.adapter.broadcastTransaction(signedTx)
  }

  async allowance(input: Allowanceinput): Promise<string> {
    const { userAddress, spenderAddress, tokenContractAddress } = input
    const depositTokenContract: any = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)
    return depositTokenContract.methods.allowance(userAddress, spenderAddress).call()
  }

  async depositEstimatedGas(input: TxEstimatedGasInput): Promise<BigNumber> {
    const { amountDesired, userAddress, vaultAddress } = input
    const vaultContract = new this.web3.eth.Contract(yv2VaultAbi, vaultAddress)
    const estimatedGas = await vaultContract.methods
      .deposit(amountDesired.toString(), userAddress)
      .estimateGas({
        value: 0,
        from: userAddress
      })
    return bnOrZero(estimatedGas)
  }

  async deposit(input: TxInput): Promise<string> {
    const {
      amountDesired,
      accountNumber = 0,
      dryRun = false,
      vaultAddress,
      userAddress,
      wallet
    } = input
    if (!wallet || !vaultAddress) throw new Error('Missing inputs')
    const estimatedGas: BigNumber = await this.depositEstimatedGas(input)
    const vaultContract: any = new this.web3.eth.Contract(yv2VaultAbi, vaultAddress)
    const data: string = await vaultContract.methods
      .deposit(amountDesired.toString(), userAddress)
      .encodeABI({
        from: userAddress
      })
    const nonce = await this.web3.eth.getTransactionCount(userAddress)
    const gasPrice = await this.web3.eth.getGasPrice()

    const txToSign = buildTxToSign({
      bip32Params: this.adapter.buildBIP32Params({ accountNumber }),
      chainId: 1,
      data,
      estimatedGas: estimatedGas.toString(),
      gasPrice,
      nonce: String(nonce),
      to: vaultAddress,
      value: '0'
    })
    const signedTx = await this.adapter.signTransaction({ txToSign, wallet })
    if (dryRun) return signedTx
    return this.adapter.broadcastTransaction(signedTx)
  }

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
    const vaultContract: any = new this.web3.eth.Contract(yv2VaultAbi, vaultAddress)
    const data: string = vaultContract.methods
      .withdraw(amountDesired.toString(), userAddress)
      .encodeABI({
        from: userAddress
      })
    const nonce = await this.web3.eth.getTransactionCount(userAddress)
    const gasPrice = await this.web3.eth.getGasPrice()

    const txToSign = buildTxToSign({
      bip32Params: this.adapter.buildBIP32Params({ accountNumber }),
      chainId: 1,
      data,
      estimatedGas: estimatedGas.toString(),
      gasPrice,
      nonce: String(nonce),
      to: vaultAddress,
      value: '0'
    })
    const signedTx = await this.adapter.signTransaction({ txToSign, wallet })
    if (dryRun) return signedTx
    return this.adapter.broadcastTransaction(signedTx)
  }

  async balance(input: BalanceInput): Promise<BigNumber> {
    const { vaultAddress, userAddress } = input
    const contract = new this.web3.eth.Contract(yv2VaultAbi, vaultAddress)
    const balance = await contract.methods.balanceOf(userAddress).call()
    return bnOrZero(balance)
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
