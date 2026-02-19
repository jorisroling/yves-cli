import { Main } from './main.mjs'
import CustomError from './custom_error.mjs'
import pc from 'picocolors'
import { program } from 'commander'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

export default function () {
  program
    .version(pkg.version)
    .argument('[files...]', 'JSON files to inspect')
    .option('--no-pretty', 'no pretty formatting')
    .option('--no-color', 'no color')
    .option('-m, --max-length <n>', 'max length', parseInt)
    .option('-r, --root <path>', 'set dot notated root field')
    .option('-f, --fields <fields>', 'comma separated fields')
    .option('-q, --query <expr>', 'query data with expr (ala mongo)')

  program.parse(process.argv)

  const opts = program.opts()
  const options = {
    color: opts.color,
    pretty: opts.pretty,
    root: opts.root,
    fields: opts.fields,
    query: opts.query,
  }
  if (opts.maxLength != null) {
    options.maxLength = opts.maxLength
  }

  try {
    const main = new Main(options)
    main.command(program.args)
  } catch (err) {
    if (err instanceof CustomError) {
      console.error(opts.color ? pc.red(`ERROR: ${err.message}`) : `ERROR: ${err.message}`)
      program.outputHelp()
      process.exit(1)
    } else if (err instanceof SyntaxError) {
      console.error(opts.color ? pc.red('ERROR: Invalid JSON') : 'ERROR: Invalid JSON')
      throw err
    } else {
      throw err
    }
  }
}
