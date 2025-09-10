import { ChevronRightIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, Tooltip, useDisclosure, useMediaQuery } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { WalletConnectIcon } from '@/components/Icons/WalletConnectIcon'
import { isSome } from '@/lib/utils'
import { ConnectModal } from '@/plugins/walletConnectToDapps/components/modals/connect/Connect'
import { useWalletConnectV2 } from '@/plugins/walletConnectToDapps/WalletConnectV2Provider'
import { breakpoints } from '@/theme/theme'

const walletConnectIcon = <WalletConnectIcon />
const chevronRightIcon = <ChevronRightIcon />

export const WalletConnectButtons = (buttonProps?: ButtonProps) => {
  const { isOpen, onClose: handleClose, onOpen: handleOpen } = useDisclosure()
  const translate = useTranslate()
  const { sessionsByTopic } = useWalletConnectV2()
  const [isLargerThanXl] = useMediaQuery(`(min-width: ${breakpoints['xl']})`)

  const hasSessions = useMemo(
    () => Object.values(sessionsByTopic).filter(isSome).length > 0,
    [sessionsByTopic],
  )

  return (
    <>
      <Tooltip isDisabled={!buttonProps?.isDisabled} label={translate('common.featureDisabled')}>
        <Button
          variant='ghost'
          leftIcon={walletConnectIcon}
          rightIcon={isLargerThanXl ? chevronRightIcon : undefined}
          onClick={handleOpen}
          {...buttonProps}
        >
          {isLargerThanXl && (
            <Box overflow='hidden' textOverflow='ellipsis'>
              {hasSessions
                ? translate('plugins.walletConnectToDapps.header.connectAnotherDapp')
                : translate('plugins.walletConnectToDapps.header.connectDapp')}
            </Box>
          )}
        </Button>
      </Tooltip>
      <ConnectModal isOpen={isOpen} onClose={handleClose} />
    </>
  )
}
