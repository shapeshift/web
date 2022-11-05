import type { ChainAdapter } from '@keepkey/chain-adapters'
import type { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { bip32ToAddressNList } from '@shapeshiftoss/hdwallet-core'
import type { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { KnownChainIds } from '@keepkey/types'
import Web3 from 'web3'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

// slightly over-estimated gas limits
const APPROVAL_GAS = '0x15F90' // 90k
const VOTE_GAS = '0x3D090' // 250k

// 1 = mainNet, 5 = goerli
const evmChainId = 5

export const doApproveTx = async (
  kkErc20Contract: any,
  kkNftContract: any,
  kkWeb3: Web3,
  wallet: HDWallet,
  setApproveConfirmed: (arg0: boolean) => any,
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
    chainId: evmChainId,
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
  const txHash = (await kkWeb3.utils.sha3(signedTx)) ?? ''
  return txHash
}

export const doVoteTx = async (
  kkNftContract: any,
  kkWeb3: Web3,
  wallet: KeepKeyHDWallet,
  setVoteConfirmed: (arg0: boolean) => any,
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
    to: kkNftContract.options.address,
    nonce: Web3.utils.toHex(nonce),
    data: voteData,
    value: '0x0',
    chainId: evmChainId,
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
  const txHash = (await kkWeb3.utils.sha3(signedTx)) ?? ''
  return txHash
}

// TODO support EIP 1559 prices (base fee & priority fee)
export const getFees = async (kkWeb3: Web3) => {
  const gasPrice = await kkWeb3.eth.getGasPrice()
  const voteEth = bnOrZero(VOTE_GAS).times(gasPrice).toString()
  const approvalEth = bnOrZero(APPROVAL_GAS).times(gasPrice).toString()
  return {
    voteEth: fromBaseUnit(voteEth, 18),
    approvalEth: fromBaseUnit(approvalEth, 18),
    voteGas: VOTE_GAS,
    approvalGas: APPROVAL_GAS,
    gasPrice: Web3.utils.toHex(gasPrice),
  }
}

// Gets eth && kktoken user balances
export const getApprovedAndBalances = async (
  kkWeb3: Web3,
  wallet: KeepKeyHDWallet,
  kkErc20Contract: any,
  kkNftContract: any,
) => {
  const addressNList = bip32ToAddressNList("m/44'/60'/0'/0/0")
  const address = await wallet.ethGetAddress({
    addressNList,
    showDisplay: false,
  })
  const ethBalance = await kkWeb3.eth.getBalance(address)
  const approved = await kkErc20Contract?.methods
    .allowance(address, kkNftContract?.options?.address)
    .call()
  const kkBalance = await kkErc20Contract?.methods.balanceOf(address).call()
  return {
    approved: fromBaseUnit(approved, 18),
    ethBalance: fromBaseUnit(ethBalance, 18),
    kkBalance: fromBaseUnit(kkBalance, 18),
  }
}
