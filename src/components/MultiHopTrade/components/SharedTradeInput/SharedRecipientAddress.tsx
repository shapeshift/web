import { CheckIcon, CloseIcon, EditIcon } from '@chakra-ui/icons'
import {
  FormControl,
  FormLabel,
  IconButton,
  InputGroup,
  InputRightElement,
  Link,
  Stack,
  Tag,
  TagCloseButton,
  TagLabel,
  Tooltip,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { AddressInput } from 'components/Modals/Send/AddressInput/AddressInput'
import type { SendInput } from 'components/Modals/Send/Form'
import { SendFormFields } from 'components/Modals/Send/SendCommon'
import { useAccountIds } from 'components/MultiHopTrade/hooks/useAccountIds'
import { useIsManualReceiveAddressRequired } from 'components/MultiHopTrade/hooks/useIsManualReceiveAddressRequired'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import {
  checkIsMetaMaskDesktop,
  useIsSnapInstalled,
} from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChainAtRuntime } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { parseAddressInputWithChainId } from 'lib/address/address'
import { middleEllipsis } from 'lib/utils'

const editIcon = <EditIcon />
const checkIcon = <CheckIcon />
const closeIcon = <CloseIcon />

type ManualRecipientAddressLabelsProps = {
  buyAsset: Asset
  manualAddressEntryDescription: string | undefined
}

const ManualRecipientAddressLabels = ({
  buyAsset,
  manualAddressEntryDescription,
}: ManualRecipientAddressLabelsProps) => {
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const { isSnapInstalled } = useIsSnapInstalled()
  const { open: openSnapsModal } = useModal('snaps')
  const { open: openManageAccountsModal } = useModal('manageAccounts')

  const walletSupportsBuyAssetChainAtRuntime = useWalletSupportsChainAtRuntime(
    buyAsset.chainId,
    wallet,
  )

  const buyAssetChainName = useMemo(() => {
    const chainAdapterManager = getChainAdapterManager()
    return chainAdapterManager.get(buyAsset.chainId)?.getDisplayName()
  }, [buyAsset])

  const isMetaMaskWalletWithoutSnap = useMemo(() => {
    return !isSnapInstalled && wallet && checkIsMetaMaskDesktop(wallet)
  }, [isSnapInstalled, wallet])

  // We're enabling the snap, so no versioning concerns here
  const handleEnableShapeShiftSnap = useCallback(() => openSnapsModal({}), [openSnapsModal])
  const handleAddAccount = useCallback(() => openManageAccountsModal({}), [openManageAccountsModal])

  return (
    <>
      <FormLabel color='yellow.400'>
        {manualAddressEntryDescription ??
          translate('trade.receiveAddressDescription', { chainName: buyAssetChainName })}
        {isMetaMaskWalletWithoutSnap && (
          <Link textDecor='underline' ml={1} onClick={handleEnableShapeShiftSnap}>
            {translate('trade.or')}
            &nbsp;{translate('trade.enableMetaMaskSnap')}
          </Link>
        )}
        {walletSupportsBuyAssetChainAtRuntime && (
          <>
            &nbsp;
            {translate('common.or')}
            <Link textDecor='underline' ml={1} onClick={handleAddAccount}>
              {translate('trade.connectChain', { chainName: buyAssetChainName })}
            </Link>
          </>
        )}
        &nbsp;{translate('trade.toContinue')}
      </FormLabel>
      <FormLabel color='white.500' w='full' fontWeight='bold'>
        {translate('trade.receiveAddress')}
      </FormLabel>
    </>
  )
}

type SharedRecipientAddressProps = {
  buyAsset: Asset
  customRecipientAddressDescription?: string
  isWalletReceiveAddressLoading: boolean
  manualAddressEntryDescription?: string
  manualReceiveAddress: string | undefined
  shouldForceManualAddressEntry?: boolean
  walletReceiveAddress: string | undefined
  onCancel: () => void
  onEdit: () => void
  onError: () => void
  onIsValidatingChange: (isValidating: boolean) => void
  onIsValidChange: (isValid: boolean) => void
  onReset: () => void
  onSubmit: (address: string) => void
}

