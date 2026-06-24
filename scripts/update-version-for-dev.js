const fs = require('fs')
const path = require('path')

const packageJsonPath = path.resolve(__dirname, '../package.json')

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

pkg.version = `${pkg.version}-dev.${process.env.GITHUB_RUN_NUMBER}`
pkg.productName = `${pkg.productName} (Dev)`

fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2))
