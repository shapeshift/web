import { CloseIcon, EditIcon } from '@chakra-ui/icons'
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
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { AddressInput } from '@/components/Modals/Send/AddressInput/AddressInput'
import type { SendInput } from '@/components/Modals/Send/Form'
import { SendFormFields } from '@/components/Modals/Send/SendCommon'
import { useAccountIds } from '@/components/MultiHopTrade/hooks/useAccountIds'
import { useIsManualReceiveAddressRequired } from '@/components/MultiHopTrade/hooks/useIsManualReceiveAddressRequired'
import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import {
  checkIsMetaMaskDesktop,
  useIsSnapInstalled,
} from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChainAtRuntime } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { parseAddressInputWithChainId } from '@/lib/address/address'
import { middleEllipsis } from '@/lib/utils'

const editIcon = <EditIcon />
const closeIcon = <CloseIcon />

const iconButtonHoverSx = { bg: 'gray.600' }

type ManualReceiveAddressLabelsProps = {
  buyAsset: Asset
  manualAddressEntryDescription: string | undefined
}

const ManualReceiveAddressLabels = ({
  buyAsset,
  manualAddressEntryDescription,
}: ManualReceiveAddressLabelsProps) => {
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

type SharedTradeReceiveAddressProps = {
  buyAsset: Asset
  customReceiveAddressDescription?: string
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

export const SharedTradeReceiveAddress = ({
  buyAsset,
  customReceiveAddressDescription,
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
}: SharedTradeReceiveAddressProps) => {
  const translate = useTranslate()
  const { sellAssetAccountId } = useAccountIds()
  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress
  const { chainId: buyAssetChainId, assetId: buyAssetAssetId } = buyAsset
  const {
    formState: { isValidating, isValid },
    setValue: setFormValue,
    trigger,
  } = useFormContext()

  const value = useWatch<SendInput, SendFormFields.Input>({ name: SendFormFields.Input })
  const debouncedValue = useDebounce(value, 500)

  const [isReceiveAddressEditing, setIsReceiveAddressEditing] = useState(false)

  // If we have a valid manual receive address, set it in the form
  useEffect(() => {
    manualReceiveAddress && setFormValue(SendFormFields.Input, manualReceiveAddress)
  }, [manualReceiveAddress, setFormValue])

  useEffect(() => {
    onIsValidatingChange(isValidating)
  }, [onIsValidatingChange, isValidating])

  useEffect(() => {
    if (!isReceiveAddressEditing) return

    // minLength should catch this and make isValid false, but doesn't seem to on mount, even when manually triggering validation.
    if (!value?.length) {
      onIsValidChange(false)
      return
    }
    // We only want to set this when editing. Failure to do so will catch the initial '' invalid value (because of the minLength: 1)
    // and prevent continuing with the trade, when there is no manual receive address
    onIsValidChange(isValid)
  }, [isValid, onIsValidChange, isReceiveAddressEditing, value])

  const isCustomReceiveAddress = Boolean(manualReceiveAddress)
  const receiveAddressTranslation: TextPropTypes['translation'] = isCustomReceiveAddress
    ? 'trade.customReceiveAddress'
    : 'trade.receiveAddress'

  const rules = useMemo(
    () => ({
      required: true,
      validate: {
        validateAddress: async (rawInput: string) => {
          try {
            if (rawInput === '') return

            const value = rawInput.trim() // trim leading/trailing spaces
            // Don't go invalid on initial empty string
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

  const handleEditReceiveAddressClick = useCallback(() => {
    onEdit()
    setIsReceiveAddressEditing(true)
  }, [onEdit])

  const handleCancelClick = useCallback(() => {
    onCancel()
    setIsReceiveAddressEditing(false)
    setFormValue(SendFormFields.Input, '')
  }, [onCancel, setFormValue])

  const resetManualReceiveAddress = useCallback(() => {
    onReset()
    // Reset the form value itself, to avoid the user going from
    // custom receive address -> cleared custom receive address -> custom receive address where the previously set custom receive address
    // would be displayed, wrongly hinting this is the default wallet address
    setFormValue(SendFormFields.Input, '')
  }, [onReset, setFormValue])

  const shouldForceDisplayManualAddressEntry = useIsManualReceiveAddressRequired({
    shouldForceManualAddressEntry: Boolean(shouldForceManualAddressEntry),
    sellAccountId: sellAssetAccountId,
    buyAsset,
    manualReceiveAddress,
    walletReceiveAddress,
    isWalletReceiveAddressLoading,
  })

  useEffect(() => {
    if (!debouncedValue) return
    ;(async () => {
      try {
        setFormValue(SendFormFields.Input, debouncedValue)

        const isValidAddress = await trigger(SendFormFields.Input)

        if (isValidAddress) {
          onSubmit(debouncedValue)
          setIsReceiveAddressEditing(false)
        }
      } catch (error) {
        console.error('Error validating pasted address:', error)
      }
    })()
  }, [debouncedValue, trigger, onSubmit, setFormValue])

  if (isWalletReceiveAddressLoading) {
    return null
  }

  // The manual receive address input form
  if (isReceiveAddressEditing || shouldForceDisplayManualAddressEntry) {
    return (
      <FormControl>
        {shouldForceDisplayManualAddressEntry && (
          <ManualReceiveAddressLabels
            buyAsset={buyAsset}
            manualAddressEntryDescription={manualAddressEntryDescription}
          />
        )}
        <InputGroup>
          <AddressInput
            rules={rules}
            placeholder={translate('trade.enterCustomReceiveAddress')}
            pe={20}
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
              color='red.500'
              icon={closeIcon}
              aria-label='Cancel'
              size='xs'
              onClick={handleCancelClick}
              isDisabled={isValidating}
              borderRadius='full'
              bg='gray.700'
              _hover={iconButtonHoverSx}
            />
          </InputRightElement>
        </InputGroup>
        {Boolean(value?.length && !isValid) && (
          <Text translation='common.invalidAddress' color='yellow.200' mt={2} />
        )}
      </FormControl>
    )
  }

  // The summary of the receive address (existing or custom)
  return (
    <>
      {customReceiveAddressDescription && (
        <Row alignItems='center' fontSize='sm' fontWeight='medium'>
          <Row.Label>{customReceiveAddressDescription}</Row.Label>
        </Row>
      )}
      <Row alignItems='center' fontSize='sm' fontWeight='medium'>
        <Row.Label>
          <Text translation={receiveAddressTranslation} />
        </Row.Label>
        <Row.Value whiteSpace='nowrap'>
          {isCustomReceiveAddress ? (
            <Tooltip label={translate('trade.thisIsYourCustomReceiveAddress')} placement='top'>
              <Tag size='md' colorScheme='blue'>
                <TagLabel>{middleEllipsis(receiveAddress ?? '')}</TagLabel>
                <TagCloseButton onClick={resetManualReceiveAddress} />
              </Tag>
            </Tooltip>
          ) : (
            <Stack direction='row' spacing={2} alignItems='center'>
              <RawText>{middleEllipsis(receiveAddress ?? '')}</RawText>
              <Tooltip label={translate('trade.customReceiveAddressDescription')} placement='top'>
                <IconButton
                  aria-label='Edit receive address'
                  icon={editIcon}
                  variant='ghost'
                  minWidth={0}
                  top='-1px'
                  onClick={handleEditReceiveAddressClick}
                />
              </Tooltip>
            </Stack>
          )}
        </Row.Value>
      </Row>
    </>
  )
}