export const SharedRecipientAddress = ({
  buyAsset,
  customRecipientAddressDescription,
  isWalletReceiveAddressLoading,
  manualAddressEntryDescription,
  manualReceiveAddress,
  shouldForceManualAddressEntry,
  walletReceiveAddress,
  onCancel,
  onEdit,
  onError,
  onIsValidatingChange,
  onIsValidChange,
  onReset,
  onSubmit,
}: SharedRecipientAddressProps) => {
  const translate = useTranslate()
  const { sellAssetAccountId } = useAccountIds()
  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress
  const { chainId: buyAssetChainId, assetId: buyAssetAssetId } = buyAsset
  const {
    formState: { isValidating, isValid },
    setValue: setFormValue,
    handleSubmit: handleFormContextSubmit,
  } = useFormContext()

  const value = useWatch<SendInput, SendFormFields.Input>({ name: SendFormFields.Input })
  const [isRecipientAddressEditing, setIsRecipientAddressEditing] = useState(false)

  // If we have a valid manual receive address, set it in the form
  useEffect(() => {
    manualReceiveAddress && setFormValue(SendFormFields.Input, manualReceiveAddress)
  }, [manualReceiveAddress, setFormValue])

  useEffect(() => {
    onIsValidatingChange(isValidating)
  }, [onIsValidatingChange, isValidating])

  useEffect(() => {
    if (!isRecipientAddressEditing) return

    // minLength should catch this and make isValid false, but doesn't seem to on mount, even when manually triggering validation.
    if (!value?.length) {
      onIsValidChange(false)
      return
    }
    // We only want to set this when editing. Failure to do so will catch the initial '' invalid value (because of the minLength: 1)
    // and prevent continuing with the trade, when there is no manual receive address
    onIsValidChange(isValid)
  }, [isValid, onIsValidChange, isRecipientAddressEditing, value])

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
            onError()
          }
        },
      },
      minLength: 1,
    }),
    [buyAssetAssetId, buyAssetChainId, onError],
  )

  const handleEditRecipientAddressClick = useCallback(() => {
    onEdit()
    setIsRecipientAddressEditing(true)
  }, [onEdit])

  const handleCancelClick = useCallback(() => {
    onCancel()
    setIsRecipientAddressEditing(false)
    setFormValue(SendFormFields.Input, '')
  }, [onCancel, setFormValue])

  const resetManualReceiveAddress = useCallback(() => {
    onReset()
    // Reset the form value itself, to avoid the user going from
    // custom recipient -> cleared custom recipient -> custom recipient where the previously set custom recipient
    // would be displayed, wrongly hinting this is the default wallet address
    setFormValue(SendFormFields.Input, '')
  }, [onReset, setFormValue])

  const handleSubmit = useCallback(
    (values: FieldValues) => {
      // We don't need to revalidate here as submit will only be enabled if the form is valid
      const address = values[SendFormFields.Input].trim()
      onSubmit(address)
      setIsRecipientAddressEditing(false)
    },
    [onSubmit],
  )

  const handleFormSubmit = useMemo(
    () => handleFormContextSubmit(handleSubmit),
    [handleFormContextSubmit, handleSubmit],
  )

  const shouldForceDisplayManualAddressEntry = useIsManualReceiveAddressRequired({
    shouldForceManualAddressEntry: Boolean(shouldForceManualAddressEntry),
    sellAccountId: sellAssetAccountId,
    buyAsset,
    manualReceiveAddress,
    walletReceiveAddress,
    isWalletReceiveAddressLoading,
  })

  if (isWalletReceiveAddressLoading) {
    return null
  }

  // The manual receive address input form
  if (isRecipientAddressEditing || shouldForceDisplayManualAddressEntry) {
    return (
      <form>
        <FormControl>
          {shouldForceDisplayManualAddressEntry && (
            <ManualRecipientAddressLabels
              buyAsset={buyAsset}
              manualAddressEntryDescription={manualAddressEntryDescription}
            />
          )}
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
    )
  }

  // The summary of the receive address (existing or custom)
  return (
    <>
      {customRecipientAddressDescription && (
        <Row alignItems='center' fontSize='sm' fontWeight='medium'>
          <Row.Label>{customRecipientAddressDescription}</Row.Label>
        </Row>
      )}
      <Row alignItems='center' fontSize='sm' fontWeight='medium'>
        <Row.Label>
          <Text translation={recipientAddressTranslation} />
        </Row.Label>
        <Row.Value whiteSpace='nowrap'>
          {isCustomRecipientAddress ? (
            <Tooltip label={translate('trade.thisIsYourCustomRecipientAddress')} placement='top'>
              <Tag size='md' colorScheme='blue'>
                <TagLabel>{middleEllipsis(receiveAddress ?? '')}</TagLabel>
                <TagCloseButton onClick={resetManualReceiveAddress} />
              </Tag>
            </Tooltip>
          ) : (
            <Stack direction='row' spacing={1} alignItems='center'>
              <RawText>{middleEllipsis(receiveAddress ?? '')}</RawText>
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
    </>
  )
}
