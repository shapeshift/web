import { CheckIcon, CloseIcon, EditIcon } from '@chakra-ui/icons'
import {
  FormControl,
  IconButton,
  InputGroup,
  InputRightElement,
  Stack,
  Tag,
  TagCloseButton,
  TagLabel,
  Tooltip,
} from '@chakra-ui/react'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { AddressInput } from 'components/Modals/Send/AddressInput/AddressInput'
import type { SendInput } from 'components/Modals/Send/Form'
import { SendFormFields } from 'components/Modals/Send/SendCommon'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { parseAddressInputWithChainId } from 'lib/address/address'
import { middleEllipsis } from 'lib/utils'
import { selectInputBuyAsset } from 'state/slices/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

const editIcon = <EditIcon />
const checkIcon = <CheckIcon />
const closeIcon = <CloseIcon />

type RecipientAddressProps = {
  shouldForceManualAddressEntry?: boolean
}

export const RecipientAddress: React.FC<RecipientAddressProps> = ({
  shouldForceManualAddressEntry,
}) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const wallet = useWallet().state.wallet
  const useReceiveAddressArgs = useMemo(
    () => ({
      fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
    }),
    [wallet],
  )
  const { manualReceiveAddress, walletReceiveAddress } = useReceiveAddress(useReceiveAddressArgs)
  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress
  const { chainId: buyAssetChainId, assetId: buyAssetAssetId } = useAppSelector(selectInputBuyAsset)
  const {
    formState: { isValidating, isValid },
    // trigger: formTrigger, // TODO(gomes): do we need this?
    setValue: setFormValue,
    handleSubmit,
  } = useFormContext()

  const value = useWatch<SendInput, SendFormFields.Input>({ name: SendFormFields.Input })
  const [isRecipientAddressEditing, setIsRecipientAddressEditing] = useState(false)

  // If we have a valid manual receive address, set it in the form
  useEffect(() => {
    manualReceiveAddress && setFormValue(SendFormFields.Input, manualReceiveAddress)
  }, [manualReceiveAddress, setFormValue])

  useEffect(() => {
    dispatch(tradeInput.actions.setManualReceiveAddressIsValidating(isValidating))
  }, [dispatch, isValidating])
  useEffect(() => {
    if (!isRecipientAddressEditing) return

    // minLength should catch this and make isValid false, but doesn't seem to on mount, even when manually triggering validation.
    if (!value?.length) {
      dispatch(tradeInput.actions.setManualReceiveAddressIsValid(false))
      return
    }
    // We only want to set this when editing. Failure to do so will catch the initial '' invalid value (because of the minLength: 1)
    // and prevent continuing with the trade, when there is no manual receive address
    dispatch(tradeInput.actions.setManualReceiveAddressIsValid(isValid))
  }, [isValid, dispatch, isRecipientAddressEditing, value])

  const isCustomRecipientAddress = Boolean(manualReceiveAddress)
  const recipientAddressTranslation: TextPropTypes['translation'] = isCustomRecipientAddress
    ? 'trade.customRecipientAddress'
    : 'trade.recipientAddress'

  const rules = useMemo(
    () => ({
      required: true,
      validate: {
        validateAddress: async (rawInput: string) => {
          try {
            const value = rawInput.trim() // trim leading/trailing spaces
            // this does not throw, everything inside is handled
            const parseAddressInputWithChainIdArgs = {
              assetId: buyAssetAssetId,
              chainId: buyAssetChainId,
              urlOrAddress: value,
              disableUrlParsing: true,
            }
            const { address } = await parseAddressInputWithChainId(parseAddressInputWithChainIdArgs)
            const invalidMessage = 'common.invalidAddress'
            return address ? true : invalidMessage
          } catch (e) {
            // This function should never throw, but in case it ever does, we never want to have a stale manual receive address stored
            console.error(e)
            dispatch(tradeInput.actions.setManualReceiveAddress(undefined))
          }
        },
      },
      minLength: 1,
    }),
    [buyAssetAssetId, buyAssetChainId, dispatch],
  )

  const handleEditRecipientAddressClick = useCallback(() => {
    dispatch(tradeInput.actions.setManualReceiveAddressIsEditing(true))
    setIsRecipientAddressEditing(true)
  }, [dispatch])

  const handleCancelClick = useCallback(() => {
    setIsRecipientAddressEditing(false)
    dispatch(tradeInput.actions.setManualReceiveAddressIsEditing(false))
    // Reset form value and valid state on cancel so the valid check doesn't wrongly evaluate to false after bailing out of editing an invalid address
    setFormValue(SendFormFields.Input, '')
    dispatch(tradeInput.actions.setManualReceiveAddressIsValid(undefined))
  }, [dispatch, setFormValue])

  const resetManualReceiveAddress = useCallback(() => {
    // Reset the manual receive address in store
    dispatch(tradeInput.actions.setManualReceiveAddress(undefined))
    // Reset the valid state in store
    dispatch(tradeInput.actions.setManualReceiveAddressIsValid(undefined))
    // And also the form value itself, to avoid the user going from
    // custom recipient -> cleared custom recipient -> custom recipient where the previously set custom recipient
    // would be displayed, wrongly hinting this is the default wallet address
    setFormValue(SendFormFields.Input, '')
  }, [dispatch, setFormValue])

  const onSubmit = useCallback(
    (values: FieldValues) => {
      // We don't need to revalidate here as submit will only be enabled if the form is valid
      const address = values[SendFormFields.Input].trim()
      dispatch(tradeInput.actions.setManualReceiveAddress(address))
      setIsRecipientAddressEditing(false)
      dispatch(tradeInput.actions.setManualReceiveAddressIsEditing(false))
    },
    [dispatch],
  )

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

  if (!receiveAddress || shouldForceManualAddressEntry) return null

  return isRecipientAddressEditing ? (
    <form>
      <FormControl>
        <InputGroup>
          <AddressInput
            rules={rules}
            placeholder={translate('trade.enterCustomRecipientAddress')}
          />
          <InputRightElement
            width='full'
            height='full'
            display='flex'
            gap={2}
            pr={2}
            alignItems='center'
            justifyContent='flex-end'
            pointerEvents='none'
          >
            <IconButton
              pointerEvents='auto'
              color='green.500'
              aria-label='Save'
              isDisabled={!isValid || isValidating || !value?.length}
              size='xs'
              onClick={handleFormSubmit}
              icon={checkIcon}
              isLoading={isValidating}
            />
            <IconButton
              pointerEvents='auto'
              color='red.500'
              icon={closeIcon}
              aria-label='Cancel'
              size='xs'
              onClick={handleCancelClick}
              isDisabled={isValidating}
            />
          </InputRightElement>
        </InputGroup>
        {Boolean(value?.length && !isValid) && (
          <Text translation='common.invalidAddress' color='yellow.200' mt={2} />
        )}
      </FormControl>
    </form>
  ) : (
    <Row alignItems='center' fontSize='sm' fontWeight='medium'>
      <Row.Label>
        <Text translation={recipientAddressTranslation} />
      </Row.Label>
      <Row.Value whiteSpace='nowrap'>
        {isCustomRecipientAddress ? (
          <Tooltip label={translate('trade.thisIsYourCustomRecipientAddress')} placement='top'>
            <Tag size='md' colorScheme='blue'>
              <TagLabel>{middleEllipsis(receiveAddress)}</TagLabel>
              <TagCloseButton onClick={resetManualReceiveAddress} />
            </Tag>
          </Tooltip>
        ) : (
          <Stack direction='row' spacing={1} alignItems='center'>
            <RawText>{middleEllipsis(receiveAddress)}</RawText>
            <Tooltip label={translate('trade.customRecipientAddressDescription')} placement='top'>
              <IconButton
                aria-label='Edit recipient address'
                icon={editIcon}
                variant='ghost'
                onClick={handleEditRecipientAddressClick}
              />
            </Tooltip>
          </Stack>
        )}
      </Row.Value>
    </Row>
  )
}
