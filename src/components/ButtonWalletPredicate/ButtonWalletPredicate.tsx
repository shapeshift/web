import type { ButtonProps } from '@chakra-ui/react'
import { Button } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

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
    state: { isDemoWallet },
  } = useWallet()

  const handleConnect = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  if (isDemoWallet)
    return (
      <Button {...restProps} onClick={handleConnect} isDisabled={false} colorScheme='blue'>
        {translate('common.connectWallet')}
      </Button>
    )

  return (
    <>
      <Button
        {...restProps}
        isDisabled={!isValidWallet}
        colorScheme={isValidWallet ? restProps.colorScheme : 'red'}
      >
        {children}
      </Button>
    </>
  )
}
