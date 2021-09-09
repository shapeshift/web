import { useToast } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { FormProvider, useForm } from 'react-hook-form'
import {
  Redirect,
  Route,
  RouteComponentProps,
  Switch,
  useHistory,
  useLocation
} from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { SelectAssets } from '../../SelectAssets/SelectAssets'
import { Confirm } from './Confirm'
import { Details } from './Details'

// @TODO Determine if we should use symbol for display purposes or some other identifier for display
type SendInput = {
  address: string
  asset: string
  fee: string
  crypto: {
    amount: string
    symbol: string
  }
  fiat: {
    amount: string
    symbol: string
  }
}

export const Form = () => {
  const location = useLocation()
  const history = useHistory()
  const toast = useToast()
  const { send } = useModal()

  const methods = useForm<SendInput>({
    mode: 'onChange',
    defaultValues: {
      address: '',
      fee: 'Average',
      crypto: {
        amount: '',
        symbol: 'BTC' // @TODO wire up to state
      },
      fiat: {
        amount: '',
        symbol: 'USD' // @TODO wire up to state
      }
    }
  })

  const handleClick = () => {
    history.push('/send/details')
  }

  const handleSubmit = (data: any) => {
    console.info(data)
    send.close()
    toast({
      title: 'Bitcoin Sent.',
      description: 'You have successfully sent 0.005 BTC',
      status: 'success',
      duration: 9000,
      isClosable: true,
      position: 'top-right'
    })
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)}>
        <AnimatePresence exitBeforeEnter initial={false}>
          <Switch location={location} key={location.key}>
            <Route
              path='/send/select'
              component={(props: RouteComponentProps) => (
                <SelectAssets onClick={handleClick} {...props} />
              )}
            />
            <Route path='/send/details' component={Details} />
            <Route path='/send/confirm' component={Confirm} />
            <Redirect exact from='/' to='/send/select' />
          </Switch>
        </AnimatePresence>
      </form>
    </FormProvider>
  )
}
