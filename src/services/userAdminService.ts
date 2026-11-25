import { supabase } from '@/lib/supabase'

export interface AdminResetPasswordPayload {
  target_uid: string
  new_password: string
  revoke_sessions?: boolean
}

export interface AdminResetPasswordResult {
  success: boolean
  message: string
  target_uid: string
  target_email: string
  sessions_revoked: boolean
  revoked_session_count: number
  warning?: string
  updated_at: string
}

const UPPER_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER_CHARS = 'abcdefghjkmnpqrstuvwxyz'
const DIGIT_CHARS = '23456789'
const SYMBOL_CHARS = '@#$%&*!'
const ALL_CHARS = `${UPPER_CHARS}${LOWER_CHARS}${DIGIT_CHARS}${SYMBOL_CHARS}`

function getSecureRandomInt(maxExclusive: number): number {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Browser tidak mendukung generator acak kriptografis (crypto.getRandomValues).')
  }
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive
  const buf = new Uint32Array(1)
  while (true) {
    cryptoApi.getRandomValues(buf)
    if (buf[0] < limit) {
      return buf[0] % maxExclusive
    }
  }
}

/**
 * Generates a strong temporary password using Web Crypto CSPRNG,
 * excluding visually ambiguous characters (0, O, 1, l, I).
 */
export function generateStrongTemporaryPassword(length = 12): string {
  const targetLength = Math.max(8, Math.min(64, Math.floor(length)))
  const chars: string[] = [
    UPPER_CHARS[getSecureRandomInt(UPPER_CHARS.length)],
    LOWER_CHARS[getSecureRandomInt(LOWER_CHARS.length)],
    DIGIT_CHARS[getSecureRandomInt(DIGIT_CHARS.length)],
    SYMBOL_CHARS[getSecureRandomInt(SYMBOL_CHARS.length)],
  ]

  while (chars.length < targetLength) {
    chars.push(ALL_CHARS[getSecureRandomInt(ALL_CHARS.length)])
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1)
    const tmp = chars[i]
    chars[i] = chars[j]
    chars[j] = tmp
  }

  return chars.join('')
}

/**
 * Resets a target user's email/password login credential via Edge Function.
 * Strictly restricted server-side to SUPERUSER (Role ID 8).
 */
export async function adminResetUserPassword(
  payload: AdminResetPasswordPayload
): Promise<AdminResetPasswordResult> {
  const { data, error } = await supabase.functions.invoke('admin-reset-password', {
    body: payload,
  })

  if (error) {
    let detailMessage = ''
    const ctx = (error as { context?: unknown }).context
    if (ctx && typeof (ctx as Response).clone === 'function') {
      try {
        const errBody = (await (ctx as Response).clone().json()) as { error?: string }
        if (errBody?.error) {
          detailMessage = String(errBody.error)
        }
      } catch {
        // Ignore non-JSON error responses
      }
    }
    throw new Error(detailMessage || error.message || 'Gagal mereset kata sandi pengguna.')
  }

  if (data?.error) {
    throw new Error(String(data.error))
  }

  return data as AdminResetPasswordResult
}
