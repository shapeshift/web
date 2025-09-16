import { Button, Flex, Icon, Stack } from '@chakra-ui/react'
import { FaCheck } from 'react-icons/fa'

import { locales } from '@/assets/translations/constants'
import { getLocaleLabel } from '@/assets/translations/utils'
import { RawText } from '@/components/Text'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const disabledProps = { opacity: 1 }

export const DrawerLanguages = () => {
  const dispatch = useAppDispatch()
  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)
  const otherLocales = locales.filter(l => l.key !== selectedLocale)

  return (
    <Stack width='full' p={0} spacing={2}>
      <Button disabled={true} width='full' justifyContent='flexStart' _disabled={disabledProps}>
        <Flex alignItems='center' textAlign='left'>
          <Icon as={FaCheck} color='blue.500' />
          <RawText ml={4}>{getLocaleLabel(selectedLocale)}</RawText>
        </Flex>
      </Button>
      {otherLocales.map(locale => (
        <Button
          width='full'
          justifyContent='flexStart'
          pl={12}
          key={locale.key}
          variant='ghost'
          data-test={`locale-${locale.key}-button`}
          // we need to pass an arg here, so we need an anonymous function wrapper
          // eslint-disable-next-line react-memo/require-usememo
          onClick={() => {
            dispatch(preferences.actions.setSelectedLocale({ locale: locale.key }))
          }}
        >
          <RawText>{locale.label}</RawText>
        </Button>
      ))}
    </Stack>
  )
}
