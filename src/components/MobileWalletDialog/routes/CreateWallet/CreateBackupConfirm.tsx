import { Box, Button, Flex, Icon, Text as CText, useColorModeValue, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import * as bip39 from 'bip39'
import { uniq } from 'lodash'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { CarouselDots } from 'components/CarouselDots/CarouselDots'
import { DialogBackButton } from 'components/Modal/components/DialogBackButton'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogCloseButton } from 'components/Modal/components/DialogCloseButton'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from 'components/Modal/components/DialogHeader'
import { SlideTransition } from 'components/SlideTransition'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { MobileConfig } from 'context/WalletProvider/MobileWallet/config'
import { addWallet } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import type { RevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import type { MobileLocationState } from 'context/WalletProvider/MobileWallet/types'
import { useWallet } from 'hooks/useWallet/useWallet'

import { MobileWalletDialogRoutes } from '../../types'

const makeOrdinalSuffix = (n: number) => {
  return ['st', 'nd', 'rd'][((((n + 90) % 100) - 10) % 10) - 1] || 'th'
}

const TEST_COUNT_REQUIRED = 4

export const CreateBackupConfirm = () => {
  const history = useHistory()
  const location = useLocation<MobileLocationState>()
  const translate = useTranslate()
  const borderColor = useColorModeValue('gray.100', 'gray.700')
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null)
  const [testWords, setTestWords] = useState<string[]>([])
  const queryClient = useQueryClient()
  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()

  const backgroundDottedSx = useMemo(
    () => ({
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor,
      borderRadius: 'xl',
      mask: 'linear-gradient(to bottom, black 20%, transparent 100%)',
      WebkitMask: 'linear-gradient(to bottom, black 20%, transparent 100%)',
    }),
    [borderColor],
  )

  const words = useMemo(() => {
    if (!location.state?.vault) return []
    return location.state.vault.getWords() ?? []
  }, [location.state?.vault])

  const randomWordIndices = useMemo(() => {
    const indices = Array.from({ length: words.length }, (_, i) => i)
    return indices.sort(() => Math.random() - 0.5).slice(0, 12)
  }, [words.length])

  const generateTestWords = useCallback((targetWord: string) => {
    let randomWords = uniq(bip39.generateMnemonic(256).split(' ')) as string[]
    const otherWords = randomWords
      .filter(word => word !== targetWord)
      .sort(() => Math.random() - 0.5)
      .slice(0, 14)

    const allWords = [...otherWords, targetWord] as string[]
    return allWords.sort(() => Math.random() - 0.5)
  }, [])

  const handleWalletSelect = useCallback(
    async (wallet: RevocableWallet) => {
      const adapter = await getAdapter(KeyManager.Mobile)
      const deviceId = wallet.id
      if (adapter && deviceId) {
        const { name, icon } = MobileConfig
        try {
          const wallet = await adapter.pairDevice(deviceId)
          await wallet?.loadDevice({ mnemonic: location.state?.vault?.mnemonic ?? '' })

          if (!(await wallet?.isInitialized())) {
            await wallet?.initialize()
          }
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: {
              wallet,
              name,
              icon,
              deviceId,
              meta: { label: location.state?.vault?.label },
              connectedType: KeyManager.Mobile,
            },
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
          dispatch({
            type: WalletActions.SET_CONNECTOR_TYPE,
            payload: { modalType: KeyManager.Mobile, isMipdProvider: false },
          })

          localWallet.setLocalWallet({ type: KeyManager.Mobile, deviceId })
          localWallet.setLocalNativeWalletName(location.state?.vault?.label ?? 'label')
        } catch (e) {
          console.log(e)
        }
      }
    },
    [
      dispatch,
      getAdapter,
      localWallet,
      location.state?.vault?.mnemonic,
      location.state?.vault?.label,
    ],
  )

  useEffect(() => {
    if (selectedWordIndex === null && words.length > 0) {
      setSelectedWordIndex(0)
      const targetWord = words[randomWordIndices[0]]
      setTestWords(generateTestWords(targetWord ?? ''))
    }
  }, [selectedWordIndex, words, randomWordIndices, generateTestWords])

  const handleWordClick = useCallback(
    (word: string) => {
      const currentWordIndex = randomWordIndices[selectedWordIndex ?? 0]
      if (words[currentWordIndex] === word) {
        setSelectedWordIndex(prev => {
          const next = (prev ?? -1) + 1
          if (next >= TEST_COUNT_REQUIRED) {
            ;(async () => {
              if (location.state?.vault?.label && location.state?.vault?.mnemonic) {
                const wallet = await addWallet({
                  label: location.state.vault.label,
                  mnemonic: location.state.vault.mnemonic,
                })

                if (!wallet) return

                await handleWalletSelect(wallet)

                queryClient.invalidateQueries({ queryKey: ['listWallets'] })
                history.push(MobileWalletDialogRoutes.CreateBackupSuccess)
              }
            })()
            return null
          }
          const targetWord = words[randomWordIndices[next]]
          setTestWords(generateTestWords(targetWord ?? ''))
          return next
        })
      } else {
        const targetWord = words[currentWordIndex]
        setTestWords(generateTestWords(targetWord ?? ''))
      }
    },
    [
      randomWordIndices,
      selectedWordIndex,
      words,
      generateTestWords,
      history,
      queryClient,
      location.state?.vault,
      handleWalletSelect,
    ],
  )

  const handleBack = useCallback(() => {
    history.push(MobileWalletDialogRoutes.CreateBackup, { vault: location.state?.vault })
  }, [history, location.state?.vault])

  // const isComplete = selectedWordIndex === null && randomWordIndices.length > 0

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={handleBack} />
        </DialogHeaderLeft>
        <DialogHeaderMiddle>
          <Box minWidth='40px'>
            <CarouselDots length={3} activeIndex={2} />
          </Box>
        </DialogHeaderMiddle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <VStack spacing={6} alignItems='stretch'>
          <Box>
            <CText fontSize='2xl' fontWeight='bold' textAlign='center'>
              {translate('modals.shapeShift.backupPassphrase.title')}
            </CText>
            <CText color='text.subtle' textAlign='center' display='block' mb={6}>
              {translate('modals.shapeShift.backupPassphrase.description')}{' '}
            </CText>
          </Box>

          <Box borderRadius='xl' p={6} position='relative' pb={20}>
            <CText
              textAlign='center'
              position='absolute'
              pointerEvents='none'
              zIndex='1'
              top='0'
              left='50%'
              transform='translateX(-50%) translateY(-50%)'
              background='background.surface.base'
              px={2}
              width='max-content'
            >
              {translate('walletProvider.shapeShift.testPhrase.body')}{' '}
              {selectedWordIndex !== null && (
                <Box as='span' color='blue.500' fontWeight='bold'>
                  {translate(
                    `walletProvider.shapeShift.testPhrase.${
                      randomWordIndices[selectedWordIndex] + 1
                    }${makeOrdinalSuffix(randomWordIndices[selectedWordIndex] + 1)}`,
                  )}
                </Box>
              )}{' '}
              {translate('walletProvider.shapeShift.testPhrase.body2')}?
            </CText>

            <Box
              width='100%'
              height='100%'
              position='absolute'
              borderRadius='xl'
              pointerEvents='none'
              left='0'
              top='0'
              _before={backgroundDottedSx}
            />
            <Flex wrap='wrap' justify='center' gap={2}>
              {testWords.map((word, index) => (
                <Button
                  key={`${word}-${index}`}
                  variant='solid'
                  size='md'
                  // eslint-disable-next-line react-memo/require-usememo
                  onClick={() => handleWordClick(word)}
                  colorScheme='gray'
                  px={4}
                  py={2}
                  height='auto'
                  borderRadius='lg'
                >
                  {word}
                </Button>
              ))}
            </Flex>
          </Box>
        </VStack>
      </DialogBody>
      <DialogFooter>
        <Flex justifyContent='center' mx='auto'>
          <Flex gap={2} justify='center'>
            {Array.from({ length: TEST_COUNT_REQUIRED }).map((_, index) => (
              <Box
                key={index}
                w='16px'
                h='16px'
                borderRadius='full'
                bg={index < (selectedWordIndex ?? 0) ? 'blue.500' : 'transparent'}
                borderWidth={1}
                borderStyle='dashed'
                borderColor={borderColor}
                display='flex'
                alignItems='center'
                justifyContent='center'
              >
                {index < (selectedWordIndex ?? 0) && (
                  <Icon as={FaCheck} boxSize='8px' color='white' />
                )}
              </Box>
            ))}
          </Flex>
        </Flex>
      </DialogFooter>
    </SlideTransition>
  )
}
