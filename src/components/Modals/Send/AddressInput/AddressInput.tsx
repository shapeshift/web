import type { InputProps, SpaceProps } from '@chakra-ui/react'
import {
  Avatar,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Text as CText,
  Text,
  useMediaQuery,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ControllerProps, ControllerRenderProps, FieldValues } from 'react-hook-form'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import ResizeTextarea from 'react-textarea-autosize'

import { SendFormFields, SendRoutes } from '../SendCommon'

import { QRCodeIcon } from '@/components/Icons/QRCode'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import type { SendInput } from '@/components/Modals/Send/Form'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { selectAddressBookEntriesByChainNamespace } from '@/state/slices/addressBookSlice/selectors'
import { useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

type AddressInputProps = {
  rules: ControllerProps['rules']
  enableQr?: boolean
  placeholder?: string
  pe?: SpaceProps['pe']
  resolvedAddress?: string
  chainId?: ChainId
  onSaveContact?: (e: React.MouseEvent<HTMLButtonElement>) => void
  onEmptied?: () => void
} & InputProps

const addressInputSx = {
  _hover: {
    opacity: 0.8,
  },
}

const qrCodeIcon = <QRCodeIcon />

export const AddressInput = ({
  rules,
  placeholder,
  enableQr = false,
  pe = 10,
  resolvedAddress,
  chainId,
  onEmptied,
  onSaveContact,
  ...props
}: AddressInputProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const [isFocused, setIsFocused] = useState(false)
  const isValid = useFormContext<SendInput>().formState.isValid
  const isDirty = useFormContext<SendInput>().formState.isDirty
  const isValidating = useFormContext<SendInput>().formState.isValidating
  const value = useWatch<SendInput, SendFormFields.Input>({ name: SendFormFields.Input })
  const [isUnderMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })
  const inputRef = useRef<HTMLInputElement>(null)

  const addressBookEntries = useAppSelector(state =>
    chainId ? selectAddressBookEntriesByChainNamespace(state, chainId) : [],
  )

  const isInvalid = useMemo(() => {
    // Don't go invalid when async invalidation is running
    if (isValidating) return false
    // Don't go invalid until there's an actual input
    if (!value) return false

    return isValid === false
  }, [isValid, isValidating, value])

  const addressBookEntry = useMemo(() => {
    if (!resolvedAddress) return null
    return addressBookEntries.find(entry => entry.address === resolvedAddress)
  }, [resolvedAddress, addressBookEntries])

  const avatarUrl = useMemo(
    () => (resolvedAddress ? makeBlockiesUrl(resolvedAddress) : ''),
    [resolvedAddress],
  )

  useEffect(() => {
    if (addressBookEntry) {
      setIsFocused(false)
    }
  }, [addressBookEntry])

  useEffect(() => {
    if (isFocused) {
      inputRef.current?.focus()
    }
  }, [isFocused])

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      props.onFocus?.(e)
      setIsFocused(true)
    },
    [props],
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      props.onBlur?.(e)
      setIsFocused(false)
    },
    [props],
  )

  const handleQrClick = useCallback(() => {
    navigate(SendRoutes.Scan)
  }, [navigate])

  const handleDisplayClick = useCallback(() => {
    setIsFocused(true)
  }, [])

  const renderController = useCallback(
    ({
      field: { onChange, value },
    }: {
      field: ControllerRenderProps<FieldValues, SendFormFields.Input>
    }) => {
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e)
        // Check if the input was emptied
        if (e.target.value === '' && value !== '' && onEmptied) {
          onEmptied()
        }
      }

      if (isFocused || !resolvedAddress || isInvalid) {
        return (
          <InputGroup alignItems='center'>
            <InputLeftElement pointerEvents='none' height='100%'>
              <Text color='text.subtle' w='full' pl={4} fontSize='sm'>
                {translate('modals.send.sendForm.to')}
              </Text>
            </InputLeftElement>
            <Input
              ref={inputRef}
              spellCheck={false}
              placeholder={placeholder}
              as={ResizeTextarea}
              value={value}
              variant='filled'
              minHeight='auto'
              minRows={1}
              borderRadius='10px'
              py={3}
              data-test='send-address-input'
              data-1p-ignore
              autoFocus={isUnderMd}
              pe={pe}
              isInvalid={isInvalid && isDirty}
              onFocus={handleFocus}
              {...props}
              onBlur={handleBlur}
              onChange={handleChange}
            />
          </InputGroup>
        )
      }

      if (addressBookEntry) {
        return (
          <Flex
            alignItems='center'
            justifyContent='space-between'
            bg='transparent'
            borderRadius='10px'
            cursor='pointer'
            onClick={handleDisplayClick}
            py={2}
            background='background.input.base'
            px={4}
            w='full'
            sx={addressInputSx}
          >
            <HStack spacing={3}>
              <Text color='text.subtle' fontSize='sm' minW='20px'>
                {translate('modals.send.sendForm.to')}
              </Text>
              <HStack spacing={2}>
                <Avatar src={avatarUrl} size='sm' />
                <VStack align='start' spacing={0}>
                  <CText fontSize='md' fontWeight='semibold' color='text.primary'>
                    {addressBookEntry.name}
                  </CText>
                  <MiddleEllipsis fontSize='xs' color='text.subtle' value={resolvedAddress} />
                </VStack>
              </HStack>
            </HStack>
          </Flex>
        )
      }

      return (
        <Flex
          alignItems='center'
          justifyContent='space-between'
          py={2}
          background='background.input.base'
          borderRadius='10px'
          w='full'
          px={4}
          sx={addressInputSx}
          onClick={handleDisplayClick}
          cursor='pointer'
        >
          <HStack spacing={3}>
            <Text color='text.subtle' fontSize='sm' minW='20px'>
              {translate('modals.send.sendForm.to')}
            </Text>
            <Box bg={'background.surface.raised.base'} px={3} py={2} borderRadius='full'>
              <MiddleEllipsis fontSize='sm' color='text.subtle' value={resolvedAddress} />
            </Box>
          </HStack>
          {onSaveContact && (
            <Button size='sm' onClick={onSaveContact}>
              {translate('common.save')}
            </Button>
          )}
        </Flex>
      )
    },
    [
      isFocused,
      resolvedAddress,
      isInvalid,
      placeholder,
      pe,
      isDirty,
      props,
      translate,
      handleFocus,
      handleBlur,
      addressBookEntry,
      handleDisplayClick,
      avatarUrl,
      onSaveContact,
      onEmptied,
      isUnderMd,
    ],
  )

  return (
    <InputGroup size='lg'>
      <Controller
        render={renderController}
        name={SendFormFields.Input}
        rules={rules}
        defaultValue=''
      />
      {enableQr && (
        <InputRightElement>
          <IconButton
            aria-label={translate('modals.send.scanQrCode')}
            icon={qrCodeIcon}
            onClick={handleQrClick}
            size='sm'
            variant='ghost'
          />
        </InputRightElement>
      )}
    </InputGroup>
  )
}
