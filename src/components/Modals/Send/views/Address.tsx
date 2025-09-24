import { Button, FormControl, FormLabel, Stack } from '@chakra-ui/react'
import { ethChainId } from '@shapeshiftoss/caip'
import get from 'lodash/get'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { AddressInput } from '../AddressInput/AddressInput'
import type { SendInput } from '../Form'
import { SendFormFields, SendRoutes } from '../SendCommon'

import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { SelectAssetRoutes } from '@/components/SelectAssets/SelectAssetCommon'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { parseAddressInputWithChainId } from '@/lib/address/address'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const Address = () => {
  const [isValidating, setIsValidating] = useState(false)
  const navigate = useNavigate()
  const translate = useTranslate()
  const {
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<SendInput>()
  const address = useWatch<SendInput, SendFormFields.To>({ name: SendFormFields.To })
  const input = useWatch<SendInput, SendFormFields.Input>({ name: SendFormFields.Input })
  const send = useModal('send')
  const qrCode = useModal('qrCode')
  const assetId = useWatch<SendInput, SendFormFields.AssetId>({ name: SendFormFields.AssetId })

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const supportsENS = asset?.chainId === ethChainId // We only support ENS resolution on ETH mainnet
  const addressError = get(errors, `${SendFormFields.Input}.message`, null)

  useEffect(() => {
    trigger(SendFormFields.Input)
  }, [trigger])

  const handleNext = useCallback(() => navigate(SendRoutes.Details), [navigate])

  const handleBackClick = useCallback(() => {
    setValue(SendFormFields.AssetId, '')
    navigate(SendRoutes.Select, {
      state: {
        toRoute: SelectAssetRoutes.Search,
        assetId: '',
      },
    })
  }, [navigate, setValue])

  const addressInputRules = useMemo(
    () => ({
      required: true,
      validate: {
        validateAddress: async (rawInput: string) => {
          if (!asset) return
          // Don't go invalid on initial empty string
          if (rawInput === '') return

          const urlOrAddress = rawInput.trim() // trim leading/trailing spaces
          setIsValidating(true)
          setValue(SendFormFields.To, '')
          setValue(SendFormFields.VanityAddress, '')
          const { assetId, chainId } = asset
          // this does not throw, everything inside is handled
          // Disable URL parsing for manual input - users don't type URLs, they scan QR codes
          const parseAddressInputWithChainIdArgs = {
            assetId,
            chainId,
            urlOrAddress,
            disableUrlParsing: true,
          }
          const { address, vanityAddress } = await parseAddressInputWithChainId(
            parseAddressInputWithChainIdArgs,
          )
          setIsValidating(false)
          // set returned values
          setValue(SendFormFields.To, address)
          setValue(SendFormFields.VanityAddress, vanityAddress)
          const invalidMessage = 'common.invalidAddress'
          return address ? true : invalidMessage
        },
      },
    }),
    [asset, setValue],
  )

  const handleCancel = useCallback(() => {
    // Sends may be done from the context of a QR code modal, or a send modal, which are similar, but effectively diff. modal refs
    send.close?.()
    qrCode.close?.()
  }, [send, qrCode])

  if (!asset) return null

  return (
    <SlideTransition className='flex flex-col h-full'>
      <DialogHeader>
        <DialogBackButton aria-label={translate('common.back')} onClick={handleBackClick} />
        <DialogTitle textAlign='center'>
          {translate('modals.send.sendForm.sendAsset', { asset: asset.name })}
        </DialogTitle>
      </DialogHeader>
      <DialogBody>
        <FormControl>
          <FormLabel color='text.subtle' w='full'>
            {translate('modals.send.sendForm.sendTo')}
          </FormLabel>
          <AddressInput
            pe={16}
            rules={addressInputRules}
            enableQr={true}
            placeholder={translate(
              supportsENS ? 'modals.send.addressInput' : 'modals.send.tokenAddress',
            )}
          />
        </FormControl>
      </DialogBody>
      <DialogFooter>
        <Stack flex={1}>
          <Button
            width='full'
            isDisabled={!address || !input || addressError}
            isLoading={isValidating}
            colorScheme={addressError && !isValidating ? 'red' : 'blue'}
            size='lg'
            onClick={handleNext}
            data-test='send-address-next-button'
          >
            <Text translation={addressError || 'common.next'} />
          </Button>
          <Button width='full' variant='ghost' size='lg' mr={3} onClick={handleCancel}>
            <Text translation='common.cancel' />
          </Button>
        </Stack>
      </DialogFooter>
    </SlideTransition>
  )
}
