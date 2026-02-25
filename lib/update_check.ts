import { yellow, bold } from '@std/fmt/colors'
import { VERSION } from './version.ts'

const CACHE_DIR = `${Deno.env.get('HOME')}/.cache/yves`
const CACHE_FILE = `${CACHE_DIR}/update-check.json`
const CHECK_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours
const REPO = 'jorisroling/yves-cli'

interface CacheData {
  lastCheck: number
  latestVersion: string | null
}

export function compareVersions(current: string, latest: string): boolean {
  const c = current.split('.').map(Number)
  const l = latest.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((l[i] ?? 0) > (c[i] ?? 0)) return true
    if ((l[i] ?? 0) < (c[i] ?? 0)) return false
  }
  return false
}

function readCache(): CacheData | null {
  try {
    return JSON.parse(Deno.readTextFileSync(CACHE_FILE))
  } catch {
    return null
  }
}

function writeCache(data: CacheData): void {
  try {
    Deno.mkdirSync(CACHE_DIR, { recursive: true })
    Deno.writeTextFileSync(CACHE_FILE, JSON.stringify(data))
  } catch {
    // ignore
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  const resp = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { 'Accept': 'application/vnd.github.v3+json' },
  })
  if (!resp.ok) return null
  const data = await resp.json()
  const tag = data.tag_name as string
  return tag.replace(/^v/, '')
}

function notify(latestVersion: string): void {
  console.error(yellow(`\nA new version of yves is available: ${bold(latestVersion)} (current: ${VERSION})`))
  console.error(yellow(`Update with: deno task install\n`))
}

export async function checkForUpdate(force = false): Promise<void> {
  try {
    const cache = readCache()
    if (!force && cache && Date.now() - cache.lastCheck < CHECK_INTERVAL) {
      if (cache.latestVersion && compareVersions(VERSION, cache.latestVersion)) {
        notify(cache.latestVersion)
      }
      return
    }

    const latestVersion = await fetchLatestVersion()
    writeCache({ lastCheck: Date.now(), latestVersion })

    if (latestVersion && compareVersions(VERSION, latestVersion)) {
      notify(latestVersion)
    }
  } catch {
    // fail silently — offline, rate limited, etc.
  }
}
