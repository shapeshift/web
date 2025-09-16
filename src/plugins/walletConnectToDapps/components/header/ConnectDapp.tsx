import type { ButtonProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  useBreakpointValue,
  useDisclosure,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { WalletConnectIcon } from '@/components/Icons/WalletConnectIcon'
import { isSome } from '@/lib/utils'
import { ConnectModal } from '@/plugins/walletConnectToDapps/components/modals/connect/Connect'
import { useWalletConnectV2 } from '@/plugins/walletConnectToDapps/WalletConnectV2Provider'

const walletConnectIcon = <WalletConnectIcon />

const normalButtonWidth = { base: 'full', md: 'auto' }

export const WalletConnectButtons = (buttonProps?: ButtonProps) => {
  const { isOpen, onClose: handleClose, onOpen: handleOpen } = useDisclosure()
  const translate = useTranslate()
  const { sessionsByTopic } = useWalletConnectV2()

  const hasSessions = useMemo(
    () => Object.values(sessionsByTopic).filter(isSome).length > 0,
    [sessionsByTopic],
  )

  const FullButton = useMemo(() => {
    return (
      <Button
        variant='ghost'
        leftIcon={walletConnectIcon}
        justifyContent='flex-start'
        flexShrink={0}
        {...buttonProps}
        onClick={handleOpen}
        width={normalButtonWidth}
      >
        <Box overflow='hidden' textOverflow='ellipsis'>
          {hasSessions
            ? translate('plugins.walletConnectToDapps.header.connectAnotherDapp')
            : translate('plugins.walletConnectToDapps.header.connectDapp')}
        </Box>
      </Button>
    )
  }, [handleOpen, buttonProps, hasSessions, translate])

  const SmallButton = useMemo(() => {
    return (
      <IconButton
        variant='ghost'
        icon={walletConnectIcon}
        {...buttonProps}
        aria-label={
          hasSessions
            ? translate('plugins.walletConnectToDapps.header.connectAnotherDapp')
            : translate('plugins.walletConnectToDapps.header.connectDapp')
        }
        onClick={handleOpen}
      />
    )
  }, [hasSessions, translate, handleOpen, buttonProps])

  const walletButton = useBreakpointValue({ base: FullButton, md: SmallButton, xl: FullButton })

  return (
    <>
      <Tooltip isDisabled={!buttonProps?.isDisabled} label={translate('common.featureDisabled')}>
        {walletButton}
      </Tooltip>
      <ConnectModal isOpen={isOpen} onClose={handleClose} />
    </>
  )
}
