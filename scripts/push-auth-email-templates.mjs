#!/usr/bin/env node
/**
 * Push Lance auth email HTML to Supabase (Management API).
 *
 * Requires:
 *   SUPABASE_ACCESS_TOKEN — https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF — defaults to mtgocbkjrfpffzjkhmox
 *
 * Usage:
 *   node scripts/push-auth-email-templates.mjs
 *   node scripts/push-auth-email-templates.mjs --dry-run
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const docs = join(root, 'docs');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'mtgocbkjrfpffzjkhmox';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const dryRun = process.argv.includes('--dry-run');

function loadHtml(filename) {
  const raw = readFileSync(join(docs, filename), 'utf8');
  return raw.replace(/<!--[\s\S]*?-->/g, '').trim();
}

const templates = {
  mailer_subjects_confirmation: 'Confirm your email for Lance',
  mailer_templates_confirmation_content: loadHtml('EMAIL_TEMPLATE_CONFIRM_SIGNUP_FULL.html'),
  mailer_subjects_magic_link: 'Your Lance sign-in link',
  mailer_templates_magic_link_content: loadHtml('EMAIL_TEMPLATE_MAGIC_LINK_FULL.html'),
  mailer_subjects_recovery: 'Reset your Lance password',
  mailer_templates_recovery_content: loadHtml('EMAIL_TEMPLATE_RECOVERY_FULL.html'),
};

async function main() {
  if (dryRun) {
    console.log('Dry run — would PATCH auth config with keys:', Object.keys(templates).join(', '));
    console.log('Confirm signup HTML length:', templates.mailer_templates_confirmation_content.length);
    console.log('Logo src present:', templates.mailer_templates_confirmation_content.includes('lance-logo-white.png'));
    return;
  }

  if (!ACCESS_TOKEN) {
    console.error(
      'Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens\n' +
        'Then run:\n  SUPABASE_ACCESS_TOKEN=... npm run push:auth-email-templates'
    );
    process.exit(1);
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(templates),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error('Failed to update auth email templates:', res.status, body);
    process.exit(1);
  }

  console.log('Updated Supabase auth email templates (confirm signup, magic link, reset password).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
