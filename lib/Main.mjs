import fs from 'fs'
import _ from 'lodash'
import yves from 'yves'
import OutputStream from './OutputStream.mjs'
import sift from 'sift'
import jsonic from 'jsonic'

/*
 * Gets input, parses as JSON, and writes output to its stream.
 */
export class Main {
  constructor(options = {}) {
    this.options = _.defaults({}, options, { color: true }, yves.defaults)
    _.defaults(this.options.styles, yves.defaults.styles)
    this.outputStream = new OutputStream({ color: this.options.color })
    this.outputFn = this.getOutputFn()
  }

  getOutputFn() {
    return yves.inspector({
      styles: this.options.styles,
      maxLength: this.options.maxLength,
      pretty: this.options.pretty,
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
      object = _.get(object, this.options.root)
    }

    if (this.options.query) {
      if (Array.isArray(object)) {
        const expr = jsonic(this.options.query)
        object = sift(expr, object)
      } else {
        console.error(`Data root is not of type array (but of type ${typeof object}), so query is not possible.` + (this.options.root ? '' : ' Maybe --root can help?'))
        return
      }
    }

    if (this.options.fields) {
      if (Array.isArray(object)) {
        const fields = this.options.fields.split(',')
        object = object.map(_.partialRight(_.pick, fields))
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
