import type { SelectProps } from '@chakra-ui/react'
import { Select } from '@chakra-ui/react'
import React from 'react'
import { locales } from 'assets/translations/constants'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

export const LanguageSelector: React.FC<SelectProps> = props => {
  const dispatch = useAppDispatch()
  const selectedLocale = useAppSelector(selectSelectedLocale)

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLanguage = event.target.value
    getMixPanel()?.track(MixPanelEvents.Click, { element: 'Language Selector', selectedLanguage })
    dispatch(preferences.actions.setSelectedLocale({ locale: selectedLanguage }))
  }

  return (
    <Select onChange={handleLanguageChange} {...props}>
      {locales.map(locale => (
        <option key={locale.key} value={locale.key} selected={locale.key === selectedLocale}>
          {locale.label}
        </option>
      ))}
    </Select>
  )
}
