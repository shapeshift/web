import type { SelectProps } from '@chakra-ui/react'
import { Select } from '@chakra-ui/react'
import React from 'react'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { locales } from '../assets/translations/constants'

export const LanguageSelector: React.FC<SelectProps> = props => {
  const dispatch = useAppDispatch()
  const selectedLocale = useAppSelector(selectSelectedLocale)

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLanguage = event.target.value
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
