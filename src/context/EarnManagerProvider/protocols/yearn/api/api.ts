import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { bip32ToAddressNList, ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { BIP32Params, ChainTypes } from '@shapeshiftoss/types'
import { BigNumber } from 'bignumber.js'
// import * as unchained from '@shapeshiftoss/unchained-client'
import Web3 from 'web3'
import { numberToHex } from 'web3-utils'

import { erc20Abi } from '../constants/erc20-abi'
import { MAX_ALLOWANCE } from '../constants/values'
import { vaults, YearnVault } from '../constants/vaults'

type Allowanceinput = {
  spenderAddress: string
  tokenContractAddress: string
  userAddress: string
}
type ApproveInput = {
  bip32Params: BIP32Params
  dryRun?: boolean
  spenderAddress: string
  tokenContractAddress: string
  userAddress: string
  vaultAddress?: string
  wallet?: HDWallet
}

type ConstructorArgs = {
  adapter: ChainAdapter<ChainTypes.Ethereum>
  providerUrl: string
}

function toPath(bip32Params: BIP32Params): string {
  const { purpose, coinType, accountNumber, isChange = false, index = 0 } = bip32Params
  if (typeof purpose === 'undefined') throw new Error('toPath: bip32Params.purpose is required')
  if (typeof coinType === 'undefined') throw new Error('toPath: bip32Params.coinType is required')
  if (typeof accountNumber === 'undefined')
    throw new Error('toPath: bip32Params.accountNumber is required')
  return `m/${purpose}'/${coinType}'/${accountNumber}'/${Number(isChange)}/${index}`
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

  async gasPrice(): Promise<BigNumber> {
    const gasPrice = await this.web3.eth.getGasPrice()
    return new BigNumber(gasPrice)
  }

  async getNonce(address: string): Promise<number> {
    return this.web3.eth.getTransactionCount(address)
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
    if (!wallet) throw new Error('No Wallet')
    const depositTokenContract: any = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)
    const estimatedGas: BigNumber = await this.approveEstimatedGas(input)
    const data: string = depositTokenContract.methods
      .approve(spenderAddress, MAX_ALLOWANCE)
      .encodeABI({
        from: userAddress
      })
    const nonce = await this.web3.eth.getTransactionCount(userAddress)
    const gasPrice = await this.web3.eth.getGasPrice()

    const path = toPath(bip32Params)
    const addressNList = bip32ToAddressNList(path)

    const txToSign: ETHSignTx = {
      addressNList,
      value: numberToHex('0'),
      to: tokenContractAddress,
      chainId: 1, // TODO: implement for multiple chains
      data,
      nonce: String(nonce),
      gasPrice: numberToHex(gasPrice),
      gasLimit: numberToHex(estimatedGas.toString())
    }
    const signedTx = await this.adapter.signTransaction({ txToSign, wallet })
    if (dryRun) return signedTx
    return this.adapter.broadcastTransaction(signedTx)
  }
  async allowance(input: Allowanceinput): Promise<string> {
    const { userAddress, spenderAddress, tokenContractAddress } = input
    const depositTokenContract: any = new this.web3.eth.Contract(erc20Abi, tokenContractAddress)
    return depositTokenContract.methods.allowance(userAddress, spenderAddress).call()
  }
  add(input: ApproveInput): Promise<string> {
    return Promise.resolve(input.userAddress)
  }
  remove(input: ApproveInput): Promise<string> {
    return Promise.resolve(input.userAddress)
  }
  balance(input: ApproveInput): Promise<string> {
    return Promise.resolve(input.userAddress)
  }
  totalSupply(input: ApproveInput): Promise<string> {
    return Promise.resolve(input.userAddress)
  }
  apy(input: ApproveInput): Promise<string> {
    return Promise.resolve(input.userAddress)
  }
}
