import en from './en.json'
import es from './es.json'
import fr from './fr.json'
import id from './id.json'
import ko from './ko.json'
import pt from './pt.json'
import ru from './ru.json'
import zh from './zh.json'

export const descriptions = { en, es, fr, id, ko, pt, ru, zh } as {
  [locale: string]: Record<string, string>
}
