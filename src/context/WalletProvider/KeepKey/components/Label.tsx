import { Button, Input, ModalBody, ModalHeader } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { Text } from 'components/Text'
import { WipedParams } from 'context/WalletProvider/KeepKey/components/WipedSuccessfully'
import { KeepKeyRoutes } from 'context/WalletProvider/routes'

export interface LabelParams {
  intent: 'create' | 'recover'
  label: string | undefined
}

export const KeepKeyLabel = () => {
  const [loading, setLoading] = useState(false)
  const history = useHistory<LabelParams>()
  const {
    state: { intent },
  } = useLocation<WipedParams>()

  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleCreateSubmit = async () => {
    setLoading(true)
    const label = inputRef.current?.value
    history.push({
      pathname: KeepKeyRoutes.NewRecoverySentence,
      state: { label, intent: 'create' },
    })
  }

  const handleRecoverSubmit = async () => {
    setLoading(true)
    const label = inputRef.current?.value
    history.push({ pathname: KeepKeyRoutes.Pin, state: { label, intent: 'recover' } })
  }

  return (
    <>
      <ModalHeader>
        <Text translation={'modals.keepKey.label.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='gray.500' translation={'modals.keepKey.label.body'} mb={4} />
        <Input type='text' ref={inputRef} size='lg' variant='filled' mt={3} mb={6} />
        <Button
          isFullWidth
          size='lg'
          colorScheme='blue'
          onClick={intent === 'create' ? handleCreateSubmit : handleRecoverSubmit}
          disabled={loading}
          mb={3}
        >
          <Text translation={'modals.keepKey.label.button'} />
        </Button>
      </ModalBody>
    </>
  )
}
