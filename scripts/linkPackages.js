const { readdirSync } = require('fs')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

async function main() {
	// link or unlink
	const args = process.argv.slice(2)
	const prefix = args[0] === 'unlink' ? 'un' : ''
	// get package names
	const lsPackages = readdirSync('packages', { withFileTypes: true })
	const packageDirectories = lsPackages.filter(dir => dir.isDirectory())
	const packageNames = packageDirectories.map(({ name }) => name)
	// do linky things
	const promises = packageNames.map(async package => (await exec(`cd packages/${package} && yarn ${prefix}link --colors`)).stdout)
	const result = (await Promise.all(promises)).join('')
	console.log(result)
}

main()
