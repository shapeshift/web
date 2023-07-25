import { FormControl, FormLabel } from '@chakra-ui/react'
import { ethChainId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { memo, useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { AddressInput } from 'components/Modals/Send/AddressInput/AddressInput'
import { SendFormFields } from 'components/Modals/Send/SendCommon'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { parseAddressInputWithChainId } from 'lib/address/address'
import { selectBuyAsset, selectManualReceiveAddress } from 'state/slices/swappersSlice/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

export const ManualAddressEntry: FC = memo((): JSX.Element | null => {
  const dispatch = useAppDispatch()

  const {
    formState: { isValidating },
    trigger: formTrigger,
    setValue: setFormValue,
  } = useFormContext()
  const translate = useTranslate()
  const isYatFeatureEnabled = useFeatureFlag('Yat')

  const wallet = useWallet().state.wallet
  const { chainId: buyAssetChainId, assetId: buyAssetAssetId } = useAppSelector(selectBuyAsset)
  const isYatSupportedByReceiveChain = buyAssetChainId === ethChainId // yat only supports eth mainnet
  const isYatSupported = isYatFeatureEnabled && isYatSupportedByReceiveChain

  const walletSupportsBuyAssetChain = walletSupportsChain({ chainId: buyAssetChainId, wallet })
  const shouldShowManualReceiveAddressInput = !walletSupportsBuyAssetChain

  const chainAdapterManager = getChainAdapterManager()
  const buyAssetChainName = chainAdapterManager.get(buyAssetChainId)?.getDisplayName()
  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  // Trigger re-validation of the manually entered receive address
  useEffect(() => {
    formTrigger(SendFormFields.Input)
  }, [formTrigger, shouldShowManualReceiveAddressInput])

  // Reset the manual address input state when the user changes the buy asset
  useEffect(() => {
    dispatch(swappers.actions.setManualReceiveAddress(undefined))
    setFormValue(SendFormFields.Input, '')
  }, [buyAssetAssetId, dispatch, setFormValue])

  // If we have a valid manual receive address, set it in the form
  useEffect(() => {
    manualReceiveAddress && setFormValue(SendFormFields.Input, manualReceiveAddress)
  }, [dispatch, manualReceiveAddress, setFormValue])

  useEffect(() => {
    dispatch(swappers.actions.setManualReceiveAddressIsValidating(isValidating))
  }, [dispatch, isValidating])

  const rules = useMemo(
    () => ({
      required: true,
      validate: {
        validateAddress: async (rawInput: string) => {
          dispatch(swappers.actions.setManualReceiveAddress(undefined))
          const value = rawInput.trim() // trim leading/trailing spaces
          // this does not throw, everything inside is handled
          const parseAddressInputWithChainIdArgs = {
            assetId: buyAssetAssetId,
            chainId: buyAssetChainId,
            urlOrAddress: value,
            disableUrlParsing: true,
          }
          const { address } = await parseAddressInputWithChainId(parseAddressInputWithChainIdArgs)
          dispatch(swappers.actions.setManualReceiveAddress(address || undefined))
          const invalidMessage = isYatSupported
            ? 'common.invalidAddressOrYat'
            : 'common.invalidAddress'
          return address ? true : invalidMessage
        },
      },
    }),
    [buyAssetAssetId, buyAssetChainId, dispatch, isYatSupported],
  )

  const ManualReceiveAddressEntry: JSX.Element = useMemo(() => {
    return (
      <FormControl>
        <FormLabel color='white.500' w='full' fontWeight='bold'>
          {translate('trade.receiveAddress')}
        </FormLabel>
        <FormLabel color='yellow.400'>
          {translate('trade.receiveAddressDescription', { chainName: buyAssetChainName })}
        </FormLabel>
        <AddressInput
          rules={rules}
          placeholder={translate('trade.addressPlaceholder', { chainName: buyAssetChainName })}
        />
      </FormControl>
    )
  }, [buyAssetChainName, rules, translate])

  return shouldShowManualReceiveAddressInput ? ManualReceiveAddressEntry : null
})
