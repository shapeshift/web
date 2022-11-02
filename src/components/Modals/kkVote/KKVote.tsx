import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { Text } from 'components/Text'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useModal } from 'hooks/useModal/useModal'

export const KKVote = ({ geckoId }: { geckoId: any }) => {
  const { getKeepkeyAsset } = useKeepKey()

  const projectName = useMemo(() => getKeepkeyAsset(geckoId)?.name, [geckoId, getKeepkeyAsset])

  const [burnAmount, setBurnAmount] = useState('0')

  const { kkVote } = useModal()
  const { close, isOpen } = kkVote

  const onVoteClick = useCallback(async () => {
    console.log('onVote burnAmount', burnAmount)
  }, [burnAmount])

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
            <Button onClick={onVoteClick}> Vote </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
