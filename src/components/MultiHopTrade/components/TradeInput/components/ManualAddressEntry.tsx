import { FormControl, FormLabel, Link } from '@chakra-ui/react'
import { type ChainId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { isMetaMask } from '@shapeshiftoss/hdwallet-metamask'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { AddressInput } from 'components/Modals/Send/AddressInput/AddressInput'
import { SendFormFields } from 'components/Modals/Send/SendCommon'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { parseAddressInputWithChainId } from 'lib/address/address'
import {
  selectAccountIdsByAssetId,
  selectIsAnyAccountMetadataLoadingForChainId,
} from 'state/slices/selectors'
import { selectInputBuyAsset } from 'state/slices/tradeInputSlice/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

type ManualAddressEntryProps = {
  description?: string
  shouldForceManualAddressEntry?: boolean
  chainId: ChainId
}

export const ManualAddressEntry: FC<ManualAddressEntryProps> = memo(
  ({
    description,
    shouldForceManualAddressEntry,
    chainId,
  }: ManualAddressEntryProps): JSX.Element | null => {
    const dispatch = useAppDispatch()

    const {
      formState: { isValidating },
      trigger: formTrigger,
      setValue: setFormValue,
    } = useFormContext()
    const translate = useTranslate()
    const isSnapEnabled = useFeatureFlag('Snaps')
    const { open: openSnapsModal } = useModal('snaps')
    const { open: openManageAccountsModal } = useModal('manageAccounts')

    const wallet = useWallet().state.wallet
    const { chainId: buyAssetChainId, assetId: buyAssetAssetId } =
      useAppSelector(selectInputBuyAsset)

    const { isSnapInstalled } = useIsSnapInstalled()
    const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAssetChainId, wallet)
    const buyAssetAccountIds = useAppSelector(state =>
      selectAccountIdsByAssetId(state, { assetId: buyAssetAssetId }),
    )
    const useReceiveAddressArgs = useMemo(
      () => ({
        fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
      }),
      [wallet],
    )
    const { manualReceiveAddress } = useReceiveAddress(useReceiveAddressArgs)

    const isAnyAccountMetadataLoadingByChainIdFilter = useMemo(() => ({ chainId }), [chainId])
    const isAnyAccountMetadataLoadingByChainId = useAppSelector(state =>
      selectIsAnyAccountMetadataLoadingForChainId(
        state,
        isAnyAccountMetadataLoadingByChainIdFilter,
      ),
    )

    const shouldShowManualReceiveAddressInput = useMemo(() => {
      // Some AccountIds are loading for that chain - don't show the manual address input since these will eventually be populated
      if (isAnyAccountMetadataLoadingByChainId) return false
      if (shouldForceManualAddressEntry) return true
      if (manualReceiveAddress) return false
      // Ledger "supports" all chains, but may not have them connected
      if (wallet && isLedger(wallet)) return !buyAssetAccountIds.length
      // We want to display the manual address entry if the wallet doesn't support the buy asset chain
      return !walletSupportsBuyAssetChain
    }, [
      isAnyAccountMetadataLoadingByChainId,
      shouldForceManualAddressEntry,
      manualReceiveAddress,
      wallet,
      buyAssetAccountIds.length,
      walletSupportsBuyAssetChain,
    ])

    const chainAdapterManager = getChainAdapterManager()
    const buyAssetChainName = chainAdapterManager.get(buyAssetChainId)?.getDisplayName()

    // Trigger re-validation of the manually entered receive address
    useEffect(() => {
      formTrigger(SendFormFields.Input)
    }, [formTrigger, shouldShowManualReceiveAddressInput])

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
            {!isSnapInstalled && isSnapEnabled && wallet && isMetaMask(wallet) && (
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
      isSnapEnabled,
      isSnapInstalled,
      rules,
      translate,
      wallet,
      description,
    ])

    return shouldShowManualReceiveAddressInput ? ManualReceiveAddressEntry : null
  },
)
