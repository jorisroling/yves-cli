#!/usr/bin/env node

import command from './lib/command.mjs'

const jj = async () => {
  const xx = await command()
  xx();
}

jj()
