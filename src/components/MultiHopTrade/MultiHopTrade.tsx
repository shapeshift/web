import { KeplrHDWallet } from '@shapeshiftoss/hdwallet-keplr/dist/keplr'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { CardProps } from 'components/Card/Card'
import { Card } from 'components/Card/Card'
import { MessageOverlay } from 'components/MessageOverlay/MessageOverlay'
import { useWallet } from 'hooks/useWallet/useWallet'

export const MultiHopTrade = (props: CardProps) => {
  const {
    state: { wallet },
  } = useWallet()
  const isKeplr = useMemo(() => wallet instanceof KeplrHDWallet, [wallet])

  const translate = useTranslate()
  const overlayTitle = useMemo(
    () => translate('trade.swappingComingSoonForWallet', { walletName: 'Keplr' }),
    [translate],
  )

  return (
    <MessageOverlay show={isKeplr} title={overlayTitle}>
      <Card flex={1} {...props}>
        hello
      </Card>
    </MessageOverlay>
  )
}
