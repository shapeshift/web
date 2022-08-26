import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Code,
  FormControl,
  FormErrorMessage,
  Input,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tag,
  Wrap,
} from '@chakra-ui/react'
import * as native from '@shapeshiftoss/hdwallet-native'
import { range } from 'lodash'
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { FaEye } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router-dom'
import { Text } from 'components/Text'

import { createWallet, updateWallet } from '../mobileMessageHandlers'
import { RevocableWallet } from '../RevocableWallet'
import { MobileLocationState } from '../types'

const revocable = native.crypto.Isolation.Engines.Default.revocable

export const MobileCreate = () => {
  const history = useHistory()
  const location = useLocation<MobileLocationState>()
  const [revealed, setRevealed] = useState<boolean>(false)
  const revealedOnce = useRef<boolean>(false)
  const handleShow = () => {
    revealedOnce.current = true
    setRevealed(!revealed)
  }
  const [words, setWords] = useState<ReactNode[] | null>(null)
  const [revoker, setRevoker] = useState<RevocableWallet | null>(null)
  const [label, setLabel] = useState('Mobile Wallet')
  const translate = useTranslate()

  const placeholders = useMemo(() => {
    return range(1, 13).map(i => (
      <Tag
        p={2}
        flexBasis='31%'
        justifyContent='flex-start'
        fontSize='md'
        colorScheme='blue'
        key={i}
      >
        <Code mr={2}>{i}</Code>
        •••••••
      </Tag>
    ))
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        setRevoker(await createWallet({ label: 'Mobile Wallet' }))
      } catch (e) {
        console.error(e)
      }
    })()
  }, [revoker])

  useEffect(() => {
    try {
      const words = revoker?.getWords()?.map((word: string, index: number) =>
        revocable(
          <Tag
            p={2}
            flexBasis='31%'
            justifyContent='flex-start'
            fontSize='md'
            key={word}
            colorScheme='blue'
          >
            <Code mr={2}>{index + 1}</Code>
            {word}
          </Tag>,
          revoker.addRevoker.bind(revocable),
        ),
      )

      if (words) setWords(words)
    } catch (e) {
      console.error('failed to get Secret Recovery Phrase:', e)
      setWords(null)
    }

    return () => {
      revoker?.revoke()
    }
  }, [setWords, revoker])

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.create.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='gray.500' translation={'walletProvider.shapeShift.create.body'} />
        {location?.state?.error && (
          <Alert status='error'>
            <AlertIcon />
            <AlertDescription>{location.state.error.message}</AlertDescription>
          </Alert>
        )}
        <Wrap mt={12} mb={6}>
          {revealed ? words : placeholders}
        </Wrap>
        <FormControl mb={6} isInvalid={Boolean(label) && label.length < 64}>
          <Input
            value={label}
            onChange={e => setLabel(e.target.value)}
            size='lg'
            variant='filled'
            id='name'
            placeholder={translate('modals.shapeShift.password.walletName')}
            data-test='wallet-native-set-name-input'
          />
          <FormErrorMessage>
            {translate('modals.shapeShift.password.error.maxLength')}
          </FormErrorMessage>
        </FormControl>
      </ModalBody>
      <ModalFooter justifyContent='space-between'>
        <Button colorScheme='blue' variant='ghost' onClick={handleShow} leftIcon={<FaEye />}>
          <Text
            translation={`walletProvider.shapeShift.create.${revealed ? 'hide' : 'show'}Words`}
          />
        </Button>
        <Button
          colorScheme='blue'
          size='lg'
          disabled={!(words && revealedOnce.current && label)}
          onClick={() => {
            if (revoker?.mnemonic && label) {
              revoker.label = label
              updateWallet(revoker.id, { label }).catch(console.error)
              history.push('/mobile/create-test', { revoker, isLegacyWallet: false })
            }
          }}
        >
          <Text translation={'walletProvider.shapeShift.create.button'} />
        </Button>
      </ModalFooter>
    </>
  )
}
