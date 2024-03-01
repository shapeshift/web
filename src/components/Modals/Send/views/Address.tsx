import { ArrowBackIcon } from '@chakra-ui/icons'
import { Button, FormControl, FormLabel, IconButton, Stack } from '@chakra-ui/react'
import { ethChainId } from '@shapeshiftoss/caip'
import get from 'lodash/get'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { YatBanner } from 'components/Banners/YatBanner'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import { DialogHeader } from 'components/Modal/components/DialogHeader'
import { DialogTitle } from 'components/Modal/components/DialogTitle'
import { SelectAssetRoutes } from 'components/SelectAssets/SelectAssetCommon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { parseAddressInputWithChainId } from 'lib/address/address'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddressInput } from '../AddressInput/AddressInput'
import type { SendInput } from '../Form'
import { SendFormFields, SendRoutes } from '../SendCommon'

const arrowBackIcon = <ArrowBackIcon />

export const Address = () => {
  const [isValidating, setIsValidating] = useState(false)
  const history = useHistory()
  const translate = useTranslate()
  const {
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<SendInput>()
  const address = useWatch<SendInput, SendFormFields.To>({ name: SendFormFields.To })
  const input = useWatch<SendInput, SendFormFields.Input>({ name: SendFormFields.Input })
  const send = useModal('send')
  const assetId = useWatch<SendInput, SendFormFields.AssetId>({ name: SendFormFields.AssetId })
  const isYatFeatureEnabled = useFeatureFlag('Yat')

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const isYatSupportedChain = asset?.chainId === ethChainId // yat only supports eth mainnet
  const isYatSupported = isYatFeatureEnabled && isYatSupportedChain
  const addressError = get(errors, `${SendFormFields.Input}.message`, null)

  useEffect(() => {
    trigger(SendFormFields.Input)
  }, [trigger])

  const handleNext = useCallback(() => history.push(SendRoutes.Details), [history])

  const handleClick = useCallback(
    () =>
      history.push(SendRoutes.Select, {
        toRoute: SelectAssetRoutes.Search,
        assetId: asset?.assetId ?? '',
      }),
    [history, asset],
  )

  const addressInputRules = useMemo(
    () => ({
      required: true,
      validate: {
        validateAddress: async (rawInput: string) => {
          if (!asset) return

          const urlOrAddress = rawInput.trim() // trim leading/trailing spaces
          setIsValidating(true)
          setValue(SendFormFields.To, '')
          setValue(SendFormFields.VanityAddress, '')
          const { assetId, chainId } = asset
          // this does not throw, everything inside is handled
          const parseAddressInputWithChainIdArgs = { assetId, chainId, urlOrAddress }
          const { address, vanityAddress } = await parseAddressInputWithChainId(
            parseAddressInputWithChainIdArgs,
          )
          setIsValidating(false)
          // set returned values
          setValue(SendFormFields.To, address)
          setValue(SendFormFields.VanityAddress, vanityAddress)
          const invalidMessage = isYatSupported
            ? 'common.invalidAddressOrYat'
            : 'common.invalidAddress'
          return address ? true : invalidMessage
        },
      },
    }),
    [asset, isYatSupported, setValue],
  )

  const handleCancel = useCallback(() => send.close(), [send])

  if (!asset) return null

  return (
    <SlideTransition className='flex flex-col h-full'>
      <DialogHeader>
        <IconButton
          variant='ghost'
          icon={arrowBackIcon}
          aria-label={translate('common.back')}
          fontSize='xl'
          size='sm'
          isRound
          onClick={handleClick}
        />
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
            rules={addressInputRules}
            enableQr={true}
            placeholder={translate(
              isYatSupported ? 'modals.send.addressInput' : 'modals.send.tokenAddress',
            )}
          />
        </FormControl>
        {isYatFeatureEnabled && isYatSupportedChain && <YatBanner mt={6} />}
      </DialogBody>
      <DialogFooter {...(isYatFeatureEnabled && { display: 'flex', flexDir: 'column' })}>
        <Stack flex={1} {...(isYatFeatureEnabled && { w: 'full' })}>
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
