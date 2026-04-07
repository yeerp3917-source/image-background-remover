/**
 * 用户积分/配额管理
 *
 * 存储策略（按环境）：
 *   - Cloudflare Workers：使用 KV binding（CREDITS_KV）
 *   - 本地开发（Node.js）：回退到内存 Map（重启后丢失，仅用于 dev）
 *
 * KV key 格式：
 *   credits:<userId>  → JSON { credits: number, dailyUsed: number, lastResetDate: string }
 */

export interface UserCredits {
  credits: number       // 购买的点数
  dailyUsed: number     // 今日已用免费次数
  lastResetDate: string // 最近一次重置日期 YYYY-MM-DD
}

const FREE_DAILY_LIMIT = 3 // 免费用户每天 3 次

// 本地 dev 内存回退
const memStore = new Map<string, UserCredits>()

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getKV(): any {
  // @ts-expect-error Cloudflare Workers global
  return typeof CREDITS_KV !== 'undefined' ? CREDITS_KV : null
}

async function getCredits(userId: string): Promise<UserCredits> {
  const kv = getKV()
  const key = `credits:${userId}`

  if (kv) {
    const raw = await kv.get(key, 'text')
    if (raw) return JSON.parse(raw) as UserCredits
  } else {
    const cached = memStore.get(key)
    if (cached) return cached
  }

  return { credits: 0, dailyUsed: 0, lastResetDate: todayString() }
}

async function saveCredits(userId: string, data: UserCredits): Promise<void> {
  const kv = getKV()
  const key = `credits:${userId}`

  if (kv) {
    await kv.put(key, JSON.stringify(data))
  } else {
    memStore.set(key, data)
  }
}

/** 查询用户配额状态 */
export async function getUserQuota(userId: string) {
  let data = await getCredits(userId)

  // 每日免费次数重置
  const today = todayString()
  if (data.lastResetDate !== today) {
    data = { ...data, dailyUsed: 0, lastResetDate: today }
    await saveCredits(userId, data)
  }

  const freeLeft = Math.max(0, FREE_DAILY_LIMIT - data.dailyUsed)
  return {
    credits: data.credits,
    dailyUsed: data.dailyUsed,
    dailyLimit: FREE_DAILY_LIMIT,
    freeLeft,
    canProcess: freeLeft > 0 || data.credits > 0,
  }
}

/** 消耗一次使用（先用免费次数，再扣点数） */
export async function consumeOne(userId: string): Promise<{ ok: boolean; message?: string }> {
  let data = await getCredits(userId)
  const today = todayString()

  if (data.lastResetDate !== today) {
    data = { ...data, dailyUsed: 0, lastResetDate: today }
  }

  const freeLeft = FREE_DAILY_LIMIT - data.dailyUsed

  if (freeLeft > 0) {
    data.dailyUsed += 1
    await saveCredits(userId, data)
    return { ok: true }
  }

  if (data.credits > 0) {
    data.credits -= 1
    await saveCredits(userId, data)
    return { ok: true }
  }

  return { ok: false, message: '今日免费次数已用完，请购买点数继续使用' }
}

/** 充值点数（支付成功后调用） */
export async function addCredits(userId: string, amount: number): Promise<void> {
  const data = await getCredits(userId)
  data.credits += amount
  await saveCredits(userId, data)
}
