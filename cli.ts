#!/usr/bin/env -S deno run --allow-read --allow-env --allow-net=api.github.com --allow-write

import command from './lib/command.ts'

await command()
