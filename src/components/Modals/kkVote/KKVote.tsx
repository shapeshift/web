import {
  Button,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { bip32ToAddressNList } from '@shapeshiftoss/hdwallet-core'
import type { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useMemo, useState } from 'react'
import Web3 from 'web3'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const KKVote = ({ geckoId }: { geckoId: any }) => {
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const { getKeepkeyAsset, kkErc20Contract, kkNftContract, kkWeb3 } = useKeepKey()
  const {
    state: { wallet },
  } = useWallet()
  const projectName = useMemo(() => getKeepkeyAsset(geckoId)?.name, [geckoId, getKeepkeyAsset])

  const [burnAmount, setBurnAmount] = useState('0')

  const { kkVote } = useModal()
  const { close, isOpen } = kkVote

  // has clicked button but not necessarily broadcast or mined yet
  const [approveClicked, setApproveClicked] = useState(false)
  const [voteClicked, setVoteClicked] = useState(false)

  // have a txid from but not necessarily mined yet
  const [approveTxid, setApproveTxid] = useState('')
  const [voteTxid, setVoteTxid] = useState('')

  // 1 or more confirmations
  const [voteConfirmed, setVoteConfirmed] = useState(false)
  const [approveConfirmed, setApproveConfirmed] = useState(false)

  const onVoteClick = useCallback(async () => {
    setVoteClicked(true)
    const voteData = kkNftContract.methods.mintNFT(burnAmount, geckoId).encodeABI()
    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>
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
      gasLimit: '0x3D090', //250k
      gasPrice: Web3.utils.toHex(gasPrice),
    }

    if (!wallet) throw new Error('needs wallet')
    const signedTx = await adapter.signTransaction({
      txToSign,
      wallet,
    })

    const txHash = await kkWeb3.utils.sha3(signedTx)
    setVoteTxid(txHash ?? '')
    kkWeb3.eth.sendSignedTransaction(signedTx).then(() => {
      setVoteConfirmed(true)
    })
  }, [
    burnAmount,
    ethAsset.chainId,
    geckoId,
    kkNftContract.methods,
    kkNftContract.options.Address,
    kkWeb3.eth,
    kkWeb3.utils,
    wallet,
  ])

  const onApproveClick = useCallback(async () => {
    setApproveClicked(true)
    const approveData = kkErc20Contract.methods
      .approve(kkNftContract.options.address, '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')
      .encodeABI()

    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>

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
      gasLimit: '0x15F90', //90k
      gasPrice: Web3.utils.toHex(gasPrice),
    }

    if (!wallet) throw new Error('needs wallet')
    const signedTx = await adapter.signTransaction({
      txToSign,
      wallet,
    })

    const txHash = await kkWeb3.utils.sha3(signedTx)
    setApproveTxid(txHash ?? '')
    kkWeb3.eth.sendSignedTransaction(signedTx).then(() => {
      setApproveConfirmed(true)
    })
  }, [
    ethAsset.chainId,
    kkErc20Contract.methods,
    kkErc20Contract.options.address,
    kkNftContract.options.address,
    kkWeb3.eth,
    kkWeb3.utils,
    wallet,
  ])
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        close()
      }}
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <ModalCloseButton ml='auto' borderRadius='full' position='static' />
        <ModalBody>
          <div>
            <ModalHeader>
              <Text translation={`Burn tokens to vote on ${projectName}`} />
            </ModalHeader>
          </div>
          <div>
            <Input
              placeholder='Burn amount'
              onChange={input => {
                setBurnAmount(input.target.value)
              }}
            />
          </div>
          <div>
            {!approveConfirmed && (
              <Button isLoading={approveClicked} onClick={onApproveClick}>
                Approve
              </Button>
            )}
            <Link
              color='blue.400'
              isExternal
              href={`https://goerli.etherscan.io/tx/${approveTxid}`}
            >{`${approveTxid}`}</Link>
            {!voteConfirmed && (
              <Button isLoading={voteClicked} onClick={onVoteClick}>
                Vote
              </Button>
            )}
            <Link
              color='blue.400'
              isExternal
              href={`https://goerli.etherscan.io/tx/${voteTxid}`}
            >{`${voteTxid}`}</Link>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
