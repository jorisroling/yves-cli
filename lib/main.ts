import process from 'node:process'
import yves from 'yves'
import OutputStream from './output_stream.ts'
import _sift from 'sift'
import _jsonic from 'jsonic'

// These npm packages have type exports incompatible with Deno's module resolution
const sift = _sift as unknown as (query: Record<string, unknown>) => (item: unknown) => boolean
const jsonic = _jsonic as unknown as (text: string) => Record<string, unknown>

// deno-lint-ignore no-explicit-any
function defaults(target: any, ...sources: any[]): any {
  for (const source of sources) {
    if (source) {
      for (const key of Object.keys(source)) {
        if (target[key] === undefined) {
          target[key] = source[key]
        }
      }
    }
  }
  return target
}

function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((o: unknown, k: string) => (o as Record<string, unknown>)?.[k], obj)
}

function pick(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter(k => k in obj).map(k => [k, obj[k]]))
}

export interface MainOptions {
  color?: boolean
  pretty?: boolean
  json?: boolean
  root?: string
  fields?: string
  query?: string
  maxLength?: number
  hideFunctions?: boolean
  styles?: Record<string, string>
}

/*
 * Gets input, parses as JSON, and writes output to its stream.
 */
export class Main {
  options: MainOptions
  outputStream: OutputStream
  outputFn: (obj: unknown) => void

  constructor(options: MainOptions = {}) {
    this.options = defaults({} as MainOptions, options, { color: true }, yves.defaults)
    defaults(this.options.styles ?? {}, yves.defaults.styles)
    this.outputStream = new OutputStream({ color: this.options.color })
    this.outputFn = this.getOutputFn()
  }

  getOutputFn(): (obj: unknown) => void {
    return yves.inspector({
      styles: this.options.styles,
      maxLength: this.options.maxLength,
      pretty: this.options.pretty,
      json: this.options.json,
      hideFunctions: this.options.hideFunctions,
      stream: this.outputStream,
    })
  }

  parse(json: string): Record<string, unknown> | undefined {
    if (json.indexOf('{') >= 0) {
      return JSON.parse(json.substring(0, 5) === ")]}'," ? json.substring(5) : json)
    }
  }

  doProcess(object: unknown): void {
    if (this.options.root) {
      object = get(object as Record<string, unknown>, this.options.root)
    }

    if (this.options.query) {
      if (Array.isArray(object)) {
        const expr = JSON.parse(JSON.stringify(jsonic(this.options.query)))
        object = object.filter(sift(expr))
      } else {
        console.error(`Data root is not of type array (but of type ${typeof object}), so query is not possible.` + (this.options.root ? '' : ' Maybe --root can help?'))
        return
      }
    }

    if (this.options.fields) {
      if (Array.isArray(object)) {
        const fields = this.options.fields.split(',')
        object = object.map((item: Record<string, unknown>) => pick(item, fields))
      } else {
        console.error(`Data root is not of type array (but of type ${typeof object}), so fields is not possible.` + (this.options.root ? '' : ' Maybe --root can help?'))
        return
      }
    }

    this.outputFn(object)
  }

  /*
   * Accept input from a list of filenames.
   * Read, parse, and output each in sequence.
   */
  forFiles(filenames: string[]): void {
    filenames.forEach((filename) => {
      const string = Deno.readTextFileSync(filename)
      const object = this.parse(string)
      this.doProcess(object)
    })
  }

  /*
   * Accept input from a stream, then parse and output.
   */
  fromStream(stream: NodeJS.ReadableStream): void {
    stream.on('data', (chunk: string) => {
      this._capture += chunk
    })
    stream.on('end', () => {
      const object = this.parse(this._capture)
      this.doProcess(object)
    })
  }

  private _capture = ''

  /*
   * Called for the command-line.
   */
  command(args: string[]): void {
    this.outputStream.pipe(process.stdout)
    if (args.length > 0) {
      this.forFiles(args)
    } else {
      process.stdin.resume()
      this.fromStream(process.stdin)
    }
  }
}
