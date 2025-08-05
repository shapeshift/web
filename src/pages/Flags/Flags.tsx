import type { StackDirection } from '@chakra-ui/react'
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Heading,
  HStack,
  Stack,
  StackDivider,
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { Debugging } from './Debugging'
import { FlagRow } from './FlagRow'

import { Main } from '@/components/Layout/Main'
import { RawText } from '@/components/Text'
import { useLongPress } from '@/hooks/useLongPress'
import { slices } from '@/state/reducer'
import type { FeatureFlags } from '@/state/slices/preferencesSlice/preferencesSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import type { AppDispatch } from '@/state/store'
import { clearState, useAppSelector } from '@/state/store'

const FlagHeader = () => {
  return (
    <Stack px={8} py={4}>
      <Heading>Flags</Heading>
      <RawText color='red.500' fontStyle='italic'>
        These features are <strong>experimental</strong> and in <strong>active development</strong>.
        <br />
        They may be incomplete and/or non-functional.
        <br />
        <strong>You may irreversibly lose funds - we cannot help you.</strong>
        <br />
        Use at your own risk!
      </RawText>
    </Stack>
  )
}

const flagHeader = <FlagHeader />
const stackDirection: StackDirection = { base: 'column', md: 'row' }

const stackDivider = <StackDivider />

export const Flags = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const featureFlags = useAppSelector(preferences.selectors.selectFeatureFlags)
  const [error, setError] = useState<string | null>(null)
  const [boxColor, setBoxColor] = useState('blue')

  const longPressProps = useLongPress({
    onLongPress: () => {
      setBoxColor('red')
      // Could trigger haptic feedback here
    },
    onPress: () => {
      setBoxColor('green')
    },
    delay: 600,
    threshold: 15,
    enableStyles: true, // Default is true
  })

  const handleApply = useCallback(() => {
    try {
      // Delete persisted state
      clearState()
      setError(null)
      navigate('/')
    } catch (e) {
      console.error(e)
      setError(String((e as Error)?.message))
    }
  }, [navigate])

  const handleResetPreferences = useCallback(() => {
    try {
      dispatch(slices.preferences.actions.clearFeatureFlags())
      setError(null)
    } catch (e) {
      console.error(e)
      setError(String((e as Error)?.message))
    }
  }, [dispatch])

  return (
    <Main headerComponent={flagHeader}>
      <Stack direction={stackDirection} spacing={6}>
        <Card flex={1}>
          <CardHeader>
            <RawText color='text.subtle'>
              Turn on and off flags by toggling the switch then press "Apply" to reset the
              application.
            </RawText>
          </CardHeader>
          <CardBody>
            <Stack divider={stackDivider}>
              {Object.keys(featureFlags).map((flag, idx) => (
                <FlagRow key={idx} flag={flag as keyof FeatureFlags} />
              ))}
            </Stack>
          </CardBody>
          <CardFooter>
            <HStack my={4} width='full'>
              <Button onClick={handleApply} colorScheme='blue'>
                Apply
              </Button>
              <Button onClick={handleResetPreferences}>Reset Flags to Default</Button>
              <Box
                {...longPressProps}
                bg={boxColor}
                p={6}
                borderRadius='md'
                textAlign='center'
                color='black'
              >
                Press and hold me
              </Box>
            </HStack>
          </CardFooter>
        </Card>
        <Debugging />
      </Stack>
      {error && (
        <Alert status='error'>
          <AlertIcon />
          <RawText>{error}</RawText>
        </Alert>
      )}
    </Main>
  )
}
