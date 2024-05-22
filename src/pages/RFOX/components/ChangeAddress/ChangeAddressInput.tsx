import { Button, CardFooter, Flex, Stack } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { type FC, useCallback, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import type { AddressSelectionValues } from 'pages/RFOX/types'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddressSelection } from '../AddressSelection'
import { ChangeAddressRoutePaths, type ChangeAddressRouteProps } from './types'

type ChangeAddressInputProps = {
  onNewRuneAddressChange: (address: string | undefined) => void
  newRuneAddress: string | undefined
}

export const ChangeAddressInput: FC<ChangeAddressRouteProps & ChangeAddressInputProps> = ({
  headerComponent,
  onNewRuneAddressChange,
  newRuneAddress,
}) => {
  const translate = useTranslate()
  const history = useHistory()
  const asset = useAppSelector(state => selectAssetById(state, foxAssetId))

  const hasValidNewRuneAddress = useMemo(() => !!newRuneAddress, [newRuneAddress])

  const defaultFormValues = {
    manualRuneAddress: '',
  }

  const methods = useForm<AddressSelectionValues>({
    defaultValues: defaultFormValues,
    mode: 'onChange',
    shouldUnregister: true,
  })

  const {
    formState: { errors },
  } = methods

  const handleSubmit = useCallback(() => {
    if (!hasValidNewRuneAddress) return

    history.push(ChangeAddressRoutePaths.Confirm)
  }, [hasValidNewRuneAddress, history])

  const handleRuneAddressChange = useCallback(
    (address: string | undefined) => {
      onNewRuneAddressChange(address)
    },
    [onNewRuneAddressChange],
  )

  if (!asset) return null

  return (
    <SlideTransition>
      <FormProvider {...methods}>
        <Stack>
          {headerComponent}
          <Stack px={6} py={4}>
            <Flex justifyContent='space-between' mb={2} flexDir={'column'}>
              <Text translation={'RFOX.currentRewardAddress'} fontWeight={'bold'} mb={2} />
              <RawText as={'h4'}>1234</RawText>
            </Flex>
          </Stack>
          <AddressSelection isNewAddress onRuneAddressChange={handleRuneAddressChange} />
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
            onClick={handleSubmit}
            colorScheme={Boolean(errors.manualRuneAddress) ? 'red' : 'blue'}
            isDisabled={!hasValidNewRuneAddress}
          >
            {errors.manualRuneAddress?.message || translate('RFOX.changeAddress')}
          </Button>
        </CardFooter>
      </FormProvider>
    </SlideTransition>
  )
}
