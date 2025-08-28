import type { ButtonProps } from '@chakra-ui/react'
import { Button, useMediaQuery } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Drawer } from 'vaul'

import { useSafeDialog } from '@/context/DialogContextProvider/DialogContextProvider'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { breakpoints } from '@/theme/theme'

type ButtonWalletPredicateProps = {
  isValidWallet: boolean
} & ButtonProps

export const ButtonWalletPredicate = ({
  isValidWallet,
  children,
  ...restProps
}: ButtonWalletPredicateProps) => {
  const translate = useTranslate()
  const {
    dispatch,
    state: { isConnected },
  } = useWallet()
  const { isOpen } = useSafeDialog()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  const handleConnect = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  if (!isConnected) {
    // @TODO: This is a hack to close any drawer if this button is in the context of a drawer, remove me if we have a better way to handle multiple modal stacking
    if (isOpen && !isLargerThanMd) {
      return (
        <Drawer.Close>
          <Button {...restProps} onClick={handleConnect} isDisabled={false} colorScheme='blue'>
            {translate('common.connectWallet')}
          </Button>
        </Drawer.Close>
      )
    }

    return (
      <Button {...restProps} onClick={handleConnect} isDisabled={false} colorScheme='blue'>
        {translate('common.connectWallet')}
      </Button>
    )
  }

  return (
    <>
      <Button
        {...restProps}
        isDisabled={!isValidWallet || restProps.isDisabled}
        colorScheme={isValidWallet ? restProps.colorScheme : 'red'}
      >
        {children}
      </Button>
    </>
  )
}
