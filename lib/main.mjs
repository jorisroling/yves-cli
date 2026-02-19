import fs from 'fs'
import yves from 'yves'
import OutputStream from './output_stream.mjs'
import sift from 'sift'
import jsonic from 'jsonic'

function defaults(target, ...sources) {
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

function get(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

function pick(obj, keys) {
  return Object.fromEntries(keys.filter(k => k in obj).map(k => [k, obj[k]]))
}

/*
 * Gets input, parses as JSON, and writes output to its stream.
 */
export class Main {
  constructor(options = {}) {
    this.options = defaults({}, options, { color: true }, yves.defaults)
    defaults(this.options.styles, yves.defaults.styles)
    this.outputStream = new OutputStream({ color: this.options.color })
    this.outputFn = this.getOutputFn()
  }

  getOutputFn() {
    return yves.inspector({
      styles: this.options.styles,
      maxLength: this.options.maxLength,
      pretty: this.options.pretty,
      json: this.options.json,
      hideFunctions: this.options.hideFunctions,
      stream: this.outputStream,
    })
  }

  parse(json) {
    if (json.indexOf('{') >= 0) {
      return JSON.parse(json.substr(0, 5) === ")]}'," ? json.substr(5) : json)
    }
  }

  doProcess(object) {
    if (this.options.root) {
      object = get(object, this.options.root)
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
        object = object.map(item => pick(item, fields))
      } else {
        console.error(`Data root is not of type array (but of type ${typeof object}), so fields is not possible.` + (this.options.root ? '' : ' Maybe --root can help?'))
        return
      }
    }

    return this.outputFn(object)
  }

  /*
   * Accept input from a list of filenames.
   * Read, parse, and output each in sequence.
   */
  forFiles(filenames) {
    filenames.forEach((filename) => {
      const buffer = fs.readFileSync(filename)
      const string = buffer.toString()
      const object = this.parse(string)
      return this.doProcess(object)
    })
  }

  /*
   * Accept input from a stream, then parse and output.
   */
  fromStream(stream) {
    let capture = ''
    stream.on('data', (chunk) => {
      capture += chunk
    })
    stream.on('end', () => {
      const object = this.parse(capture)
      return this.doProcess(object)
    })
  }

  /*
   * Called for the command-line.
   */
  command(args) {
    this.outputStream.pipe(process.stdout)
    if (args.length > 0) {
      this.forFiles(args)
    } else {
      process.stdin.resume()
      this.fromStream(process.stdin)
    }
  }
}
