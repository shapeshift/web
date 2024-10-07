import { Alert, AlertDescription, Button, CloseButton, Flex, useToast } from '@chakra-ui/react'
import type { ResponsiveValue } from '@chakra-ui/system'
import type { Property } from 'csstype'
import { useEffect, useState } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { IconCircle } from 'components/IconCircle'
import { useArbitrumClaimsByStatus } from 'components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimsByStatus'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { useWallet } from 'hooks/useWallet/useWallet'

const flexGap = { base: 2, md: 3 }
const flexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const flexAlignItems = { base: 'flex-start', md: 'center' }

export const useBridgeClaimNotification = () => {
  const toast = useToast()
  const history = useHistory()
  const translate = useTranslate()
  const [isDisabled, setIsDisabled] = useState(false)

  const {
    state: { deviceId: walletDeviceId },
  } = useWallet()

  const { claimsByStatus, isLoading } = useArbitrumClaimsByStatus({ skip: isDisabled })

  // Re-enable the notification when wallet changes
  useEffect(() => {
    setIsDisabled(false)
  }, [walletDeviceId])

  useEffect(() => {
    if (isLoading || isDisabled) return
    if (claimsByStatus.Available.length === 0) return

    // trigger a toast
    toast({
      render: ({ onClose }) => {
        const handleCtaClick = () => {
          history.push(TradeRoutePaths.Claim)
          onClose()
        }

        return (
          <Alert status='info' variant='update-box' borderRadius='lg' gap={3}>
            <IconCircle boxSize={8} color='text.subtle'>
              <FaInfoCircle />
            </IconCircle>
            <Flex gap={flexGap} flexDir={flexDir} alignItems={flexAlignItems}>
              <AlertDescription letterSpacing='0.02em'>
                {translate('bridge.availableClaimsNotification')}
              </AlertDescription>

              <Button
                colorScheme='blue'
                size='sm'
                // translate and history undefined if this component split out, so cannot properly memoize
                // eslint-disable-next-line react-memo/require-usememo
                onClick={handleCtaClick}
              >
                {translate('bridge.viewClaims')}
              </Button>
            </Flex>
            <CloseButton onClick={onClose} size='sm' />
          </Alert>
        )
      },
      id: 'bridge-claim',
      duration: null,
      isClosable: true,
      position: 'bottom-right',
    })

    // don't spam user
    setIsDisabled(true)
  }, [claimsByStatus.Available.length, history, isDisabled, isLoading, toast, translate])
}
