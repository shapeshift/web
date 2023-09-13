import { ChevronRightIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import { Button, useDisclosure } from '@chakra-ui/react'
import { ConnectModal } from 'plugins/walletConnectToDapps/components/modals/connect/Connect'
import { useWalletConnectV2 } from 'plugins/walletConnectToDapps/v2/WalletConnectV2Provider'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { isSome } from 'lib/utils'

const widthProp = { base: 'full', md: 'auto' }

export const WalletConnectButtons = (buttonProps?: ButtonProps) => {
  const { isOpen, onClose: handleClose, onOpen: handleOpen } = useDisclosure()
  const translate = useTranslate()
  const { sessionsByTopic } = useWalletConnectV2()

  const hasSessions = useMemo(
    () => Object.values(sessionsByTopic).filter(isSome).length > 0,
    [sessionsByTopic],
  )

  return (
    <>
      <Button
        leftIcon={<WalletConnectIcon />}
        rightIcon={<ChevronRightIcon />}
        onClick={handleOpen}
        width={widthProp}
        {...buttonProps}
      >
        {hasSessions
          ? translate('plugins.walletConnectToDapps.header.connectAnotherDapp')
          : translate('plugins.walletConnectToDapps.header.connectDapp')}
      </Button>
      <ConnectModal isOpen={isOpen} onClose={handleClose} />
    </>
  )
}
