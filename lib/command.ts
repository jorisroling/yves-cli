import { Command } from '@cliffy/command'
import { red } from '@std/fmt/colors'
import { Main, type MainOptions } from './main.ts'
import CustomError from './custom_error.ts'
import { VERSION } from './version.ts'

export default async function () {
  await new Command()
    .name('yves')
    .version(VERSION)
    .arguments('[files...:string]')
    .option('--no-pretty', 'no pretty formatting')
    .option('--no-color', 'no color')
    .option('-m, --max-length <n:number>', 'max length')
    .option('-r, --root <path:string>', 'set dot notated root field')
    .option('-f, --fields <fields:string>', 'comma separated fields')
    .option('-q, --query <expr:string>', 'query data with expr (ala mongo)')
    .option('--no-json', 'disable JSON output')
    .option('--js', 'disable JSON output (alias for --no-json)')
    .action((opts, ...files: string[]) => {
      const options: MainOptions = {
        color: opts.color,
        pretty: opts.pretty,
        json: opts.js ? false : opts.json,
        root: opts.root,
        fields: opts.fields,
        query: opts.query,
      }
      if (opts.maxLength != null) {
        options.maxLength = opts.maxLength
      }

      try {
        const main = new Main(options)
        main.command(files)
      } catch (err) {
        if (err instanceof CustomError) {
          console.error(opts.color ? red(`ERROR: ${err.message}`) : `ERROR: ${err.message}`)
          Deno.exit(1)
        } else if (err instanceof SyntaxError) {
          console.error(opts.color ? red('ERROR: Invalid JSON') : 'ERROR: Invalid JSON')
          throw err
        } else {
          throw err
        }
      }
    })
    .parse(Deno.args)
}
