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
  SimpleGrid,
  Tag,
} from '@chakra-ui/react'
import { range } from 'lodash'
import type { ReactNode } from 'react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FaEye } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router-dom'
import { Text } from 'components/Text'

import { createWallet } from '../mobileMessageHandlers'
import type { RevocableWallet } from '../RevocableWallet'
import { Revocable, revocable } from '../RevocableWallet'
import type { MobileLocationState } from '../types'

type MobileCreateProps = {
  HeaderComponent?: React.ComponentType<any>
}

export const MobileCreate: React.FC<MobileCreateProps> = props => {
  const { HeaderComponent } = props
  const history = useHistory()
  const location = useLocation<MobileLocationState | undefined>()
  const [revealed, setRevealed] = useState<boolean>(false)
  const revealedOnce = useRef<boolean>(false)
  const handleShow = () => {
    revealedOnce.current = true
    setRevealed(!revealed)
  }
  const [words, setWords] = useState<ReactNode[] | null>(null)
  const [vault, setVault] = useState<RevocableWallet | null>(null)
  const [label, setLabel] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [revoker] = useState(new (Revocable(class {}))())
  const translate = useTranslate()

  const placeholders = useMemo(() => {
    return range(1, 13).map(i => (
      <Tag
        p={2}
        flexBasis='30%'
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
    try {
      if (!vault) setVault(location.state?.vault ?? createWallet())
    } catch (e) {
      console.log(e)
    }
  }, [location.state?.vault, setVault, vault])

  useEffect(() => {
    if (!vault) return

    try {
      setWords(
        vault.getWords()?.map((word: string, index: number) =>
          revocable(
            <Tag
              p={2}
              justifyContent='flex-start'
              fontSize='md'
              key={word}
              colorScheme='blue'
              overflow='hidden'
            >
              <Code mr={2}>{index + 1}</Code>
              {word}
            </Tag>,
            revoker.addRevoker.bind(revoker),
          ),
        ) ?? null,
      )
    } catch (e) {
      console.log(e)
      setWords(null)
    }

    return () => {
      // Revoke the `Tag` components that have a mnemonic word stored in them
      revoker.revoke()
    }
  }, [setWords, revoker, vault])

  return (
    <>
      <ModalHeader>
        {HeaderComponent && <HeaderComponent />}
        <Text translation={'walletProvider.shapeShift.create.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='text.subtle' translation={'walletProvider.shapeShift.create.body'} />
        {location?.state?.error && (
          <Alert status='error'>
            <AlertIcon />
            <AlertDescription>{location.state.error.message}</AlertDescription>
          </Alert>
        )}
        <SimpleGrid columns={3} spacing={2} mt={12} mb={6}>
          {revealed ? words : placeholders}
        </SimpleGrid>
        <FormControl mb={6} isInvalid={label.length > 64}>
          <Input
            value={label}
            onChange={e => setLabel(e.target.value)}
            size='lg'
            variant='filled'
            id='name'
            placeholder={translate('modals.shapeShift.password.walletNameRequired')}
            data-test='wallet-native-set-name-input'
          />
          <FormErrorMessage>
            {translate('modals.shapeShift.password.error.maxLength', { length: 64 })}
          </FormErrorMessage>
        </FormControl>
      </ModalBody>
      <ModalFooter justifyContent='space-between'>
        <Button variant='ghost' onClick={handleShow} leftIcon={<FaEye />}>
          <Text
            translation={`walletProvider.shapeShift.create.${revealed ? 'hide' : 'show'}Words`}
          />
        </Button>
        <Button
          colorScheme='blue'
          size='lg'
          isLoading={isSaving}
          isDisabled={isSaving || !(words && revealedOnce.current && label)}
          onClick={() => {
            if (vault?.mnemonic && label) {
              try {
                setIsSaving(true)
                vault.label = label
                history.push('/mobile/create-test', { vault, isLegacyWallet: false })
              } catch (e) {
                console.log(e)
              } finally {
                setIsSaving(false)
              }
            }
          }}
        >
          <Text translation={'walletProvider.shapeShift.create.button'} />
        </Button>
      </ModalFooter>
    </>
  )
}
