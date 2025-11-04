import { captureException } from '@sentry/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { ConnectContent } from '@/plugins/walletConnectToDapps/components/modals/connect/ConnectContent'
import { useWalletConnectV2 } from '@/plugins/walletConnectToDapps/WalletConnectV2Provider'

type Props = {
  initialUri?: string
  isOpen: boolean
  onClose(): void
}

const borderRadiusProp = { base: 0, md: 'xl' }
const maxWidthProp = { base: 'full', md: '500px' }

const Connect = ({ initialUri, isOpen, onClose }: Props) => {
  const { pair } = useWalletConnectV2()
  const translate = useTranslate()
  const toast = useNotificationToast({ desktopPosition: 'top-right' })

  const handleConnectV2 = useCallback(
    async (uri: string) => {
      try {
        const connectionResult = await pair?.({ uri })
        if (connectionResult) onClose()
      } catch (error: unknown) {
        console.error('WalletConnect connection error:', error)

        // This should *not* be an exception, we handle this as part of our flow.
        if ((error as Error)?.message.includes('Pairing already exists')) {
          toast({
            title: translate('plugins.walletConnectToDapps.errors.errorConnectingToDapp'),
            description: translate('plugins.walletConnectToDapps.errors.pairingAlreadyExists'),
            status: 'error',
            duration: 5000,
            isClosable: true,
          })

          return
        }

        captureException(error)
      }
    },
    [onClose, pair, toast, translate],
  )

  return (
    <Dialog isOpen={isOpen} onClose={onClose} isFullScreen={true}>
      <DialogBody
        width='full'
        textAlign='center'
        p={0}
        borderRadius={borderRadiusProp}
        maxWidth={maxWidthProp}
      >
        <ConnectContent initialUri={initialUri} handleConnect={handleConnectV2} />
      </DialogBody>
    </Dialog>
  )
}

export const ConnectModal = Connect
