import { useToast } from '@chakra-ui/react'
import { ChainIdentifier, FeeData, FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { AssetMarketData } from '@shapeshiftoss/market-service'
import { AnimatePresence } from 'framer-motion'
import React from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import {
  Redirect,
  Route,
  RouteComponentProps,
  Switch,
  useHistory,
  useLocation
} from 'react-router-dom'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { bnOrZero } from 'lib/bignumber'

import { SelectAssets } from '../../SelectAssets/SelectAssets'
import { SendRoutes } from './Send'
import { Address } from './views/Address'
import { Confirm } from './views/Confirm'
import { Details } from './views/Details'
import { QrCodeScanner } from './views/QrCodeScanner'

// @TODO Determine if we should use symbol for display purposes or some other identifier for display
type SendInput = {
  address: string
  asset: any
  feeType: FeeDataKey
  estimatedFees: FeeData
  crypto: {
    amount: string
    symbol: string
  }
  fiat: {
    amount: string
    symbol: string
  }
  transaction: unknown
}

type SendFormProps = {
  asset: AssetMarketData
}

export const Form = ({ asset: initalAsset }: SendFormProps) => {
  const location = useLocation()
  const history = useHistory()
  const toast = useToast()
  const { send } = useModal()
  const chainAdapter = useChainAdapters()
  const {
    state: { wallet }
  } = useWallet()

  const methods = useForm<SendInput>({
    mode: 'onChange',
    defaultValues: {
      address: '',
      asset: initalAsset,
      feeType: FeeDataKey.Average,
      crypto: {
        amount: '',
        symbol: initalAsset?.symbol
      },
      fiat: {
        amount: '',
        symbol: 'USD' // TODO: localize currency
      }
    }
  })

  const handleAssetSelect = () => {
    /** @todo wire up asset select */
    // methods.setValue('asset', asset)
    history.push(SendRoutes.Details)
  }

  const handleSend = async (data: SendInput) => {
    if (wallet) {
      try {
        const path = "m/44'/60'/0'/0/0" // TODO (technojak) get path and asset precision from asset-service
        const adapter = chainAdapter.byChain(ChainIdentifier.Ethereum)
        const value = bnOrZero(data.crypto.amount)
          .times(bnOrZero(10).exponentiatedBy(data.asset.decimals || 18))
          .toFixed(0)
        const { txToSign } = await adapter.buildSendTransaction({
          to: data.address,
          value,
          erc20ContractAddress: data.asset.contractAddress,
          wallet,
          path,
          fee: data.estimatedFees[data.feeType].feeUnitPrice,
          limit: data.estimatedFees[data.feeType].feeUnits
        })
        const signedTx = await adapter.signTransaction({ txToSign, wallet })
        console.info('signedTx', signedTx)
        await adapter.broadcastTransaction(signedTx)
        send.close()
        toast({
          title: `${data.asset.name} sent`,
          description: `You have successfully sent ${data.crypto.amount} ${data.crypto.symbol}`,
          status: 'success',
          duration: 9000,
          isClosable: true,
          position: 'top-right'
        })
      } catch (error) {
        console.error(error)
      }
    }
  }

  const checkKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter') event.preventDefault()
  }

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form onSubmit={methods.handleSubmit(handleSend)} onKeyDown={checkKeyDown}>
        <AnimatePresence exitBeforeEnter initial={false}>
          <Switch location={location} key={location.key}>
            <Route
              path={SendRoutes.Select}
              component={(props: RouteComponentProps) => (
                <SelectAssets onClick={handleAssetSelect} {...props} />
              )}
            />
            <Route path={SendRoutes.Address} component={Address} />
            <Route path={SendRoutes.Details} component={Details} />
            <Route path={SendRoutes.Scan} component={QrCodeScanner} />
            <Route path={SendRoutes.Confirm} component={Confirm} />
            <Redirect exact from='/' to={SendRoutes.Select} />
          </Switch>
        </AnimatePresence>
      </form>
    </FormProvider>
  )
}
