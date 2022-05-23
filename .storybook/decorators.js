import { I18n } from 'react-polyglot'

import { translations } from '../src/assets/translations'

const locale = navigator?.language?.split('-')[0] ?? 'en'
const messages = translations['en']

export const I18nDecorator = (Story) => (
  <I18n locale={locale} messages={messages}>
    <Story />
  </I18n>
)
