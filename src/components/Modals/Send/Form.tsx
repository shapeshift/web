import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  CHAIN_NAMESPACE,
  fromAccountId,
  fromAssetId,
  starknetChainId,
  toAccountId,
} from '@shapeshiftoss/caip'
import type { FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { useFormSend } from './hooks/useFormSend/useFormSend'
import { SendFormFields, SendRoutes } from './SendCommon'
import { maybeFetchChangeAddress } from './utils'
import { Address } from './views/Address'
import { Confirm } from './views/Confirm'
import { Status } from './views/Status'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { SendAmountDetails } from '@/components/Modals/Send/views/SendAmountDetails'
import { QrCodeScanner } from '@/components/QrCodeScanner/QrCodeScanner'
import { SelectAssetRouter } from '@/components/SelectAssets/SelectAssetRouter'
import { SlideTransition } from '@/components/SlideTransition'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useModal } from '@/hooks/useModal/useModal'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { parseAddress, parseAddressInputWithChainId } from '@/lib/address/address'
import { parseUrlDirect } from '@/lib/address/bip21'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { isStarknetChainAdapter } from '@/lib/utils/starknet'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectInternalAccountIdByAddress } from '@/state/slices/addressBookSlice/selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectFirstAccountIdByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountIdsByAssetIdFilter,
  selectPortfolioAccountMetadataByAccountId,
} from '@/state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

const status = <Status />
const sendAmount = <SendAmountDetails />
const address = <Address />

export type SendInput<T extends ChainId = ChainId> = {
  [SendFormFields.AccountId]: AccountId
  [SendFormFields.To]: string
  [SendFormFields.From]: string
  [SendFormFields.AmountFieldError]: string | [string, { asset: string }]
  [SendFormFields.AssetId]: AssetId
  [SendFormFields.AmountCryptoPrecision]: string
  [SendFormFields.EstimatedFees]: FeeDataEstimate<T>
  [SendFormFields.FeeType]: FeeDataKey
  [SendFormFields.FiatAmount]: string
  [SendFormFields.FiatSymbol]: string
  [SendFormFields.Input]: string
  [SendFormFields.Memo]?: string
  [SendFormFields.SendMax]: boolean
  [SendFormFields.VanityAddress]: string
  [SendFormFields.CustomNonce]?: string
  [SendFormFields.TxHash]?: string
  [SendFormFields.ChangeAddress]?: string
}

const formStyle = { height: '100%' }

type SendFormProps = {
  initialAssetId?: AssetId
  accountId?: AccountId
  input?: string
}

const selectRedirect = <Navigate to={SendRoutes.Select} replace />

