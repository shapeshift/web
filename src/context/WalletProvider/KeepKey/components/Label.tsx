import { Button, Input, ModalBody, ModalHeader } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { Text } from 'components/Text'
import { KeepKeyRoutes } from 'context/WalletProvider/routes'

export const KeepKeyLabel = () => {
  const [loading, setLoading] = useState(false)
  const history = useHistory()

  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    const label = inputRef.current?.value
    history.push({ pathname: KeepKeyRoutes.NewRecoverySentence, state: { label } })
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
          onClick={handleSubmit}
          disabled={loading}
          mb={3}
        >
          <Text translation={'modals.keepKey.label.button'} />
        </Button>
      </ModalBody>
    </>
  )
}
