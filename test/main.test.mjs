import { describe, it, expect, vi } from 'vitest'
import { Main } from '../lib/main.mjs'
import { PassThrough } from 'stream'
import { execSync } from 'child_process'
import fs from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixtures = resolve(__dirname, 'fixtures')
const cli = resolve(__dirname, '..', 'cli.mjs')

// eslint-disable-next-line no-control-regex
const stripAnsi = (str) => str.replace(/\x1B\[[0-9;]*m/g, '')

function collect(main) {
  let output = ''
  main.outputStream.on('data', (chunk) => {
    output += chunk
  })
  return () => output
}

describe('parse', () => {
  it('parses valid JSON', () => {
    const main = new Main({ color: false })
    expect(main.parse('{"a": 1}')).toEqual({ a: 1 })
  })

  it('strips XSSI prefix', () => {
    const main = new Main({ color: false })
    expect(main.parse(')]}\',{"a": 1}')).toEqual({ a: 1 })
  })

  it('returns undefined for non-object JSON', () => {
    const main = new Main({ color: false })
    expect(main.parse('hello world')).toBeUndefined()
  })
})

describe('file reading', () => {
  it('reads and outputs a JSON file', () => {
    const main = new Main({ color: false, pretty: true })
    const getOutput = collect(main)
    main.forFiles([resolve(fixtures, 'a.json')])
    expect(stripAnsi(getOutput())).toContain('a: 1')
  })

  it('reads multiple files', () => {
    const main = new Main({ color: false, pretty: true })
    const getOutput = collect(main)
    main.forFiles([resolve(fixtures, 'a.json'), resolve(fixtures, 'a.json')])
    const output = stripAnsi(getOutput())
    expect(output.split('a: 1').length - 1).toBe(2)
  })
})

describe('stream reading', () => {
  it('reads JSON from a stream', async () => {
    const main = new Main({ color: false, pretty: true })
    const getOutput = collect(main)

    const stream = new PassThrough()
    main.fromStream(stream)
    stream.end('{"a": 9}')

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(stripAnsi(getOutput())).toContain('a: 9')
  })
})

describe('--root option', () => {
  it('navigates to a nested field', () => {
    const main = new Main({ color: false, pretty: true, root: 'foo.bar' })
    const getOutput = collect(main)
    main.doProcess({ foo: { bar: { baz: 42 } } })
    expect(stripAnsi(getOutput())).toContain('baz: 42')
  })

  it('navigates into a wrapped response', () => {
    const data = JSON.parse(fs.readFileSync(resolve(fixtures, 'b.json'), 'utf-8'))
    const main = new Main({ color: false, pretty: true, root: 'results', fields: 'id' })
    const getOutput = collect(main)
    main.doProcess(data)
    const output = stripAnsi(getOutput())
    expect(output).toContain('id: 199356')
  })
})

describe('--query option', () => {
  it('filters array by exact match', () => {
    const data = JSON.parse(fs.readFileSync(resolve(fixtures, 'c.json'), 'utf-8'))
    const main = new Main({ color: false, pretty: true, query: '{"id": 199356}' })
    const getOutput = collect(main)
    main.doProcess(data)
    const output = stripAnsi(getOutput())
    expect(output).toContain('199356')
    expect(output).not.toContain('199368')
  })

  it('accepts jsonic relaxed syntax (unquoted keys, no braces)', () => {
    const data = JSON.parse(fs.readFileSync(resolve(fixtures, 'c.json'), 'utf-8'))
    const main = new Main({ color: false, pretty: true, query: 'id:199356' })
    const getOutput = collect(main)
    main.doProcess(data)
    const output = stripAnsi(getOutput())
    expect(output).toContain('199356')
    expect(output).not.toContain('199368')
  })

  it('accepts jsonic single-quoted string values', () => {
    const data = JSON.parse(fs.readFileSync(resolve(fixtures, 'c.json'), 'utf-8'))
    const main = new Main({ color: false, pretty: true, query: "author:'Piet Pieterse'" })
    const getOutput = collect(main)
    main.doProcess(data)
    const output = stripAnsi(getOutput())
    expect(output).toContain('Piet Pieterse')
    expect(output).toContain('199356')
    expect(output).not.toContain('199368')
  })

  it('accepts jsonic multiple key-value pairs', () => {
    const data = JSON.parse(fs.readFileSync(resolve(fixtures, 'c.json'), 'utf-8'))
    const main = new Main({ color: false, pretty: true, query: "status:published,premium:false,id:199356" })
    const getOutput = collect(main)
    main.doProcess(data)
    const output = stripAnsi(getOutput())
    expect(output).toContain('199356')
    expect(output).not.toContain('199368')
  })

  it('accepts jsonic nested object syntax', () => {
    const data = JSON.parse(fs.readFileSync(resolve(fixtures, 'c.json'), 'utf-8'))
    const main = new Main({ color: false, pretty: true, query: "properties:{kiosk_type:Article},id:172106" })
    const getOutput = collect(main)
    main.doProcess(data)
    const output = stripAnsi(getOutput())
    expect(output).toContain('172106')
    expect(output).not.toContain('199356')
  })

  it('filters with $in operator', () => {
    const data = JSON.parse(fs.readFileSync(resolve(fixtures, 'c.json'), 'utf-8'))
    const main = new Main({ color: false, pretty: true, query: 'id:{$in:[199356,199368]}' })
    const getOutput = collect(main)
    main.doProcess(data)
    const output = stripAnsi(getOutput())
    expect(output).toContain('199356')
    expect(output).toContain('199368')
    expect(output).not.toContain('199365')
  })

  it('errors when data is not an array', () => {
    const main = new Main({ color: false, query: '{"id": 1}' })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    main.doProcess({ id: 1 })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('not of type array'))
    spy.mockRestore()
  })
})

