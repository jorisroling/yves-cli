import { Stream } from 'stream'

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1B\[[0-9;]*m/g

export default class OutputStream extends Stream {
  constructor(options = {}) {
    super()
    this.writable = true
    this.options = options
  }

  write(chunk, encoding) {
    if (!this.options.color) {
      chunk = chunk.replace(ANSI_REGEX, '')
    }
    return this.emit('data', chunk)
  }

  puts(chunk, encoding) {
    return this.write(chunk + '\n', encoding)
  }

  end(chunk) {
    if (chunk != null) {
      this.emit('data', chunk)
    }
    return this.emit('end')
  }
}
