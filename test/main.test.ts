import { assertEquals, assertStringIncludes, assert, assertMatch } from '@std/assert'
import { Main } from '../lib/main.ts'
import { PassThrough } from 'node:stream'

const fixtures = new URL('./fixtures/', import.meta.url).pathname
const cli = new URL('../cli.ts', import.meta.url).pathname

// deno-lint-ignore no-control-regex
const stripAnsi = (str: string): string => str.replace(/\x1B\[[0-9;]*m/g, '')

function collect(main: Main): () => string {
  let output = ''
  main.outputStream.on('data', (chunk: string) => {
    output += chunk
  })
  return () => output
}

function run(...args: string[]): string {
  const cmd = new Deno.Command('deno', {
    args: ['run', '--allow-read', '--allow-env', cli, ...args],
    stdout: 'piped',
    stderr: 'piped',
  })
  const { stdout } = cmd.outputSync()
  return new TextDecoder().decode(stdout)
}

async function runWithStdin(input: string, ...args: string[]): Promise<string> {
  const cmd = new Deno.Command('deno', {
    args: ['run', '--allow-read', '--allow-env', cli, ...args],
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'piped',
  })
  const child = cmd.spawn()
  const writer = child.stdin.getWriter()
  writer.write(new TextEncoder().encode(input))
  writer.close()
  const { stdout } = await child.output()
  return new TextDecoder().decode(stdout)
}

// --- parse ---

Deno.test('parse - parses valid JSON', () => {
  const main = new Main({ color: false })
  assertEquals(main.parse('{"a": 1}'), { a: 1 })
})

Deno.test('parse - strips XSSI prefix', () => {
  const main = new Main({ color: false })
  assertEquals(main.parse(')]}\',{"a": 1}'), { a: 1 })
})

Deno.test('parse - returns undefined for non-object JSON', () => {
  const main = new Main({ color: false })
  assertEquals(main.parse('hello world'), undefined)
})

// --- file reading ---

Deno.test('file reading - reads and outputs a JSON file', () => {
  const main = new Main({ color: false, pretty: true })
  const getOutput = collect(main)
  main.forFiles([fixtures + 'a.json'])
  assertStringIncludes(stripAnsi(getOutput()), 'a: 1')
})

Deno.test('file reading - reads multiple files', () => {
  const main = new Main({ color: false, pretty: true })
  const getOutput = collect(main)
  main.forFiles([fixtures + 'a.json', fixtures + 'a.json'])
  const output = stripAnsi(getOutput())
  assertEquals(output.split('a: 1').length - 1, 2)
})

// --- stream reading ---

Deno.test('stream reading - reads JSON from a stream', async () => {
  const main = new Main({ color: false, pretty: true })
  const getOutput = collect(main)

  const stream = new PassThrough()
  main.fromStream(stream)
  stream.end('{"a": 9}')

  await new Promise((resolve) => setTimeout(resolve, 50))
  assertStringIncludes(stripAnsi(getOutput()), 'a: 9')
})

// --- --root option ---

Deno.test('--root - navigates to a nested field', () => {
  const main = new Main({ color: false, pretty: true, root: 'foo.bar' })
  const getOutput = collect(main)
  main.doProcess({ foo: { bar: { baz: 42 } } })
  assertStringIncludes(stripAnsi(getOutput()), 'baz: 42')
})

Deno.test('--root - navigates into a wrapped response', () => {
  const data = JSON.parse(Deno.readTextFileSync(fixtures + 'b.json'))
  const main = new Main({ color: false, pretty: true, root: 'results', fields: 'id' })
  const getOutput = collect(main)
  main.doProcess(data)
  assertStringIncludes(stripAnsi(getOutput()), 'id: 199356')
})

// --- --query option ---

Deno.test('--query - filters array by exact match', () => {
  const data = JSON.parse(Deno.readTextFileSync(fixtures + 'c.json'))
  const main = new Main({ color: false, pretty: true, query: '{"id": 199356}' })
  const getOutput = collect(main)
  main.doProcess(data)
  const output = stripAnsi(getOutput())
  assertStringIncludes(output, '199356')
  assert(!output.includes('199368'))
})

Deno.test('--query - accepts jsonic relaxed syntax (unquoted keys, no braces)', () => {
  const data = JSON.parse(Deno.readTextFileSync(fixtures + 'c.json'))
  const main = new Main({ color: false, pretty: true, query: 'id:199356' })
  const getOutput = collect(main)
  main.doProcess(data)
  const output = stripAnsi(getOutput())
  assertStringIncludes(output, '199356')
  assert(!output.includes('199368'))
})

Deno.test('--query - accepts jsonic single-quoted string values', () => {
  const data = JSON.parse(Deno.readTextFileSync(fixtures + 'c.json'))
  const main = new Main({ color: false, pretty: true, query: "author:'Piet Pieterse'" })
  const getOutput = collect(main)
  main.doProcess(data)
  const output = stripAnsi(getOutput())
  assertStringIncludes(output, 'Piet Pieterse')
  assertStringIncludes(output, '199356')
  assert(!output.includes('199368'))
})

Deno.test('--query - accepts jsonic multiple key-value pairs', () => {
  const data = JSON.parse(Deno.readTextFileSync(fixtures + 'c.json'))
  const main = new Main({ color: false, pretty: true, query: 'status:published,premium:false,id:199356' })
  const getOutput = collect(main)
  main.doProcess(data)
  const output = stripAnsi(getOutput())
  assertStringIncludes(output, '199356')
  assert(!output.includes('199368'))
})

Deno.test('--query - accepts jsonic nested object syntax', () => {
  const data = JSON.parse(Deno.readTextFileSync(fixtures + 'c.json'))
  const main = new Main({ color: false, pretty: true, query: 'properties:{kiosk_type:Article},id:172106' })
  const getOutput = collect(main)
  main.doProcess(data)
  const output = stripAnsi(getOutput())
  assertStringIncludes(output, '172106')
  assert(!output.includes('199356'))
})

Deno.test('--query - filters with $in operator', () => {
  const data = JSON.parse(Deno.readTextFileSync(fixtures + 'c.json'))
  const main = new Main({ color: false, pretty: true, query: 'id:{$in:[199356,199368]}' })
  const getOutput = collect(main)
  main.doProcess(data)
  const output = stripAnsi(getOutput())
  assertStringIncludes(output, '199356')
  assertStringIncludes(output, '199368')
  assert(!output.includes('199365'))
})

Deno.test('--query - errors when data is not an array', () => {
  const main = new Main({ color: false, query: '{"id": 1}' })
  const messages: string[] = []
  const originalError = console.error
  console.error = (...args: unknown[]) => messages.push(args.join(' '))
  main.doProcess({ id: 1 })
  console.error = originalError
  assert(messages.some(m => m.includes('not of type array')))
})

// --- --fields option ---

Deno.test('--fields - picks specified fields from array items', () => {
  const main = new Main({ color: false, pretty: true, fields: 'id,title' })
  const getOutput = collect(main)
  main.doProcess([
    { id: 1, title: 'a', extra: 'x' },
    { id: 2, title: 'b', extra: 'y' },
  ])
  const output = stripAnsi(getOutput())
  assertStringIncludes(output, 'id: 1')
  assertStringIncludes(output, "title: 'a'")
  assert(!output.includes('extra'))
})

Deno.test('--fields - errors when data is not an array', () => {
  const main = new Main({ color: false, fields: 'id' })
  const messages: string[] = []
  const originalError = console.error
  console.error = (...args: unknown[]) => messages.push(args.join(' '))
  main.doProcess({ id: 1 })
  console.error = originalError
  assert(messages.some(m => m.includes('not of type array')))
})

// --- color output ---

Deno.test('color - strips ANSI codes when color is disabled', () => {
  const main = new Main({ color: false, pretty: true })
  const getOutput = collect(main)
  main.doProcess({ hello: 'world' })
  // deno-lint-ignore no-control-regex
  assert(!/\x1B\[/.test(getOutput()))
})

Deno.test('color - does not strip output when color is enabled', () => {
  const main = new Main({ color: true, pretty: true })
  const getOutput = collect(main)
  main.doProcess({ hello: 'world' })
  assertStringIncludes(getOutput(), "hello: 'world'")
})

// --- CLI integration ---

Deno.test('CLI - reads a file', () => {
  const output = run(fixtures + 'a.json')
  assertStringIncludes(output, '"a": 1')
})

Deno.test('CLI - reads from stdin', async () => {
  const output = await runWithStdin('{"a":9}')
  assertStringIncludes(output, '"a": 9')
})

Deno.test('CLI - supports --no-json for yves-style output', async () => {
  const output = await runWithStdin('{"a":1}', '--no-json')
  assertStringIncludes(output, 'a: 1')
  assert(!output.includes('"a"'))
})

Deno.test('CLI - outputs correct version', () => {
  const output = stripAnsi(run('--version'))
  assertMatch(output.trim(), /\d+\.\d+\.\d+/)
})

Deno.test('CLI - supports --query flag', () => {
  const output = run('--query', '{"id": 199356}', fixtures + 'c.json')
  assertStringIncludes(output, '199356')
  assert(!output.includes('199368'))
})
