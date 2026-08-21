import { BrowserWindow } from 'electron'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const IDEALAB_KEYCHAIN_SERVICE = 'OpenUsage-idealab'
const IDEALAB_KEYCHAIN_ACCOUNT = 'OpenUsage-idealab'
const IDEALAB_LOGIN_URL =
  'https://login.alibaba-inc.com/ssoLogin.htm?APP_NAME=idea-lab&BACK_URL=https%3A%2F%2Faistudio.alibaba-inc.com%2Findividual%2Fresource%2Fquery'
const LOGIN_COOKIE_SETTLE_MS = 500

let loginPromise: Promise<string> | null = null

async function writeIdealabCookiesToKeychain(cookies: string): Promise<void> {
  await execFileAsync('security', [
    'add-generic-password',
    '-U',
    '-s',
    IDEALAB_KEYCHAIN_SERVICE,
    '-a',
    IDEALAB_KEYCHAIN_ACCOUNT,
    '-w',
    cookies
  ])
}

export async function clearIdealabCookiesFromKeychain(): Promise<void> {
  try {
    await writeIdealabCookiesToKeychain('')
  } catch {
    // Best effort: stale cookies should not block the interactive login path.
  }
}

function getLoginCookieTargetHost(): string {
  const loginUrl = new URL(IDEALAB_LOGIN_URL)
  const backUrl = loginUrl.searchParams.get('BACK_URL') ?? loginUrl.searchParams.get('back_url')
  if (backUrl) {
    try {
      return new URL(backUrl).host
    } catch {
      // Fall through to the login host when the provider changes the URL shape.
    }
  }
  return loginUrl.host
}

function cookieDomainMatchesHost(domain: string, host: string): boolean {
  const normalizedDomain = domain.trim().replace(/^\./, '').toLowerCase()
  const normalizedHost = host.toLowerCase()
  return (
    normalizedDomain === normalizedHost ||
    normalizedHost.endsWith(`.${normalizedDomain}`) ||
    normalizedDomain.includes(normalizedHost)
  )
}

function isTargetHostUrl(url: string, targetHost: string): boolean {
  try {
    const host = new URL(url).host.toLowerCase()
    const normalizedTarget = targetHost.toLowerCase()
    return host === normalizedTarget || host.endsWith(`.${normalizedTarget}`)
  } catch {
    return url.toLowerCase().includes(targetHost.toLowerCase())
  }
}

async function extractCookiesFromLoginWindow(
  window: BrowserWindow,
  targetHost: string
): Promise<string> {
  const cookies = await window.webContents.session.cookies.get({})
  return cookies
    .filter(
      (cookie) =>
        typeof cookie.domain === 'string' && cookieDomainMatchesHost(cookie.domain, targetHost)
    )
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function performIdealabLogin(): Promise<string> {
  if (process.platform !== 'darwin') {
    throw new Error('IdeaLab login is only supported on macOS.')
  }
  if (loginPromise) {
    return loginPromise
  }

  loginPromise = new Promise<string>((resolve, reject) => {
    const targetHost = getLoginCookieTargetHost()
    const loginWindow = new BrowserWindow({
      width: 900,
      height: 700,
      title: 'IdeaLab Login',
      show: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    let settled = false

    const finish = async (): Promise<void> => {
      if (settled) {
        return
      }
      settled = true
      try {
        await wait(LOGIN_COOKIE_SETTLE_MS)
        const cookies = await extractCookiesFromLoginWindow(loginWindow, targetHost)
        if (!cookies) {
          throw new Error('No IdeaLab cookies found after login.')
        }
        await writeIdealabCookiesToKeychain(cookies)
        resolve(cookies)
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      } finally {
        if (!loginWindow.isDestroyed()) {
          loginWindow.close()
        }
      }
    }

    const checkUrl = (url: string): void => {
      if (isTargetHostUrl(url, targetHost)) {
        void finish()
      }
    }

    loginWindow.on('closed', () => {
      if (!settled) {
        settled = true
        reject(new Error('IdeaLab login was cancelled.'))
      }
    })
    loginWindow.webContents.on('did-navigate', (_event, url) => checkUrl(url))
    loginWindow.webContents.on('did-redirect-navigation', (_event, url) => checkUrl(url))
    loginWindow.webContents.on('did-finish-load', () => {
      checkUrl(loginWindow.webContents.getURL())
    })
    void loginWindow.loadURL(IDEALAB_LOGIN_URL).catch((error) => {
      if (!settled) {
        settled = true
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }).finally(() => {
    loginPromise = null
  })

  return loginPromise
}

async function readIdealabCookiesFromKeychain(): Promise<string | null> {
  if (process.platform !== 'darwin') {
    return null
  }
  try {
    const { stdout } = await execFileAsync('security', [
      'find-generic-password',
      '-s',
      IDEALAB_KEYCHAIN_SERVICE,
      '-a',
      IDEALAB_KEYCHAIN_ACCOUNT,
      '-w'
    ])
    return stdout.trim() || null
  } catch (error) {
    const message =
      error && typeof error === 'object'
        ? `${String((error as { stderr?: unknown }).stderr ?? '')} ${String(
            (error as { message?: unknown }).message ?? ''
          )}`.toLowerCase()
        : String(error).toLowerCase()
    if (message.includes('could not be found') || message.includes('not be found')) {
      return null
    }
    throw error
  }
}

export async function getIdealabCookiesOrLogin(): Promise<string | null> {
  let cookies: string | null
  try {
    cookies = await readIdealabCookiesFromKeychain()
  } catch {
    throw new Error('IdeaLab cookies could not be read from the macOS Keychain.')
  }
  return cookies || performIdealabLogin()
}
