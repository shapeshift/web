import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Code,
  Link,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tag,
  Wrap,
} from '@chakra-ui/react'
import * as native from '@shapeshiftoss/hdwallet-native'
import { GENERATE_MNEMONIC, Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { range } from 'lodash'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaEye } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router-dom'
import { Text } from 'components/Text'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'

import type { LocationState } from '../types'

const getVault = async (): Promise<Vault> => {
  const vault = await Vault.create(undefined, false)
  vault.meta.set('createdAt', Date.now())
  vault.set('#mnemonic', GENERATE_MNEMONIC)
  return vault
}

const Revocable = native.crypto.Isolation.Engines.Default.Revocable
const revocable = native.crypto.Isolation.Engines.Default.revocable

export const NativeCreate = () => {
  const history = useHistory()
  const location = useLocation<LocationState>()
  const [revealed, setRevealed] = useState<boolean>(false)
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const revealedOnce = useRef<boolean>(false)
  const handleShow = () => {
    revealedOnce.current = true
    setRevealed(!revealed)
  }
  const [vault, setVault] = useState<Vault | null>(null)
  const [words, setWords] = useState<ReactNode[] | null>(null)
  const [revoker] = useState(new (Revocable(class {}))())

  const isLegacyWallet = !!location.state?.vault

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

  const handleClick = useCallback(() => {
    if (vault) {
      history.push('/native/create-test', {
        vault,
        isLegacyWallet,
      })
      mixpanel?.track(MixPanelEvents.NativeCreate)
    }
  }, [history, isLegacyWallet, mixpanel, vault])

  useEffect(() => {
    ;(async () => {
      try {
        // If the vault is already passed from the legacy wallet flow, use it.
        const vault = isLegacyWallet ? location.state.vault : await getVault()
        setVault(vault)
      } catch (e) {
        console.error(e)
      }
    })()
  }, [setVault, location.state?.vault, isLegacyWallet])

  useEffect(() => {
    if (!vault) return
    ;(async () => {
      try {
        setWords(
          (await vault.unwrap().get('#mnemonic')).split(' ').map((word: string, index: number) =>
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
          ),
        )
      } catch (e) {
        console.error(e)
        setWords(null)
      }
    })()

    return () => {
      revoker.revoke()
    }
  }, [setWords, vault, revoker])

  return (
    <>
      <ModalHeader>
        {isLegacyWallet && (
          <Alert status='error' mb={4}>
            <AlertIcon />
            <AlertDescription fontSize='md'>
              <Text translation={'walletProvider.shapeShift.legacy.deprecatedWarning'} />
              <Link
                href={'https://shapeshift.zendesk.com/hc/en-us/articles/6161030693517'}
                fontWeight='normal'
                isExternal
              >
                {translate('walletProvider.shapeShift.legacy.learnMore')}
              </Link>
            </AlertDescription>
          </Alert>
        )}
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
          isDisabled={!(vault && words && revealedOnce.current)}
          onClick={handleClick}
        >
          <Text translation={'walletProvider.shapeShift.create.button'} />
        </Button>
      </ModalFooter>
    </>
  )
}
