import { FormControl, FormLabel, Link } from '@chakra-ui/react'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { isMetaMask } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { AddressInput } from 'components/Modals/Send/AddressInput/AddressInput'
import { SendFormFields } from 'components/Modals/Send/SendCommon'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { parseAddressInputWithChainId } from 'lib/address/address'
import { selectInputBuyAsset } from 'state/slices/tradeInputSlice/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useTradeReceiveAddress } from '../hooks/useTradeReceiveAddress'

type ManualAddressEntryProps = {
  description?: string
  shouldForceManualAddressEntry?: boolean
}

export const ManualAddressEntry: FC<ManualAddressEntryProps> = memo(
  ({ description, shouldForceManualAddressEntry }: ManualAddressEntryProps): JSX.Element | null => {
    const dispatch = useAppDispatch()

    const {
      formState: { isValidating },
      trigger: formTrigger,
      setValue: setFormValue,
    } = useFormContext()
    const translate = useTranslate()
    const { open: openSnapsModal } = useModal('snaps')
    const { open: openManageAccountsModal } = useModal('manageAccounts')

    const wallet = useWallet().state.wallet
    const { chainId: buyAssetChainId, assetId: buyAssetAssetId } =
      useAppSelector(selectInputBuyAsset)

    const { isSnapInstalled } = useIsSnapInstalled()
    const { manualReceiveAddress } = useTradeReceiveAddress()
    const chainAdapterManager = getChainAdapterManager()
    const buyAssetChainName = chainAdapterManager.get(buyAssetChainId)?.getDisplayName()

    // Trigger re-validation of the manually entered receive address
    useEffect(() => {
      formTrigger(SendFormFields.Input)
    }, [formTrigger, shouldForceManualAddressEntry])

    // Reset the manual address input state when the user changes the buy asset
    useEffect(() => {
      dispatch(tradeInput.actions.setManualReceiveAddress(undefined))
      setFormValue(SendFormFields.Input, '')
    }, [buyAssetAssetId, dispatch, setFormValue])

    // If we have a valid manual receive address, set it in the form
    useEffect(() => {
      manualReceiveAddress && setFormValue(SendFormFields.Input, manualReceiveAddress)
    }, [manualReceiveAddress, setFormValue])

    useEffect(() => {
      dispatch(tradeInput.actions.setManualReceiveAddressIsValidating(isValidating))
    }, [dispatch, isValidating])

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
              const { address } = await parseAddressInputWithChainId(
                parseAddressInputWithChainIdArgs,
              )
              dispatch(tradeInput.actions.setManualReceiveAddress(address || undefined))
              const invalidMessage = 'common.invalidAddress'
              return address ? true : invalidMessage
            } catch (e) {
              // This function should never throw, but in case it ever does, we never want to have a stale manual receive address stored
              console.error(e)
              dispatch(tradeInput.actions.setManualReceiveAddress(undefined))
            }
          },
        },
      }),
      [buyAssetAssetId, buyAssetChainId, dispatch],
    )

    // We're enabling the snap, so no versioning concerns here
    const handleEnableShapeShiftSnap = useCallback(() => openSnapsModal({}), [openSnapsModal])
    const handleAddAccount = useCallback(
      () => openManageAccountsModal({}),
      [openManageAccountsModal],
    )

    const ManualReceiveAddressEntry: JSX.Element = useMemo(() => {
      return (
        <FormControl>
          <FormLabel color='yellow.400'>
            {description ??
              translate('trade.receiveAddressDescription', { chainName: buyAssetChainName })}
            {!isSnapInstalled && wallet && isMetaMask(wallet) && (
              <Link textDecor='underline' ml={1} onClick={handleEnableShapeShiftSnap}>
                {translate('trade.or')}
                &nbsp;{translate('trade.enableMetaMaskSnap')}
              </Link>
            )}
            {wallet && isLedger(wallet) && (
              <Link textDecor='underline' ml={1} onClick={handleAddAccount}>
                {translate('trade.connectChain', { chainName: buyAssetChainName })}
              </Link>
            )}
            &nbsp;{translate('trade.toContinue')}
          </FormLabel>
          <FormLabel color='white.500' w='full' fontWeight='bold'>
            {translate('trade.receiveAddress')}
          </FormLabel>
          <AddressInput
            rules={rules}
            placeholder={translate('trade.addressPlaceholder', { chainName: buyAssetChainName })}
          />
        </FormControl>
      )
    }, [
      buyAssetChainName,
      handleAddAccount,
      handleEnableShapeShiftSnap,
      isSnapInstalled,
      rules,
      translate,
      wallet,
      description,
    ])

    return shouldForceManualAddressEntry ? ManualReceiveAddressEntry : null
  },
)
