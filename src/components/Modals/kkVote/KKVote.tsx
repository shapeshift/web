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
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Web3 from 'web3'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { erc20Abi } from 'pages/Leaderboard/helpers/erc20Abi'
import { nftAbi } from 'pages/Leaderboard/helpers/nftAbi'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const KKVote = ({ geckoId }: { geckoId: any }) => {
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const { getKeepkeyAsset } = useKeepKey()
  const {
    state: { wallet },
  } = useWallet()
  const projectName = useMemo(() => getKeepkeyAsset(geckoId)?.name, [geckoId, getKeepkeyAsset])

  const [burnAmount, setBurnAmount] = useState('0')

  const { kkVote } = useModal()
  const { close, isOpen } = kkVote

  const [approvedAmount, setApprovedAmount] = useState('0')

  const [isApproving, setIsApproving] = useState(false)
  const [approveTxid, setApproveTxid] = useState('')

  const [isVoting, setIsVoting] = useState(false)
  const [voteTxid, setVoteTxid] = useState('')

  const loadApprovedAmount = useCallback(async () => {
    const network = 'goerli'
    const web3 = new Web3(
      new Web3.providers.HttpProvider(
        `https://${network}.infura.io/v3/fb05c87983c4431baafd4600fd33de7e`,
      ),
    )
    const erc20Contract = new web3.eth.Contract(
      erc20Abi as any,
      '0xcc5a5975E8f6dF4dDD9Ff4Eb57471a3Ff32526a3',
    )
    const addressNList = bip32ToAddressNList("m/44'/60'/0'/0/0")

    const address = await (wallet as KeepKeyHDWallet).ethGetAddress({
      addressNList,
      showDisplay: false,
    })

    const approved = await erc20Contract.methods
      .allowance(address, '0xa869a28a7185df50e4abdba376284c44497c4753')
      .call()
    setApprovedAmount(approved)
  }, [wallet])

  useEffect(() => {
    loadApprovedAmount()
  }, [loadApprovedAmount, geckoId])

  const onVoteClick = useCallback(async () => {
    setIsVoting(true)
    const network = 'goerli'
    const web3 = new Web3(
      new Web3.providers.HttpProvider(
        `https://${network}.infura.io/v3/fb05c87983c4431baafd4600fd33de7e`,
      ),
    )
    const nftContract = new web3.eth.Contract(
      nftAbi as any,
      '0xa869a28a7185df50e4abdba376284c44497c4753',
    )

    const voteData = nftContract.methods.mintNFT(burnAmount, geckoId).encodeABI()

    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>

    const addressNList = bip32ToAddressNList("m/44'/60'/0'/0/0")

    const gasPrice = await web3.eth.getGasPrice()

    const address = await (wallet as KeepKeyHDWallet).ethGetAddress({
      addressNList,
      showDisplay: false,
    })

    const nonce = await web3.eth.getTransactionCount(address)

    const txToSign: ETHSignTx = {
      to: '0xa869a28a7185df50e4abdba376284c44497c4753',
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

    web3.eth.sendSignedTransaction(signedTx).then(() => {
      setIsVoting(false)
    })
    const txHash = await web3.utils.sha3(signedTx)
    setVoteTxid(txHash ?? '')
  }, [burnAmount, ethAsset?.chainId, geckoId, wallet])

  const onApproveClick = useCallback(async () => {
    setIsApproving(true)
    const network = 'goerli'
    const web3 = new Web3(
      new Web3.providers.HttpProvider(
        `https://${network}.infura.io/v3/fb05c87983c4431baafd4600fd33de7e`,
      ),
    )
    const erc20Contract = new web3.eth.Contract(
      erc20Abi as any,
      '0xcc5a5975E8f6dF4dDD9Ff4Eb57471a3Ff32526a3',
    )

    const approveData = erc20Contract.methods
      .approve(
        '0xa869a28a7185df50e4abdba376284c44497c4753',
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      )
      .encodeABI()

    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(ethAsset.chainId) as ChainAdapter<KnownChainIds>

    const addressNList = bip32ToAddressNList("m/44'/60'/0'/0/0")

    const gasPrice = await web3.eth.getGasPrice()

    const address = await (wallet as KeepKeyHDWallet).ethGetAddress({
      addressNList,
      showDisplay: false,
    })

    const nonce = await web3.eth.getTransactionCount(address)

    const txToSign: ETHSignTx = {
      to: '0xcc5a5975E8f6dF4dDD9Ff4Eb57471a3Ff32526a3',
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

    web3.eth.sendSignedTransaction(signedTx).then(() => {
      setIsApproving(false)
    })
    const txHash = await web3.utils.sha3(signedTx)
    setApproveTxid(txHash ?? '')
  }, [ethAsset, wallet])
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
            {bnOrZero(approvedAmount).eq(0) && !approveTxid && (
              <Button isLoading={isApproving} onClick={onApproveClick}>
                Approve
              </Button>
            )}
            <Link
              color='blue.400'
              isExternal
              href={`https://goerli.etherscan.io/tx/${approveTxid}`}
            >{`${approveTxid}`}</Link>
            {bnOrZero(approvedAmount).gt(0) && !voteTxid && (
              <Button isLoading={isVoting} onClick={onVoteClick}>
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
