import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  FormControl,
  FormLabel,
  IconButton,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  Stack,
} from '@chakra-ui/react'
import { ethChainId } from '@shapeshiftoss/caip'
import get from 'lodash/get'
import { useCallback, useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { YatBanner } from 'components/Banners/YatBanner'
import { SelectAssetRoutes } from 'components/SelectAssets/SelectAssetCommon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { parseAddressInputWithChainId } from 'lib/address/address'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { AddressInput } from '../AddressInput/AddressInput'
import type { SendInput } from '../Form'
import { SendFormFields, SendRoutes } from '../SendCommon'

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

  useEffect(() => {
    trigger(SendFormFields.Input)
  }, [trigger])

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const handleNext = useCallback(() => history.push(SendRoutes.Details), [history])

  if (!asset) return null
  const { chainId } = asset
  const isYatSupportedChain = chainId === ethChainId // yat only supports eth mainnet
  const isYatSupported = isYatFeatureEnabled && isYatSupportedChain
  const addressError = get(errors, `${SendFormFields.Input}.message`, null)

  return (
    <SlideTransition>
      <IconButton
        variant='ghost'
        icon={<ArrowBackIcon />}
        aria-label={translate('common.back')}
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        isRound
        onClick={() =>
          history.push(SendRoutes.Select, {
            toRoute: SelectAssetRoutes.Search,
            assetId: asset.assetId,
          })
        }
      />
      <ModalHeader textAlign='center'>
        {translate('modals.send.sendForm.sendAsset', { asset: asset.name })}
      </ModalHeader>
      <ModalCloseButton borderRadius='full' />
      <ModalBody>
        <FormControl>
          <FormLabel color='text.subtle' w='full'>
            {translate('modals.send.sendForm.sendTo')}
          </FormLabel>
          <AddressInput
            rules={{
              required: true,
              validate: {
                validateAddress: async (rawInput: string) => {
                  const urlOrAddress = rawInput.trim() // trim leading/trailing spaces
                  setIsValidating(true)
                  setValue(SendFormFields.To, '')
                  setValue(SendFormFields.VanityAddress, '')
                  setValue(SendFormFields.CryptoAmount, '')
                  const { assetId } = asset
                  // this does not throw, everything inside is handled
                  const parseAddressInputWithChainIdArgs = { assetId, chainId, urlOrAddress }
                  const { amountCryptoPrecision, address, vanityAddress } =
                    await parseAddressInputWithChainId(parseAddressInputWithChainIdArgs)
                  setIsValidating(false)
                  // set returned values
                  setValue(SendFormFields.To, address)
                  setValue(SendFormFields.VanityAddress, vanityAddress)
                  if (amountCryptoPrecision) {
                    const marketData = selectMarketDataById(store.getState(), assetId)
                    setValue(SendFormFields.CryptoAmount, amountCryptoPrecision)
                    setValue(
                      SendFormFields.FiatAmount,
                      bnOrZero(amountCryptoPrecision).times(marketData.price).toString(),
                    )
                  }
                  const invalidMessage = isYatSupported
                    ? 'common.invalidAddressOrYat'
                    : 'common.invalidAddress'
                  return address ? true : invalidMessage
                },
              },
            }}
            enableQr={true}
            placeholder={translate(
              isYatSupported ? 'modals.send.addressInput' : 'modals.send.tokenAddress',
            )}
          />
        </FormControl>
        {isYatFeatureEnabled && isYatSupportedChain && <YatBanner mt={6} />}
      </ModalBody>
      <ModalFooter {...(isYatFeatureEnabled && { display: 'flex', flexDir: 'column' })}>
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
          <Button width='full' variant='ghost' size='lg' mr={3} onClick={() => send.close()}>
            <Text translation='common.cancel' />
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
