import { ArrowForwardIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'

import type { ResultsEmptyProps } from './ResultsEmpty'
import { ResultsEmpty } from './ResultsEmpty'

import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const ResultsEmptyNoWallet: React.FC<ResultsEmptyProps> = ({
  icon,
  title,
  body,
  children,
}) => {
  const { dispatch } = useWallet()

  const handleConnect = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  const buttonProps: ButtonProps = useMemo(
    () => ({
      colorScheme: 'blue',
      onClick: handleConnect,
      rightIcon: <ArrowForwardIcon />,
    }),
    [handleConnect],
  )

  return (
    <ResultsEmpty
      icon={icon}
      title={title}
      body={body}
      ctaText='common.connectWallet'
      buttonProps={buttonProps}
    >
      {children}
    </ResultsEmpty>
  )
}
