import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Code,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tag,
  Wrap,
} from '@chakra-ui/react'
import { Default } from '@shapeshiftoss/hdwallet-native/dist/crypto/isolation/engines'
import type { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useQuery } from '@tanstack/react-query'
import { range } from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaEye } from 'react-icons/fa'
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
  const mixpanel = getMixPanel()
  const revealedOnce = useRef<boolean>(false)
  const handleShow = useCallback(() => {
    revealedOnce.current = true
    setRevealed(!revealed)
  }, [revealed])

  const revokerRef = useRef(new (Revocable(class {}))())
  const initiatedWordsRef = useRef(false)

  const { data: vault } = useQuery({
    queryKey: ['native-create-vault', location.state?.vault],
    queryFn: async () => {
      return location.state?.vault ?? (await getVault())
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })

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
      })
      mixpanel?.track(MixPanelEvent.NativeCreate)
    }
  }, [history, mixpanel, vault])

  const { data: words } = useQuery({
    queryKey: ['native-create-words', vault],
    queryFn: async () => {
      if (!vault) return []

      revokerRef.current?.revoke()
      revokerRef.current = new (Revocable(class {}))()

      const mnemonic = await vault.unwrap().get('#mnemonic')

      initiatedWordsRef.current = true

      return mnemonic.split(' ').map((word: string, index: number) =>
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
          revokerRef.current.addRevoker.bind(revokerRef.current),
        ),
      )
    },
    enabled: !!vault,
    staleTime: 0,
    gcTime: 0,
  })

  useEffect(() => {
    return () => {
      if (initiatedWordsRef.current) {
        revokerRef.current?.revoke()
        initiatedWordsRef.current = false
      }
    }
  }, [])

  return (
    <>
      <ModalHeader>
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
