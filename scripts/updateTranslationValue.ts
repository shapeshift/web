import child from 'child_process'
import fs from 'fs/promises'
import util from 'util'

const exec = util.promisify(child.exec)
const translationsDir = 'src/assets/translations'

export const updateTranslationValue = async (): Promise<void> => {
  const key = process.argv[2]
  const value = process.argv[3]

  const scanDirectories = async (path: string) => {
    const files = await fs.readdir(path)

    for (const file of files) {
      const filePath = `${path}/${file}`
      const isDirectory = (await fs.stat(filePath)).isDirectory()

      if (isDirectory) {
        await scanDirectories(filePath)
      } else if (file.endsWith('.json')) {
        await exec(`jq '.${key} = "${value}"' ${filePath} > tmpfile && mv tmpfile ${filePath}`)
        console.log(`Translation ${filePath} updated successfully!`)
      }
    }
  }

  await scanDirectories(translationsDir)
}

updateTranslationValue()
