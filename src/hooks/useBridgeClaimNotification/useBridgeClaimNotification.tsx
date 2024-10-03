import { Alert, AlertDescription, Button, CloseButton, Flex, useToast } from '@chakra-ui/react'
import type { ResponsiveValue } from '@chakra-ui/system'
import type { Property } from 'csstype'
import { useCallback, useEffect, useState } from 'react'
import { FaSync } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { IconCircle } from 'components/IconCircle'
import { useArbitrumClaimsByStatus } from 'components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from 'pages/RFOX/components/Claim/types'

const flexGap = { base: 2, md: 3 }
const flexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const flexAlignItems = { base: 'flex-start', md: 'center' }

export const useBridgeClaimNotification = () => {
  const toast = useToast()
  const history = useHistory()
  const translate = useTranslate()
  const [isEnabled, setIsEnabled] = useState(true)
  const { claimsByStatus, isLoading } = useArbitrumClaimsByStatus(isEnabled)

  const handleCtaClick = useCallback(() => history.push(ClaimRoutePaths.Select), [history])

  useEffect(() => {
    if (isLoading) return
    if (claimsByStatus.Available.length > 0) {
      // trigger a toast
      toast({
        render: ({ onClose }) => {
          return (
            <Alert status='info' variant='update-box' borderRadius='lg' gap={3}>
              <IconCircle boxSize={8} color='text.subtle'>
                <FaSync />
              </IconCircle>
              <Flex gap={flexGap} flexDir={flexDir} alignItems={flexAlignItems}>
                <AlertDescription letterSpacing='0.02em'>
                  {translate('beard.help.me.out.body.translation')}
                </AlertDescription>

                <Button colorScheme='blue' size='sm' onClick={handleCtaClick}>
                  {translate('beard.help.me.out.cta.translation')}
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
      setIsEnabled(false)
    }
  }, [claimsByStatus.Available.length, handleCtaClick, isLoading, toast, translate])
}
