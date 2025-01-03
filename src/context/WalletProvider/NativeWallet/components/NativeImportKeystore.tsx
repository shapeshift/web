import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  Icon,
  Input,
  ModalBody,
  ModalHeader,
  Text as CText,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { FaFile } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { Text } from 'components/Text'
import { NativeWalletRoutes } from 'context/WalletProvider/types'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'

import type { NativeWalletValues } from '../types'

const hoverSx = { borderColor: 'blue.500' }

// TODO(gomes): use https://www.chakra-ui.com/docs/components/file-upload if/when we migrate to chakra@3
const FileUpload = ({ onFileSelect }: { onFileSelect: (file: File) => void }) => {
  const bgColor = useColorModeValue('gray.50', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const [isDragging, setIsDragging] = useState(false)
  const [filename, setFilename] = useState<string | null>(null)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const processFile = useCallback(
    (file: File) => {
      setFilename(file.name)
      onFileSelect(file)
    },
    [onFileSelect],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files?.[0]) {
        processFile(files[0])
      }
    },
    [processFile],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files?.[0]) {
        processFile(files[0])
      }
    },
    [processFile],
  )

  return (
    <FormControl>
      <Input
        type='file'
        accept='.txt'
        onChange={handleFileInput}
        id='file-upload'
        display='none'
        data-test='wallet-native-keystore-upload'
      />
      <Box
        as='label'
        htmlFor='file-upload'
        w='full'
        h='32'
        border='2px'
        borderStyle='dashed'
        borderColor={isDragging ? 'blue.500' : borderColor}
        borderRadius='xl'
        display='flex'
        flexDirection='column'
        alignItems='center'
        justifyContent='center'
        bg={bgColor}
        cursor='pointer'
        transition='all 0.2s'
        _hover={hoverSx}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Icon as={FaFile} boxSize={6} color='gray.500' mb={2} />
        {filename ? (
          <CText color='gray.500'>{filename}</CText>
        ) : (
          <Text color='gray.500' translation='walletProvider.shapeShift.import.dragAndDrop' />
        )}
      </Box>
    </FormControl>
  )
}

export const NativeImportKeystore = ({ history }: RouteComponentProps) => {
  const [keystoreFile, setKeystoreFile] = useState<string | null>(null)
  const mixpanel = getMixPanel()

  const translate = useTranslate()

  const {
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NativeWalletValues>({ shouldUnregister: true })

  const onSubmit = useCallback(
    async (values: FieldValues) => {
      try {
        const { Vault } = await import('@shapeshiftoss/hdwallet-native-vault')
        const vault = await Vault.create()
        vault.meta.set('createdAt', Date.now())

        if (!keystoreFile) {
          throw new Error('No keystore uploaded')
        }

        try {
          await vault.loadFromKeystore(keystoreFile, values.keystorePassword)
        } catch (e) {
          setError('keystorePassword', {
            type: 'manual',
            message: translate('walletProvider.shapeShift.import.invalidKeystorePassword'),
          })
          return
        }

        history.push(NativeWalletRoutes.Password, { vault })
        mixpanel?.track(MixPanelEvent.NativeImportKeystore)
      } catch (e) {
        setError('mnemonic', {
          type: 'manual',
          message: 'walletProvider.shapeShift.import.invalidKeystore',
        })
      }
    },
    [history, keystoreFile, mixpanel, setError, translate],
  )

  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      if (!e?.target) return
      if (typeof e.target.result !== 'string') return
      setKeystoreFile(e.target.result)
    }
    reader.readAsText(file)
  }, [])

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.import.keystoreHeader'} />
      </ModalHeader>
      <ModalBody>
        <Text
          color='text.subtle'
          mb={4}
          translation='walletProvider.shapeShift.import.keystoreImportBody'
        />

        <VStack spacing={6}>
          <FileUpload onFileSelect={handleFileSelect} />

          <FormControl isInvalid={Boolean(errors.keystorePassword)}>
            <Input
              type='password'
              placeholder='Keystore Password'
              size='lg'
              data-test='wallet-native-keystore-password'
            />
            <FormErrorMessage>{errors.keystorePassword?.message}</FormErrorMessage>
          </FormControl>

          <Button
            colorScheme='blue'
            width='full'
            size='lg'
            type='submit'
            isLoading={isSubmitting}
            onClick={handleSubmit(onSubmit)}
            isDisabled={!keystoreFile}
            data-test='wallet-native-keystore-submit'
          >
            <Text translation='walletProvider.shapeShift.import.importKeystore' />
          </Button>
        </VStack>
      </ModalBody>
    </>
  )
}