export const Form: React.FC<SendFormProps> = ({ initialAssetId, input = '', accountId }) => {
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const send = useModal('send')
  const qrCode = useModal('qrCode')
  const deployStarknetAccount = useModal('deployStarknetAccount')
  const dispatch = useAppDispatch()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })
  const navigate = useNavigate()
  const { handleFormSend } = useFormSend()
  const mixpanel = getMixPanel()
  const selectedCurrency = useAppSelector(preferences.selectors.selectSelectedCurrency)
  const {
    state: { wallet },
  } = useWallet()

  const filter = useMemo(() => ({ assetId: initialAssetId }), [initialAssetId])
  const accountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetIdFilter(state, filter),
  )

  const [addressError, setAddressError] = useState<string | null>(null)

  const defaultAccountId = useMemo(() => {
    if (accountId) return accountId

    return accountIds[0]
  }, [accountIds, accountId])

  const methods = useForm<SendInput>({
    mode: 'onChange',
    defaultValues: {
      accountId: defaultAccountId,
      to: '',
      input,
      vanityAddress: '',
      assetId: initialAssetId,
      feeType: FeeDataKey.Average,
      amountCryptoPrecision: '',
      fiatAmount: '',
      fiatSymbol: selectedCurrency,
      txHash: '',
    },
  })

  const assetId = useWatch<SendInput, SendFormFields.AssetId>({
    name: SendFormFields.AssetId,
    control: methods.control,
  })
  const formAccountId = useWatch<SendInput, SendFormFields.AccountId>({
    name: SendFormFields.AccountId,
    control: methods.control,
  })
  const formAmountCryptoPrecision = useWatch<SendInput, SendFormFields.AmountCryptoPrecision>({
    name: SendFormFields.AmountCryptoPrecision,
    control: methods.control,
  })

  const handleClose = useCallback(() => {
    send.close()
    qrCode.close()
  }, [qrCode, send])

  const executeSend = useCallback(
    async (data: SendInput) => {
      const txHash = await handleFormSend(data, false)
      if (!txHash) return null
      mixpanel?.track(MixPanelEvent.SendBroadcast)
      methods.setValue(SendFormFields.TxHash, txHash)
      return txHash
    },
    [handleFormSend, methods, mixpanel],
  )

  const completeSendFlow = useCallback(
    (txHash: string, data: SendInput) => {
      const internalAccountIdFilter = {
        accountAddress: data.to,
        chainId: fromAccountId(formAccountId).chainId,
      }

      const { chainNamespace } = fromAccountId(formAccountId)

      const internalReceiveAccountId = (() => {
        if (chainNamespace === CHAIN_NAMESPACE.Evm) {
          return toAccountId({ chainId: fromAccountId(formAccountId).chainId, account: data.to })
        }

        return selectInternalAccountIdByAddress(store.getState(), internalAccountIdFilter)
      })()

      const accountIdsToRefetch = [formAccountId]

      if (internalReceiveAccountId) {
        accountIdsToRefetch.push(internalReceiveAccountId)
      }

      dispatch(
        actionSlice.actions.upsertAction({
          id: txHash,
          type: ActionType.Send,
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.SEND,
            txHash,
            chainId: fromAccountId(formAccountId).chainId,
            accountId: formAccountId,
            accountIdsToRefetch,
            assetId,
            amountCryptoPrecision: formAmountCryptoPrecision,
            message: 'modals.send.status.pendingBody',
          },
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      )

      toast({
        id: txHash,
        duration: isDrawerOpen ? 5000 : null,
        status: 'success',
        render: ({ onClose, ...props }) => {
          const handleClick = () => {
            onClose()
            openActionCenter()
          }

          return (
            <GenericTransactionNotification
              handleClick={handleClick}
              actionId={txHash}
              onClose={onClose}
              {...props}
            />
          )
        },
      })

      handleClose()
    },
    [
      assetId,
      dispatch,
      formAccountId,
      formAmountCryptoPrecision,
      handleClose,
      isDrawerOpen,
      openActionCenter,
      toast,
    ],
  )

  const handleSubmit = useCallback(
    async (data: SendInput) => {
      if (!wallet) return

      // Get change address if this is UTXO
      const changeAddress = await maybeFetchChangeAddress({ sendInput: data, wallet })
      if (changeAddress) {
        methods.setValue(SendFormFields.ChangeAddress, changeAddress)
      }

      const { chainId } = fromAccountId(formAccountId)
      if (chainId === starknetChainId) {
        const chainAdapterManager = getChainAdapterManager()
        const adapter = chainAdapterManager.get(chainId)
        if (isStarknetChainAdapter(adapter)) {
          const fromAddress = fromAccountId(formAccountId).account
          const isDeployed = await adapter.isAccountDeployed(fromAddress)
          if (!isDeployed) {
            deployStarknetAccount.open({
              onConfirm: async () => {
                try {
                  const feeData = await adapter.getFeeData()
                  const maxFee = feeData.fast.chainSpecific.maxFee

                  const accountMetadata = selectPortfolioAccountMetadataByAccountId(
                    store.getState(),
                    {
                      accountId: formAccountId,
                    },
                  )
                  const accountNumber = accountMetadata?.bip44Params.accountNumber ?? 0

                  const deployTxHash = await adapter.deployAccount({
                    accountNumber,
                    wallet,
                    maxFee,
                  })

                  if (!deployTxHash) {
                    toast({
                      status: 'error',
                      title: 'Failed to deploy account',
                      description: 'Could not deploy Starknet account',
                    })
                    return
                  }

                  toast({
                    status: 'info',
                    title: 'Deploying account...',
                    description: 'Waiting for account deployment to be confirmed',
                    duration: null,
                  })

                  const starknetProvider = adapter.getStarknetProvider()
                  await starknetProvider.waitForTransaction(deployTxHash, {
                    retryInterval: 2000,
                    successStates: ['ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'],
                  })

                  toast({
                    status: 'success',
                    title: 'Account deployed',
                    description: 'Your Starknet account has been deployed successfully',
                    duration: 3000,
                  })

                  // Wait a moment for the nonce to update before proceeding with send
                  await new Promise(resolve => setTimeout(resolve, 2000))

                  const txHash = await executeSend(data)
                  if (!txHash) return
                  completeSendFlow(txHash, data)
                } catch (error) {
                  console.error('Failed to deploy Starknet account:', error)
                  toast({
                    status: 'error',
                    title: 'Deployment failed',
                    description: error instanceof Error ? error.message : 'Unknown error',
                  })
                }
              },
              onCancel: () => {},
            })
            return
          }
        }
      }

      const txHash = await executeSend(data)
      if (!txHash) return

      completeSendFlow(txHash, data)
    },
    [wallet, methods, formAccountId, deployStarknetAccount, executeSend, completeSendFlow, toast],
  )

  const handleAssetSelect = useCallback(
    (assetId: AssetId) => {
      // Set all form values
      methods.setValue(SendFormFields.AssetId, assetId)
      methods.setValue(SendFormFields.AmountCryptoPrecision, '')
      methods.setValue(SendFormFields.FiatAmount, '')
      methods.setValue(SendFormFields.FiatSymbol, selectedCurrency)

      const accountId = selectFirstAccountIdByChainId(
        store.getState(),
        fromAssetId(assetId).chainId,
      )

      // Only set accountId if one exists for this chain
      if (accountId) {
        methods.setValue(SendFormFields.AccountId, accountId)
      }

      // Use requestAnimationFrame to ensure navigation happens after state updates
      requestAnimationFrame(() => {
        navigate(SendRoutes.Address, { replace: true })
      })
    },
    [navigate, methods, selectedCurrency],
  )

  const handleBack = useCallback(() => {
    setAddressError(null)
    navigate(-1)
  }, [navigate])

  const checkKeyDown = useCallback((event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter') event.preventDefault()
  }, [])

  // The QR code scanning was succesful, doesn't mean the address itself is valid
  const handleQrSuccess = useCallback(
    async (decodedText: string) => {
      try {
        const urlDirectResult = parseUrlDirect(decodedText)

        const maybeUrlResult = await (() => {
          if (urlDirectResult)
            return {
              assetId: urlDirectResult.assetId,
              chainId: urlDirectResult.chainId,
              value: decodedText,
              amountCryptoPrecision: urlDirectResult.amountCryptoPrecision,
            }
          return parseAddress({ address: decodedText })
        })()

        const address = urlDirectResult
          ? urlDirectResult.maybeAddress
          : (
              await parseAddressInputWithChainId({
                assetId: maybeUrlResult.assetId,
                chainId: maybeUrlResult.chainId,
                urlOrAddress: decodedText,
              })
            ).address

        methods.setValue(SendFormFields.Input, address)

        // Update assetId and accountId if detected from QR code
        if (maybeUrlResult.assetId) {
          methods.setValue(SendFormFields.AssetId, maybeUrlResult.assetId)

          // Get accounts for this asset to ensure we have a valid accountId
          const state = store.getState()
          const accountIds = selectPortfolioAccountIdsByAssetIdFilter(state, {
            assetId: maybeUrlResult.assetId,
          })
          const accountId = accountIds[0]

          // Only set accountId if one exists for this asset
          if (accountId) {
            methods.setValue(SendFormFields.AccountId, accountId)
          }
        }

        if (maybeUrlResult.assetId && maybeUrlResult.amountCryptoPrecision) {
          const marketData = selectMarketDataByAssetIdUserCurrency(
            store.getState(),
            maybeUrlResult.assetId ?? '',
          )
          methods.setValue(
            SendFormFields.AmountCryptoPrecision,
            maybeUrlResult.amountCryptoPrecision,
          )
          methods.setValue(
            SendFormFields.FiatAmount,
            bnOrZero(maybeUrlResult.amountCryptoPrecision)
              .times(bnOrZero(marketData?.price))
              .toString(),
          )
        }
        navigate(SendRoutes.Address)
      } catch (e: any) {
        setAddressError(e.message)
      }
    },
    [navigate, methods],
  )

  const qrCodeScanner = useMemo(
    () => (
      <QrCodeScanner onSuccess={handleQrSuccess} onBack={handleBack} addressError={addressError} />
    ),
    [addressError, handleBack, handleQrSuccess],
  )

  const selectAssetRouter = useMemo(
    () => <SelectAssetRouter onClick={handleAssetSelect} />,
    [handleAssetSelect],
  )

  const location = useLocation()

  const confirm = useMemo(
    () => <Confirm handleSubmit={methods.handleSubmit(handleSubmit)} />,
    [handleSubmit, methods],
  )

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form
        style={formStyle}
        onSubmit={methods.handleSubmit(handleSubmit)}
        onKeyDown={checkKeyDown}
      >
        <AnimatePresence mode='wait' initial={false}>
          {/* Instead of a redirect which would produce a flash of content, we simply render the select route in place of <Switch />ing here */}
          {!initialAssetId && !assetId ? (
            <SlideTransition className='flex flex-col h-full'>{selectAssetRouter}</SlideTransition>
          ) : (
            <Switch location={location.pathname}>
              <Route path={SendRoutes.Select}>{selectAssetRouter}</Route>
              <Route path={SendRoutes.Address}>{address}</Route>
              <Route path={SendRoutes.AmountDetails}>{sendAmount}</Route>
              <Route path={SendRoutes.Scan}>{qrCodeScanner}</Route>
              <Route path={SendRoutes.Confirm}>{confirm}</Route>
              <Route path={SendRoutes.Status}>{status}</Route>
              <Route path='/'>{selectRedirect}</Route>
            </Switch>
          )}
        </AnimatePresence>
      </form>
    </FormProvider>
  )
}
