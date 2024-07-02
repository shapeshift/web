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
  const { dispatch } = useWallet()

  const handleConnect = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  return (
    <>
      {isValidWallet ? (
        <Button {...restProps}>{children}</Button>
      ) : (
        <Button {...restProps} onClick={handleConnect} isDisabled={false}>
          {translate('common.connectWallet')}
        </Button>
      )}
    </>
  )
}
