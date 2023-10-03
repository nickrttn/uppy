#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { stdin, env } from 'node:process'
import { createInterface as readLines } from 'node:readline'
import { fileURLToPath } from 'node:url'

const fromYarn = 'npm_execpath' in env
const exe = fromYarn ? env.npm_execpath : 'corepack'
const argv0 = fromYarn ? [] : ['yarn']

const cwd = fileURLToPath(new URL('../', import.meta.url))

for await (const line of readLines(stdin)) {
  const { location, name } = JSON.parse(line)
  if (existsSync(path.join(cwd, location, 'tsconfig.json'))) {
    const cp1 = spawn(exe, [...argv0, 'tsc', '--build', location, '--clean'], {
      stdio: 'inherit',
      cwd,
    })
    const cp2 = spawn(exe, [...argv0, 'tsc', '--build', location], {
      stdio: 'inherit',
      cwd,
    })
    await Promise.race([
      once(cp1, 'error').then(err => Promise.reject(err)),
      await once(cp1, 'exit')
        .then(([code]) => (code && Promise.reject(new Error(`Non-zero exit code when cleaning "${name}": ${code}`)))),
      once(cp2, 'error').then(err => Promise.reject(err)),
      await once(cp2, 'exit')
        .then(([code]) => (code && Promise.reject(new Error(`Non-zero exit code when building "${name}": ${code}`)))),
    ])
  }
}
