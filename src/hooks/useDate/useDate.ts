import dayjs from 'dayjs'
import { useEffect } from 'react'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export function useDate() {
  const selectedLocale = useAppSelector(selectSelectedLocale)

  useEffect(() => {
    require(`dayjs/locale/${selectedLocale}.js`)
    const localizedFormat = require('dayjs/plugin/localizedFormat')
    dayjs.extend(localizedFormat)
  }, [selectedLocale])

  const displayDate = (value: number | Date | string, format: string) => {
    return dayjs(value).locale(selectedLocale).format(format)
  }

  return displayDate
}
