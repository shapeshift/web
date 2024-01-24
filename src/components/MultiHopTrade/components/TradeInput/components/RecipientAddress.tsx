import { CheckIcon, CloseIcon, EditIcon } from '@chakra-ui/icons'
import {
  Box,
  Divider,
  FormControl,
  IconButton,
  InputGroup,
  InputRightElement,
  Stack,
  Tooltip,
} from '@chakra-ui/react'
import { ethChainId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { AddressInput } from 'components/Modals/Send/AddressInput/AddressInput'
import { SendFormFields } from 'components/Modals/Send/SendCommon'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { parseAddressInputWithChainId } from 'lib/address/address'
import { middleEllipsis } from 'lib/utils'
import { selectInputBuyAsset } from 'state/slices/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

const editIcon = <EditIcon />
const checkIcon = <CheckIcon />
const closeIcon = <CloseIcon />

export const RecipientAddress = () => {
  const translate = useTranslate()
  const isHolisticRecipientAddressEnabled = useFeatureFlag('HolisticRecipientAddress')
  const isYatFeatureEnabled = useFeatureFlag('Yat')
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
  const isYatSupportedByReceiveChain = buyAssetChainId === ethChainId // yat only supports eth mainnet
  const isYatSupported = isYatFeatureEnabled && isYatSupportedByReceiveChain
  const {
    formState: { isValidating, isValid },
    // trigger: formTrigger, // TODO(gomes): do we need this?
    setValue: setFormValue,
    handleSubmit,
  } = useFormContext()

  // If we have a valid manual receive address, set it in the form
  useEffect(() => {
    manualReceiveAddress && setFormValue(SendFormFields.Input, manualReceiveAddress)
  }, [manualReceiveAddress, setFormValue])

  useEffect(() => {
    dispatch(tradeInput.actions.setManualReceiveAddressIsValidating(isValidating))
  }, [dispatch, isValidating])

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
            const invalidMessage = isYatSupported
              ? 'common.invalidAddressOrYat'
              : 'common.invalidAddress'
            return address ? true : invalidMessage
          } catch (e) {
            // This function should never throw, but in case it ever does, we never want to have a stale manual receive address stored
            console.error(e)
            dispatch(tradeInput.actions.setManualReceiveAddress(undefined))
          }
        },
      },
    }),
    [buyAssetAssetId, buyAssetChainId, dispatch, isYatSupported],
  )

  const [isRecipientAddressEditing, setIsRecipientAddressEditing] = useState(false)
  const handleEditRecipientAddressClick = useCallback(() => {
    setIsRecipientAddressEditing(true)
  }, [])

  const handleCancelClick = useCallback(() => {
    setIsRecipientAddressEditing(false)
  }, [])

  const onSubmit = useCallback(
    (values: FieldValues) => {
      // We don't need to revalidate here as submit will only be enabled if the form is valid
      const address = values[SendFormFields.Input]
      dispatch(tradeInput.actions.setManualReceiveAddress(address))
    },
    [dispatch],
  )

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

  if (!isHolisticRecipientAddressEnabled) return null
  if (!receiveAddress) return null

  return isRecipientAddressEditing ? (
    <form>
      <FormControl>
        <InputGroup size='sm'>
          <AddressInput
            rules={rules}
            placeholder={translate('trade.enterCustomRecipientAddress')}
          />
          <InputRightElement width='4.5rem'>
            <Box
              as='button'
              disabled={!isValid}
              display='flex'
              alignItems='center'
              justifyContent='space-between'
              width='full'
              px='2'
              onClick={handleFormSubmit}
            >
              {checkIcon}
            </Box>
            <Box
              as='button'
              display='flex'
              alignItems='center'
              justifyContent='center'
              borderRadius='md'
              onClick={handleCancelClick}
            >
              {closeIcon}
            </Box>
          </InputRightElement>
        </InputGroup>
      </FormControl>
    </form>
  ) : (
    <>
      <Divider borderColor='border.base' />
      <Row>
        <Row.Label>
          <Text translation={recipientAddressTranslation} />
        </Row.Label>
        <Row.Value whiteSpace='nowrap'>
          <Stack direction='row' spacing={1} alignItems='center'>
            <RawText>{middleEllipsis(receiveAddress)}</RawText>
            <Tooltip
              label={translate('trade.customRecipientAddressDescription')}
              placement='top'
              hasArrow
            >
              <IconButton
                aria-label='Edit recipient address'
                icon={editIcon}
                variant='ghost'
                onClick={handleEditRecipientAddressClick}
              />
            </Tooltip>
          </Stack>
        </Row.Value>
      </Row>
    </>
  )
}
