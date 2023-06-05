import child from 'child_process'
import fs from 'fs/promises'
import util from 'util'

const exec = util.promisify(child.exec)
const translationsDir = 'src/assets/translations'

export const updateTranslationPath = async (): Promise<void> => {
  const previousPath = process.argv[2]
  const newPath = process.argv[3]

  const splitPreviousPath = previousPath.split('.')
  const splitNewPath = newPath.split('.')

  const oldKey = splitPreviousPath.pop()
  const newKey = splitNewPath.pop()

  // This isn't intended for top-level renames, which realistically will never happen
  if (!oldKey || !newKey) return

  const scanDirectories = async (path: string) => {
    const files = await fs.readdir(path)

    for (const file of files) {
      const filePath = `${path}/${file}`
      const isDirectory = (await fs.stat(filePath)).isDirectory()

      if (isDirectory) {
        await scanDirectories(filePath)
      } else if (file.endsWith('.json')) {
        await exec(
          `jq '.${splitPreviousPath.join(
            '.',
          )} |= with_entries(if .key == "${oldKey}" then .key = "${newKey}" else . end)' ${filePath} > tmpfile && mv tmpfile ${filePath}`,
        ).catch(() => {
          exec('rm tmpfile')
          console.log(`Failed renaming key for ${filePath}`)
        })
      }
    }
  }

  await scanDirectories(translationsDir)
}

updateTranslationPath()