describe('--fields option', () => {
  it('picks specified fields from array items', () => {
    const main = new Main({ color: false, pretty: true, fields: 'id,title' })
    const getOutput = collect(main)
    main.doProcess([
      { id: 1, title: 'a', extra: 'x' },
      { id: 2, title: 'b', extra: 'y' },
    ])
    const output = stripAnsi(getOutput())
    expect(output).toContain('id: 1')
    expect(output).toContain("title: 'a'")
    expect(output).not.toContain('extra')
  })

  it('errors when data is not an array', () => {
    const main = new Main({ color: false, fields: 'id' })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    main.doProcess({ id: 1 })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('not of type array'))
    spy.mockRestore()
  })
})

describe('color output', () => {
  it('strips ANSI codes when color is disabled', () => {
    const main = new Main({ color: false, pretty: true })
    const getOutput = collect(main)
    main.doProcess({ hello: 'world' })
    expect(getOutput()).not.toMatch(/\x1B\[/)
  })

  it('does not strip output when color is enabled', () => {
    const main = new Main({ color: true, pretty: true })
    const getOutput = collect(main)
    main.doProcess({ hello: 'world' })
    expect(getOutput()).toContain("hello: 'world'")
  })
})

describe('CLI integration', () => {
  it('reads a file', () => {
    const output = execSync(`node ${cli} ${resolve(fixtures, 'a.json')}`, { encoding: 'utf-8' })
    expect(output).toContain('"a": 1')
  })

  it('reads from stdin', () => {
    const output = execSync(`echo '{"a":9}' | node ${cli}`, { encoding: 'utf-8' })
    expect(output).toContain('"a": 9')
  })

  it('supports --no-json for yves-style output', () => {
    const output = execSync(`echo '{"a":1}' | node ${cli} --no-json`, { encoding: 'utf-8' })
    expect(output).toContain('a: 1')
    expect(output).not.toContain('"a"')
  })

  it('outputs correct version', () => {
    const output = execSync(`node ${cli} --version`, { encoding: 'utf-8' })
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('supports --query flag', () => {
    const output = execSync(`node ${cli} --query '{"id": 199356}' < ${resolve(fixtures, 'c.json')}`, {
      encoding: 'utf-8',
      shell: '/bin/bash',
    })
    expect(output).toContain('199356')
    expect(output).not.toContain('199368')
  })
})
