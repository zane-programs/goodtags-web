// Runs OpenTofu (or Terraform) against infra/ with the same credentials Wrangler uses.
//   node scripts/infra.mjs plan|apply|destroy|output|… [extra arguments]
//   node scripts/infra.mjs check    # is the deployed hostname serving and edge-caching?
// A root .env, if present, supplies CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
// (and any TF_VAR_* you prefer over infra/terraform.tfvars). Real environment
// variables win over .env, so CI and one-off overrides behave as expected.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const infra = fileURLToPath(new URL('../infra', import.meta.url))
const SCORE = 'https://www.barbershoptags.com/tags/Smile.gif'

function fail(message) {
  console.error(`infra: ${message}`)
  process.exit(1)
}

if (existsSync(`${root}.env`)) process.loadEnvFile(`${root}.env`)
if (!process.env.CLOUDFLARE_API_TOKEN) {
  fail(
    'CLOUDFLARE_API_TOKEN is not set. Export it or put it in .env (see docs/cloudflare-deployment.md).',
  )
}
// One source for the account: tfvars still wins if it sets account_id explicitly.
if (process.env.CLOUDFLARE_ACCOUNT_ID)
  process.env.TF_VAR_account_id ??= process.env.CLOUDFLARE_ACCOUNT_ID

const tool = ['tofu', 'terraform'].find(
  name => spawnSync(name, ['version'], { stdio: 'ignore' }).status === 0,
)
if (!tool) fail('install OpenTofu (https://opentofu.org) or Terraform >= 1.6.')

function run(args, options = {}) {
  const result = spawnSync(tool, [`-chdir=${infra}`, ...args], { stdio: 'inherit', ...options })
  if (result.status !== 0 && !options.allowFailure) process.exit(result.status ?? 1)
  return result
}

async function check() {
  const output = run(['output', '-raw', 'url'], { stdio: ['ignore', 'pipe', 'inherit'] })
  const origin = output.stdout.toString().trim()
  if (!origin.startsWith('https://')) fail('nothing is applied yet. Run `yarn infra:apply` first.')
  const shell = await fetch(origin)
  console.log(`${origin} -> ${shell.status}`)
  const states = []
  for (let attempt = 0; attempt < 2; attempt++) {
    const media = await fetch(`${origin}/media?url=${encodeURIComponent(SCORE)}`)
    await media.arrayBuffer()
    states.push(`${media.status} ${media.headers.get('x-goodtags-cache') ?? 'no cache header'}`)
  }
  console.log(`media bridge -> ${states.join(', then ')}`)
  // Different data centers can answer consecutive requests, so one HIT is the signal.
  if (!shell.ok || !states.some(state => state === '200 HIT')) {
    fail('not healthy yet. A new certificate can take a few minutes; otherwise see `yarn logs`.')
  }
  console.log('ok: serving, and the edge cache is warm.')
}

const [command = 'plan', ...rest] = process.argv.slice(2)
if (!existsSync(`${infra}/.terraform`)) run(['init', '-input=false'])
if (command === 'check') await check()
else run([command, ...rest])
