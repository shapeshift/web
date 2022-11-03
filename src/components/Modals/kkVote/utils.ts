import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { bip32ToAddressNList } from '@shapeshiftoss/hdwallet-core'
import type { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { KnownChainIds } from '@shapeshiftoss/types'
import Web3 from 'web3'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'

// slightly over-estimated gas limits
const APPROVAL_GAS = '0x15F90' // 90k
const VOTE_GAS = '0x3D090' // 250k

export const doApproveTx = async (
  kkErc20Contract: any,
  kkNftContract: any,
  kkWeb3: any,
  wallet: any,
  setApproveConfirmed: any,
) => {
  const approveData = kkErc20Contract.methods
    .approve(kkNftContract.options.address, '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')
    .encodeABI()

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(
    KnownChainIds.EthereumMainnet,
  ) as ChainAdapter<KnownChainIds>

  const addressNList = bip32ToAddressNList("m/44'/60'/0'/0/0")

  const gasPrice = await kkWeb3.eth.getGasPrice()

  const address = await (wallet as KeepKeyHDWallet).ethGetAddress({
    addressNList,
    showDisplay: false,
  })

  const nonce = await kkWeb3.eth.getTransactionCount(address)

  const txToSign: ETHSignTx = {
    to: kkErc20Contract.options.address,
    nonce: Web3.utils.toHex(nonce),
    data: approveData,
    value: '0x0',
    chainId: 5,
    addressNList,
    gasLimit: APPROVAL_GAS,
    gasPrice: Web3.utils.toHex(gasPrice),
  }

  if (!wallet) throw new Error('needs wallet')
  const signedTx = await adapter.signTransaction({
    txToSign,
    wallet,
  })

  kkWeb3.eth.sendSignedTransaction(signedTx).then(() => {
    setApproveConfirmed(true)
  })
  const txHash = await kkWeb3.utils.sha3(signedTx)
  return txHash
}

export const doVoteTx = async (
  kkNftContract: any,
  kkWeb3: any,
  wallet: HDWallet | null,
  setVoteConfirmed: (arg0: any) => any,
  burnAmount: string,
  geckoId: string,
) => {
  const voteData = kkNftContract.methods.mintNFT(burnAmount, geckoId).encodeABI()
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(
    KnownChainIds.EthereumMainnet,
  ) as ChainAdapter<KnownChainIds>
  const addressNList = bip32ToAddressNList("m/44'/60'/0'/0/0")
  const gasPrice = await kkWeb3.eth.getGasPrice()
  const address = await (wallet as KeepKeyHDWallet).ethGetAddress({
    addressNList,
    showDisplay: false,
  })

  const nonce = await kkWeb3.eth.getTransactionCount(address)

  const txToSign: ETHSignTx = {
    to: kkNftContract.options.Address,
    nonce: Web3.utils.toHex(nonce),
    data: voteData,
    value: '0x0',
    chainId: 5,
    addressNList,
    gasLimit: VOTE_GAS,
    gasPrice: Web3.utils.toHex(gasPrice),
  }

  if (!wallet) throw new Error('needs wallet')
  const signedTx = await adapter.signTransaction({
    txToSign,
    wallet,
  })

  kkWeb3.eth.sendSignedTransaction(signedTx).then(() => {
    setVoteConfirmed(true)
  })
  const txHash = await kkWeb3.utils.sha3(signedTx)
  return txHash
}

// TODO support EIP 1559 prices (base fee & priority fee)
export const getVoteFees = async (kkWeb3: any) => {
  const gasPrice = await kkWeb3.eth.getGasPrice()
  const gasLimit = VOTE_GAS
  const eth = bnOrZero(gasLimit).times(gasPrice)
  return {
    eth,
    gasLimit,
    gasPrice: Web3.utils.toHex(gasPrice),
  }
}

// TODO support EIP 1559 prices (base fee & priority fee)
export const getApprovalFees = async (kkWeb3: any) => {
  const gasPrice = await kkWeb3.eth.getGasPrice()
  const gasLimit = APPROVAL_GAS
  const eth = bnOrZero(gasLimit).times(gasPrice)
  return {
    eth,
    gasLimit,
    gasPrice: Web3.utils.toHex(gasPrice),
  }
}
