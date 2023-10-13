// eslint-disable-next-line simple-import-sort/imports -- keep English import on top
import en from './en.json'
import de from './de.json'
import es from './es.json'
import fr from './fr.json'
import pt from './pt.json'
import ru from './ru.json'
import tr from './tr.json'
import uk from './uk.json'
import zh from './zh.json'

export const descriptions = { en, de, es, fr, pt, ru, tr, uk, zh } as {
  [locale: string]: Record<string, string>
}
