export const installAutoRecord = (on: any, config: any, fs: any) => {
  const readFile = (filePath: string) => {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }

    return null
  }

  on('task', {
    readFile,
  })
}
