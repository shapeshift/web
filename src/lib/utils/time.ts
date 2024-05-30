import { LanguageTypeEnum } from 'constants/LanguageTypeEnum'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { selectSelectedLocale } from 'state/slices/selectors'
import { store } from 'state/store'

dayjs.extend(duration)
dayjs.extend(relativeTime)

export const formatSecondsToDuration = (seconds: number) => {
  const selectedLocale = selectSelectedLocale(store.getState())
  const locale = selectedLocale in LanguageTypeEnum ? selectedLocale : 'en'
  require(`dayjs/locale/${locale}.js`)

  return dayjs.duration(seconds, 'seconds').locale(locale).humanize()
}
