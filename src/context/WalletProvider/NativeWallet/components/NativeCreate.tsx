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
import { Default } from '@shapeshiftoss/hdwallet-native/dist/crypto/isolation/engines'
import type { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { range } from 'lodash'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaEye } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router-dom'
import { Text } from 'components/Text'
import { NativeWalletRoutes } from 'context/WalletProvider/types'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'

import type { LocationState } from '../types'

const faEyeIcon = <FaEye />

const getVault = async (): Promise<Vault> => {
  const { Vault, GENERATE_MNEMONIC } = await import('@shapeshiftoss/hdwallet-native-vault')
  const vault = await Vault.create(undefined, false)
  vault.meta.set('createdAt', Date.now())
  vault.set('#mnemonic', GENERATE_MNEMONIC)
  return vault
}

const Revocable = Default.Revocable
const revocable = Default.revocable

export const NativeCreate = () => {
  const history = useHistory()
  const location = useLocation<LocationState>()
  const [revealed, setRevealed] = useState<boolean>(false)
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const revealedOnce = useRef<boolean>(false)
  const handleShow = useCallback(() => {
    revealedOnce.current = true
    setRevealed(!revealed)
  }, [revealed])

  const [vault, setVault] = useState<Vault | null>(location.state?.vault)
  const [words, setWords] = useState<ReactNode[] | null>(null)
  const revokerRef = useRef(new (Revocable(class {}))())

  const isLegacyWallet = location.state?.isLegacyWallet

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
      history.push(NativeWalletRoutes.CreateTest, {
        vault,
        isLegacyWallet,
      })
      mixpanel?.track(MixPanelEvent.NativeCreate)
    }
  }, [history, isLegacyWallet, mixpanel, vault])

  useEffect(() => {
    if (vault || location.state?.vault) return
    ;(async () => {
      try {
        const vault = await getVault()
        setVault(vault)
      } catch (e) {
        console.error(e)
      }
    })()
  }, [setVault, vault, location.state?.vault])

  useEffect(() => {
    if (!vault) return
    ;(async () => {
      try {
        revokerRef.current.revoke()
        revokerRef.current = new (Revocable(class {}))()

        const mnemonic = await vault.unwrap().get('#mnemonic')
        setWords(
          mnemonic.split(' ').map((word: string, index: number) =>
            revocable(
              <Tag
                p={2}
                flexBasis='31%'
                justifyContent='flex-start'
                fontSize='md'
                key={`${word}-${index}`}
                colorScheme='blue'
              >
                <Code mr={2}>{index + 1}</Code>
                {word}
              </Tag>,
              revokerRef.current.addRevoker.bind(revocable),
            ),
          ),
        )
      } catch (e) {
        console.error(e)
        setWords(null)
      }
    })()

    return () => {
      revokerRef.current.revoke()
      setWords(null)
    }
  }, [setWords, vault])

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
        <Text color='text.subtle' translation={'walletProvider.shapeShift.create.body'} />
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
        <Button onClick={handleShow} leftIcon={faEyeIcon}>
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
