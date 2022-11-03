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
import { bip32ToAddressNList } from '@shapeshiftoss/hdwallet-core'
import type { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Text } from 'components/Text'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

import { doApproveTx, doVoteTx } from './utils'

export const KKVote = ({ geckoId }: { geckoId: any }) => {
  const { getKeepkeyAsset, kkErc20Contract, kkNftContract, kkWeb3 } = useKeepKey()
  const {
    state: { wallet },
  } = useWallet()
  const projectName = useMemo(() => getKeepkeyAsset(geckoId)?.name, [geckoId, getKeepkeyAsset])

  const { kkVote } = useModal()
  const { close, isOpen } = kkVote

  // has clicked button.  not necessarily broadcast or mined yet
  const [approveClicked, setApproveClicked] = useState(false)
  const [voteClicked, setVoteClicked] = useState(false)

  // have a txid. not necessarily mined yet
  const [approveTxid, setApproveTxid] = useState('')
  const [voteTxid, setVoteTxid] = useState('')

  // 1 or more confirmations
  const [voteConfirmed, setVoteConfirmed] = useState(false)
  const [approveConfirmed, setApproveConfirmed] = useState(false)

  // amount user has approved for burning (should be 0 or huge)
  const [approvedAmount, setApprovedAmount] = useState('0')

  // burn amount input field
  const [burnAmount, setBurnAmount] = useState('0')

  console.log('approvedAmount', approvedAmount)
  console.log('burnAmount', burnAmount)

  const onBurnInputChange = useCallback((input: any) => {
    console.log('onBurnInputChange')
    setBurnAmount(input.target.value)
  }, [])

  const onVoteClick = useCallback(async () => {
    setVoteClicked(true)
    const txid = await doVoteTx(
      kkNftContract,
      kkWeb3,
      wallet,
      setVoteConfirmed,
      burnAmount,
      geckoId,
    )
    setVoteTxid(txid)
  }, [burnAmount, geckoId, kkNftContract, kkWeb3, wallet])

  const onApproveClick = useCallback(async () => {
    setApproveClicked(true)
    const txid = await doApproveTx(
      kkErc20Contract,
      kkNftContract,
      kkWeb3,
      wallet,
      setApproveConfirmed,
    )
    setApproveTxid(txid)
  }, [kkErc20Contract, kkNftContract, kkWeb3, wallet])


  const loadApprovedAmount = useCallback(async () => {
    const addressNList = bip32ToAddressNList("m/44'/60'/0'/0/0")
    const address = await (wallet as KeepKeyHDWallet).ethGetAddress({
      addressNList,
      showDisplay: false,
    })
    const approved = await kkErc20Contract?.methods
      .allowance(address, kkNftContract?.options?.address)
      .call()
    setApprovedAmount(approved)
  }, [kkErc20Contract?.methods, kkNftContract?.options?.address, wallet])

  useEffect(() => {
    loadApprovedAmount()
  }, [loadApprovedAmount, geckoId])

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
            <Input placeholder='Burn amount' onChange={onBurnInputChange} />
          </div>
          <div>
            {!approveConfirmed && bnOrZero(approvedAmount).eq(0) && (
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
