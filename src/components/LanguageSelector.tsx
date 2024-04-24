import type { SelectProps } from '@chakra-ui/react'
import { Select } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { locales } from 'assets/translations/constants'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

export const LanguageSelector: React.FC<SelectProps> = props => {
  const dispatch = useAppDispatch()
  const selectedLocale = useAppSelector(selectSelectedLocale)

  const handleLanguageChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedLanguage = event.target.value
      getMixPanel()?.track(MixPanelEvent.Click, { element: 'Language Selector', selectedLanguage })
      dispatch(preferences.actions.setSelectedLocale({ locale: selectedLanguage }))
    },
    [dispatch],
  )

  return (
    <Select onChange={handleLanguageChange} value={selectedLocale} {...props}>
      {locales.map(locale => (
        <option key={locale.key} value={locale.key}>
          {locale.label}
        </option>
      ))}
    </Select>
  )
}
