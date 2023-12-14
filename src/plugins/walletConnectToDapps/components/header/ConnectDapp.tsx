import { ChevronRightIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import { Button, Tooltip, useDisclosure } from '@chakra-ui/react'
import { ConnectModal } from 'plugins/walletConnectToDapps/components/modals/connect/Connect'
import { useWalletConnectV2 } from 'plugins/walletConnectToDapps/WalletConnectV2Provider'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { isSome } from 'lib/utils'

const widthProp = { base: 'full', md: 'auto' }
const walletConnectIcon = <WalletConnectIcon />
const chevronRightIcon = <ChevronRightIcon />

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
      <Tooltip isDisabled={!buttonProps?.isDisabled} label={translate('common.featureDisabled')}>
        <Button
          leftIcon={walletConnectIcon}
          rightIcon={chevronRightIcon}
          onClick={handleOpen}
          width={widthProp}
          {...buttonProps}
        >
          {hasSessions
            ? translate('plugins.walletConnectToDapps.header.connectAnotherDapp')
            : translate('plugins.walletConnectToDapps.header.connectDapp')}
        </Button>
      </Tooltip>
      <ConnectModal isOpen={isOpen} onClose={handleClose} />
    </>
  )
}
