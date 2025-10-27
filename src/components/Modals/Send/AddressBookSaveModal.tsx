import {
  Avatar,
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  Stack,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader, DialogHeaderRight } from '@/components/Modal/components/DialogHeader'
import { Text } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { addressBookSlice } from '@/state/slices/addressBookSlice/addressBookSlice'
import { selectInternalAccountIdByAddress } from '@/state/slices/addressBookSlice/selectors'
import type { AddressBookEntry } from '@/state/slices/addressBookSlice/types'
import { useAppDispatch, useAppSelector } from '@/state/store'

export type AddressBookSaveModalProps = {
  address: string
  chainId: ChainId
  onSuccess?: () => void
}

type FormData = {
  label: string
}

const focusInputStyle = {
  border: 'none',
  boxShadow: 'none',
}

const hoverInputStyle = {
  border: 'none',
}

export const AddressBookSaveModal = ({
  address,
  chainId,
  onSuccess,
}: AddressBookSaveModalProps) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const { isOpen, close: onClose } = useModal('addressBookSave')

  const internalAccountIdFilter = useMemo(
    () => ({
      accountAddress: address,
      chainId,
    }),
    [address, chainId],
  )

  const internalAccountId = useAppSelector(state =>
    selectInternalAccountIdByAddress(state, internalAccountIdFilter),
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      label: '',
    },
  })

  const avatarUrl = useMemo(() => makeBlockiesUrl(address), [address])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  const onSubmit = useCallback(
    (data: FormData) => {
      // Can't access here if it's an internal account id as its supposed to be added automatically as a system
      if (internalAccountId) return

      const entry: AddressBookEntry = {
        address,
        chainId,
        label: data.label,
        isInternal: false,
        isExternal: true,
      }

      dispatch(addressBookSlice.actions.addAddress(entry))
      onSuccess?.()
      handleClose()
    },
    [dispatch, address, chainId, onSuccess, handleClose, internalAccountId],
  )

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <DialogHeader>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogBody>
          <VStack spacing={4} align='center'>
            <Avatar src={avatarUrl} size='lg' />
            <FormControl isInvalid={!!errors.label}>
              <Input
                {...register('label', {
                  required: translate('modals.send.addAddress.nameRequired'),
                })}
                placeholder={translate('modals.send.addAddress.namePlaceholder')}
                autoFocus
                variant='filled'
                size='lg'
                background='transparent'
                textAlign='center'
                fontSize='xl'
                _focus={focusInputStyle}
                _hover={hoverInputStyle}
              />
              <FormErrorMessage>{errors.label?.message}</FormErrorMessage>
            </FormControl>
            <MiddleEllipsis value={address} />
          </VStack>
        </DialogBody>

        <DialogFooter>
          <Stack flex={1} flexDirection='row'>
            <Button onClick={handleClose} width='full' size='lg'>
              <Text translation='common.cancel' />
            </Button>
            <Button type='submit' colorScheme='blue' width='full' size='lg' isDisabled={!isValid}>
              <Text translation='modals.send.addAddress.title' />
            </Button>
          </Stack>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
