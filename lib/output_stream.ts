import { Stream } from 'node:stream'

// deno-lint-ignore no-control-regex
const ANSI_REGEX = /\x1B\[[0-9;]*m/g

export interface OutputStreamOptions {
  color?: boolean
}

export default class OutputStream extends Stream {
  writable = true
  options: OutputStreamOptions

  constructor(options: OutputStreamOptions = {}) {
    super()
    this.options = options
  }

  write(chunk: string, _encoding?: string): boolean {
    if (!this.options.color) {
      chunk = chunk.replace(ANSI_REGEX, '')
    }
    return this.emit('data', chunk)
  }

  puts(chunk: string, encoding?: string): boolean {
    return this.write(chunk + '\n', encoding)
  }

  end(chunk?: string): this {
    if (chunk != null) {
      this.emit('data', chunk)
    }
    this.emit('end')
    return this
  }
}
