import { FormControl, FormLabel } from '@chakra-ui/react'
import { ethChainId } from '@shapeshiftoss/caip'
import type { Dispatch, FC, SetStateAction } from 'react'
import { useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { AddressInput } from 'components/Modals/Send/AddressInput/AddressInput'
import { SendFormFields } from 'components/Modals/Send/SendCommon'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { parseAddressInputWithChainId } from 'lib/address/address'
import { selectSwappersApiTradeQuotePending } from 'state/apis/swappers/selectors'
import { selectBuyAsset } from 'state/slices/swappersSlice/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

type ManualAddressEntryProps = {
  setIsManualAddressEntryValidating: Dispatch<SetStateAction<boolean>>
}

export const ManualAddressEntry: FC<ManualAddressEntryProps> = ({
  setIsManualAddressEntryValidating,
}): JSX.Element | null => {
  const dispatch = useAppDispatch()
  const isQuoteLoading = useAppSelector(selectSwappersApiTradeQuotePending)

  const {
    formState: { isValid: isFormValid },
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

  // Trigger re-validation of the manually entered receive address
  useEffect(() => {
    formTrigger(SendFormFields.Input)
  }, [formTrigger, shouldShowManualReceiveAddressInput])

  // Reset the manual address input state when the user changes the buy asset
  useEffect(() => {
    setFormValue(SendFormFields.Input, '')
  }, [buyAssetAssetId, setFormValue])

  // For safety, ensure we never have a receive address in the store if the form is invalid
  useEffect(() => {
    !isFormValid && dispatch(swappers.actions.setManualReceiveAddress(undefined))
  }, [isFormValid, dispatch])

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
          rules={{
            required: true,
            validate: {
              validateAddress: async (rawInput: string) => {
                dispatch(swappers.actions.setManualReceiveAddress(undefined))
                const value = rawInput.trim() // trim leading/trailing spaces
                setIsManualAddressEntryValidating(true)
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
                setIsManualAddressEntryValidating(false)
                dispatch(swappers.actions.setManualReceiveAddress(address || undefined))
                const invalidMessage = isYatSupported
                  ? 'common.invalidAddressOrYat'
                  : 'common.invalidAddress'
                return address ? true : invalidMessage
              },
            },
          }}
          placeholder={translate('trade.addressPlaceholder', { chainName: buyAssetChainName })}
        />
      </FormControl>
    )
  }, [
    buyAssetAssetId,
    buyAssetChainId,
    buyAssetChainName,
    dispatch,
    isYatSupported,
    setIsManualAddressEntryValidating,
    translate,
  ])

  return shouldShowManualReceiveAddressInput && !isQuoteLoading ? ManualReceiveAddressEntry : null
}
