import chalk from 'chalk' // do not upgrade to v5, not compatible with ts-node
import { exec } from 'child_process'
import pify from 'pify'

const main = async () => {
  const args = process.argv.slice(2)
  if (!args.length) {
    console.log(chalk.red('No lib PR number passed as argument. Usage: yarn install-lib-pr-packages <pr_number>'))
    process.exit(0)
  }
  const [libPr] = args
  const diffedFilesCommand = `gh pr diff ${libPr} --name-only -R https://github.com/shapeshift/lib`
  const diffedFiles: string = await pify(exec)(diffedFilesCommand)

  // Open • 0xApotheosis wants to merge 8 commits into main from dynamic-slippage-2 • about 1 day ago • +257 -22 

  const prInfoCommand = `gh pr view ${libPr} -R https://github.com/shapeshift/lib --json headRefName`
  const prInfo = await pify(exec)(prInfoCommand)
  const { headRefName: branchName } = JSON.parse(prInfo.replace(/\n/g, ""))

  const diffedPackages = diffedFiles.split(`\n`).reduce<string[]>((acc, currentFile) => {
    const diffedPackage = currentFile.match(/packages\/(?<package>[a-zA-Z-]*)\//)?.groups?.package
    if (diffedPackage?.length && acc.indexOf(diffedPackage) < 0) { acc.push(diffedPackage) }

    return acc
  }, [])

  for (const diffedPackage of diffedPackages) {
    const command = `yarn add 'https://gitpkg.now.sh/shapeshift/lib/packages/${diffedPackage}?${branchName}'`
    await pify(exec)(command)
    console.log(chalk.green(`Successfully installed @shapeshiftoss/${diffedPackage} from https://github.com/shapeshift/lib/pull/${libPr}`))
  }
}

main()
