import { ArrowBackIcon } from '@chakra-ui/icons'
import { ModalCloseButton } from '@chakra-ui/modal'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Code,
  IconButton,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tag,
  useColorModeValue,
  Wrap,
} from '@chakra-ui/react'
import type { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import range from 'lodash/range'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { FaEye } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { logger } from 'lib/logger'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'

const moduleLogger = logger.child({
  namespace: ['Layout', 'Header', 'NavBar', 'Native', 'BackupNativePassphrase'],
})

export const BackupPassphraseInfo = ({ vault }: { vault: Vault | null }) => {
  const translate = useTranslate()
  const { goBack: handleBackClick, ...history } = useHistory()
  const {
    backupNativePassphrase: {
      props: { preventClose },
    },
  } = useModal()
  const [revealed, setRevealed] = useState<boolean>(false)
  const handleShow = () => {
    setRevealed(!revealed)
  }
  const [words, setWords] = useState<ReactNode[] | null>(null)
  const alertColor = useColorModeValue('blue.500', 'blue.200')
  useEffect(() => {
    if (!vault) return
    ;(async () => {
      try {
        setWords(
          (await vault.unwrap().get('#mnemonic')).split(' ').map((word: string, index: number) => (
            <Tag
              p={2}
              flexBasis='31%'
              justifyContent='flex-start'
              fontSize='md'
              key={index}
              colorScheme='blue'
            >
              <Code mr={2}>{index + 1}</Code>
              {word}
            </Tag>
          )),
        )
      } catch (e) {
        moduleLogger.error(e, 'failed to get Secret Recovery Phrase')
        setWords(null)
      }
    })()
  }, [setWords, vault])

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

  return (
    <SlideTransition>
      <IconButton
        variant='ghost'
        icon={<ArrowBackIcon />}
        aria-label={translate('common.back')}
        fontSize='xl'
        size='sm'
        isRound
        onClick={handleBackClick}
      />
      <ModalHeader pt={4}>
        <Text translation={'modals.shapeShift.backupPassphrase.info.title'} />
      </ModalHeader>
      {!preventClose && <ModalCloseButton />}
      <ModalBody>
        <Text
          color='gray.500'
          translation={'modals.shapeShift.backupPassphrase.info.description'}
          mb={6}
        />
        <Alert status='info'>
          <AlertIcon />
          <AlertDescription>
            <Text
              color={alertColor}
              translation={'modals.shapeShift.backupPassphrase.info.warning'}
            />
          </AlertDescription>
        </Alert>

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
          disabled={!(vault && words)}
          onClick={() => {
            if (vault) {
              history.push(BackupPassphraseRoutes.Test, {
                vault,
              })
            }
          }}
        >
          <Text translation={'walletProvider.shapeShift.create.button'} />
        </Button>
      </ModalFooter>
    </SlideTransition>
  )
}
