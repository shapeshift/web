import type { ButtonProps } from '@chakra-ui/react'
import { Button } from '@chakra-ui/react'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

type ButtonWalletPredicateProps = {
  isValidWallet: boolean
  invalidWalletTranslation?: string | [string, InterpolationOptions]
  onWalletNotConnectedClick?: () => void
} & ButtonProps

export const ButtonWalletPredicate = ({
  isValidWallet,
  invalidWalletTranslation = 'common.connectWallet',
  children,
  onWalletNotConnectedClick,
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
        <Button
          {...restProps}
          onClick={onWalletNotConnectedClick ?? handleConnect}
          isDisabled={false}
        >
          {translate(invalidWalletTranslation)}
        </Button>
      )}
    </>
  )
}
