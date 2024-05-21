import { Button, CardFooter, Stack } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { WarningAcknowledgement } from 'components/WarningAcknowledgement/WarningAcknowledgement'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddressSelection } from '../AddressSelection'
import { ChangeAddressRoutePaths, type ChangeAddressRouteProps } from './types'

export const ChangeAddressInput: React.FC<ChangeAddressRouteProps> = ({ headerComponent }) => {
  const translate = useTranslate()
  const history = useHistory()
  const asset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const [showWarning, setShowWarning] = useState(false)
  const [newAddress, setNewAddress] = useState<string | null>()

  const hasEnteredAddress = useMemo(() => !!newAddress, [newAddress])

  const handleWarning = useCallback(() => {
    setShowWarning(true)
  }, [])

  const handleSubmit = useCallback(() => {
    history.push(ChangeAddressRoutePaths.Confirm)
  }, [history])

  if (!asset) return null

  return (
    <SlideTransition>
      <WarningAcknowledgement
        message={translate('RFOX.stakeWarning', {
          cooldownPeriod: '28-days',
        })}
        onAcknowledge={handleSubmit}
        shouldShowWarningAcknowledgement={showWarning}
        setShouldShowWarningAcknowledgement={setShowWarning}
      >
        <Stack>
          {headerComponent}
          <AddressSelection />
        </Stack>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={6}
          bg='background.surface.raised.accent'
          borderBottomRadius='xl'
        >
          <Button
            size='lg'
            mx={-2}
            onClick={handleWarning}
            colorScheme='blue'
            isDisabled={!hasEnteredAddress}
          >
            {translate('RFOX.stake')}
          </Button>
        </CardFooter>
      </WarningAcknowledgement>
    </SlideTransition>
  )
}
