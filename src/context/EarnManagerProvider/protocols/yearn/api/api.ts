import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { BIP32Params, ChainTypes } from '@shapeshiftoss/types'
import { BigNumber } from 'bignumber.js'
import Web3 from 'web3'

import { erc20Abi } from '../constants/erc20-abi'
import { MAX_ALLOWANCE } from '../constants/values'
import { vaults, YearnVault } from '../constants/vaults'
import { yv2VaultAbi } from '../constants/yv2Vaults-abi'
import { buildTxToSign } from '../helpers/buildTxToSign'

type Allowanceinput = {
  spenderAddress: string
  tokenContractAddress: string
  userAddress: string
}
type ApproveInput = {
  bip32Params?: BIP32Params
  dryRun?: boolean
  spenderAddress: string
  tokenContractAddress: string
  userAddress: string
  vaultAddress?: string
  wallet?: HDWallet
}

type AddInput = {
  bip32Params?: BIP32Params
  dryRun?: boolean
  tokenContractAddress: string
  userAddress: string
  vaultAddress?: string
  wallet?: HDWallet
  amountDesired: BigNumber
}

type RemoveInput = {
  bip32Params?: BIP32Params
  dryRun?: boolean
  tokenContractAddress: string
  userAddress: string
  vaultAddress?: string
  wallet?: HDWallet
  amountDesired: BigNumber
}

type BalanceInput = {
  userAddress: string
  vaultAddress: string
}

type APYInput = {
  vaultAddress: string
  userAddress: string
}

type ConstructorArgs = {
  adapter: ChainAdapter<ChainTypes.Ethereum>
  providerUrl: string
}

// contract interaction layer
export class YearnVaultApi {
  public adapter: ChainAdapter<ChainTypes.Ethereum>
  public provider: any
  public web3: Web3

  constructor({ adapter, providerUrl }: ConstructorArgs) {
    this.adapter = adapter
    this.provider = new Web3.providers.HttpProvider(providerUrl)
    this.web3 = new Web3(this.provider)
  }

  async findAll() {
    return Promise.resolve(vaults)
  }

  async findByTokenId(tokenId: string) {
    const vault = vaults.find((item: YearnVault) => item.depositToken === tokenId)
    if (!vault) throw new Error(`Vault for ${tokenId} isn't supported`)
    return Promise.resolve(vault)
  }

  async approveEstimatedGas(input: ApproveInput): Promise<BigNumber> {
    const { userAddress, spenderAddress, tokenContractAddress } = input
    const depositTokenContract: any = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)
    const estimatedGas = await depositTokenContract.methods
      .approve(spenderAddress, MAX_ALLOWANCE)
      .estimateGas({
        from: userAddress
      })
    return new BigNumber(estimatedGas)
  }
  async approve(input: ApproveInput): Promise<string> {
    const {
      bip32Params,
      dryRun = false,
      spenderAddress,
      tokenContractAddress,
      userAddress,
      wallet
    } = input
    if (!wallet || !bip32Params) throw new Error('Missing inputs')
    const estimatedGas: BigNumber = await this.approveEstimatedGas(input)
    const depositTokenContract: any = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)
    const data: string = depositTokenContract.methods
      .approve(spenderAddress, MAX_ALLOWANCE)
      .encodeABI({
        from: userAddress
      })
    const nonce: number = await this.web3.eth.getTransactionCount(userAddress)
    const gasPrice: string = await this.web3.eth.getGasPrice()

    const txToSign = buildTxToSign({
      bip32Params,
      chainId: 1,
      data,
      estimatedGas: estimatedGas.toString(),
      gasPrice,
      nonce: String(nonce),
      to: depositTokenContract,
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
  async addEstimatedGas(input: AddInput): Promise<BigNumber> {
    const { amountDesired, userAddress, vaultAddress } = input
    const vaultContract = new this.web3.eth.Contract(yv2VaultAbi, vaultAddress)
    const estimatedGas = await vaultContract.methods.deposit(amountDesired.toString()).estimateGas({
      from: userAddress
    })
    return new BigNumber(estimatedGas)
  }
  async add(input: AddInput): Promise<string> {
    const { amountDesired, bip32Params, dryRun = false, vaultAddress, userAddress, wallet } = input
    if (!wallet || !bip32Params || !vaultAddress) throw new Error('Missing inputs')
    const estimatedGas: BigNumber = await this.addEstimatedGas(input)
    const vaultContract: any = new this.web3.eth.Contract(yv2VaultAbi, vaultAddress)
    const data: string = await vaultContract.methods.deposit(amountDesired.toString()).encodeABI({
      from: userAddress
    })
    const nonce = await this.web3.eth.getTransactionCount(userAddress)
    const gasPrice = await this.web3.eth.getGasPrice()

    const txToSign = buildTxToSign({
      bip32Params,
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
  async removeEstimatedGas(input: RemoveInput): Promise<BigNumber> {
    const { amountDesired, userAddress, vaultAddress } = input
    const vaultContract = new this.web3.eth.Contract(yv2VaultAbi, vaultAddress)
    const estimatedGas = await vaultContract.methods.deposit(amountDesired.toString()).estimateGas({
      from: userAddress
    })
    return new BigNumber(estimatedGas)
  }

  async remove(input: RemoveInput): Promise<string> {
    const { amountDesired, bip32Params, dryRun = false, vaultAddress, userAddress, wallet } = input
    if (!wallet || !bip32Params || !vaultAddress) throw new Error('Missing inputs')
    const estimatedGas: BigNumber = await this.removeEstimatedGas(input)
    const vaultContract: any = new this.web3.eth.Contract(yv2VaultAbi, vaultAddress)
    const data: string = vaultContract.methods.withdraw(amountDesired.toString()).encodeABI({
      from: userAddress
    })
    const nonce = await this.web3.eth.getTransactionCount(userAddress)
    const gasPrice = await this.web3.eth.getGasPrice()

    const txToSign = buildTxToSign({
      bip32Params,
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
    return new BigNumber(balance)
  }
  async totalSupply({ contractAddress }: { contractAddress: string }): Promise<BigNumber> {
    const contract = new this.web3.eth.Contract(erc20Abi, contractAddress)
    const totalSupply = await contract.methods.totalSupply().call()
    return new BigNumber(totalSupply)
  }
  async apy(input: APYInput): Promise<string> {
    return input.userAddress
  }
}
