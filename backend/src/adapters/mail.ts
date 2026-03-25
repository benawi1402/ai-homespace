import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { config } from '../config';
import { cache } from '../cache';
import type { MailData, MailMessage } from '../types';

const CACHE_KEY = 'mail';

type MailAccountConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
  mailbox: string;
  name: string;
  cacheTtl: number;
};

function detectProvider(host: string, user: string): string {
  const h = host.toLowerCase();
  const u = user.toLowerCase();
  if (h.includes('gmail') || h.includes('google') || u.endsWith('@gmail.com') || u.endsWith('@googlemail.com')) return 'gmail';
  if (h.includes('posteo') || u.endsWith('@posteo.de') || u.endsWith('@posteo.net') || u.endsWith('@posteo.eu')) return 'posteo';
  return 'generic';
}

function accountDisplayName(cfg: MailAccountConfig, provider: string): string {
  if (cfg.name) return cfg.name;
  if (provider === 'gmail') return 'Gmail';
  if (provider === 'posteo') return 'Posteo';
  const at = cfg.user.indexOf('@');
  return at > 0 ? cfg.user.slice(0, at) : cfg.user;
}

async function fetchMailForAccount(
  cfg: MailAccountConfig,
): Promise<{ messages: MailMessage[]; unreadCount: number; name: string; provider: string }> {
  const provider = detectProvider(cfg.host, cfg.user);
  const name = accountDisplayName(cfg, provider);

  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.tls,
    auth: { user: cfg.user, pass: cfg.password },
    logger: false,
  });

  try {
    await client.connect();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Invalid credentials') || msg.includes('AUTHENTICATIONFAILED')) {
      throw new Error(
        `Gmail authentication failed for ${cfg.user}. ` +
        'Make sure IMAP is enabled in Gmail settings and the password is a ' +
        '16-character App Password (https://myaccount.google.com/apppasswords), ' +
        'not your regular Google account password.',
      );
    }
    throw err;
  }

  const messages: MailMessage[] = [];
  let unreadCount = 0;

  const lock = await client.getMailboxLock(cfg.mailbox);
  try {
    const status = await client.status(cfg.mailbox, { messages: true, unseen: true });
    unreadCount = status.unseen ?? 0;
    const total = status.messages ?? 0;

    const rangeStart = Math.max(1, total - 9);
    const range = `${rangeStart}:*`;

    for await (const msg of client.fetch(range, {
      envelope: true,
      flags: true,
      source: true,
    })) {
      const read = msg.flags?.has('\\Seen') ?? false;
      let bodyText = '';
      let htmlBody: string | undefined;
      if (msg.source) {
        try {
          const parsed = await simpleParser(msg.source);
          bodyText = (parsed.text ?? '').replace(/\r\n/g, '\n').trim().slice(0, 500);

          if (parsed.html) {
            let html = parsed.html;
            for (const att of parsed.attachments) {
              if (att.contentId && att.content) {
                const cid = att.contentId.replace(/[<>]/g, '');
                const dataUri = `data:${att.contentType};base64,${att.content.toString('base64')}`;
                html = html.split(`cid:${cid}`).join(dataUri);
                html = html.split(`cid:<${cid}>`).join(dataUri);
              }
            }
            htmlBody = html;
          }
        } catch {
          // leave bodyText/htmlBody empty on parse error
        }
      }
      messages.push({
        id: `${name}:${msg.uid}`,
        subject: msg.envelope?.subject ?? '(no subject)',
        from: msg.envelope?.from?.[0]?.address ?? 'unknown',
        date: msg.envelope?.date?.toISOString() ?? new Date().toISOString(),
        preview: bodyText.slice(0, 80).replace(/\n/g, ' '),
        body: bodyText,
        htmlBody,
        read,
        account: name,
      });
    }
  } finally {
    lock.release();
  }

  await client.logout();
  return { messages, unreadCount, name, provider };
}

export async function fetchMail(): Promise<MailData> {
  const cached = cache.get<MailData>(CACHE_KEY);
  if (cached) return cached;

  const hasAccount1 = Boolean(config.mail.host && config.mail.user);
  const hasAccount2 = Boolean(config.mail2.host && config.mail2.user);

  if (!hasAccount1 && !hasAccount2) {
    return mockMailData();
  }

  // Fetch configured accounts in parallel; ignore failed ones gracefully.
  const tasks: Promise<{ messages: MailMessage[]; unreadCount: number; name: string; provider: string }>[] = [];
  if (hasAccount1) tasks.push(fetchMailForAccount(config.mail));
  if (hasAccount2) tasks.push(fetchMailForAccount(config.mail2));

  const results = await Promise.allSettled(tasks);
  const accounts: { name: string; unreadCount: number; provider: string }[] = [];
  const allMessages: MailMessage[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      accounts.push({ name: result.value.name, unreadCount: result.value.unreadCount, provider: result.value.provider });
      allMessages.push(...result.value.messages);
    }
    // On rejection, skip the account silently (already logged by Fastify's error handler upstream)
  }

  // Sort all messages oldest → newest across accounts
  allMessages.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalUnread = accounts.reduce((sum, a) => sum + a.unreadCount, 0);
  const cacheTtl = Math.min(config.mail.cacheTtl, hasAccount2 ? config.mail2.cacheTtl : Infinity);

  const data: MailData = {
    unreadCount: totalUnread,
    messages: allMessages,
    accounts,
    updatedAt: new Date().toISOString(),
  };

  cache.set(CACHE_KEY, data, cacheTtl);
  return data;
}

function mockMailData(): MailData {
  return {
    unreadCount: 3,
    accounts: [{ name: 'demo', unreadCount: 3, provider: 'generic' }],
    messages: [
      {
        id: 'demo:1',
        subject: 'Weekly digest',
        from: 'digest@example.com',
        date: new Date(Date.now() - 86_400_000).toISOString(),
        preview: 'Here is your weekly summary.',
        body: 'Here is your weekly summary.\n\nTop stories this week: nothing unusual happened. Everything is fine.',
        htmlBody: '<html><body style="font-family:sans-serif;font-size:14px;color:#222"><h2>Weekly Digest</h2><p>Here is your weekly summary.</p><p>Top stories this week: nothing unusual happened. Everything is fine.</p></body></html>',
        read: true,
        account: 'demo',
      },
      {
        id: 'demo:2',
        subject: 'Package delivery update',
        from: 'delivery@example.com',
        date: new Date(Date.now() - 3_600_000).toISOString(),
        preview: 'Your package is out for delivery.',
        body: 'Your package is out for delivery.\n\nExpected delivery: today between 14:00 and 18:00.\nTracking number: 1Z999AA10123456784',
        htmlBody: '<html><body style="font-family:sans-serif;font-size:14px;color:#222"><h2>Package Delivery Update</h2><p>Your package is <strong>out for delivery</strong>.</p><p>Expected delivery: <strong>today between 14:00 and 18:00</strong>.</p><p>Tracking number: <code>1Z999AA10123456784</code></p></body></html>',
        read: false,
        account: 'demo',
      },
      {
        id: 'demo:3',
        subject: 'Welcome to HomeDash',
        from: 'noreply@example.com',
        date: new Date().toISOString(),
        preview: 'Your dashboard is ready.',
        body: 'Your HomeDash dashboard is ready.\n\nYou can now view your mails, weather and home controls from a single panel.\n\nEnjoy!',
        htmlBody: '<html><body style="font-family:sans-serif;font-size:14px;color:#222"><h2>Welcome to HomeDash</h2><p>Your HomeDash dashboard is ready.</p><p>You can now view your mails, weather and home controls from a single panel.</p><p style="color:#888">Enjoy!</p></body></html>',
        read: false,
        account: 'demo',
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}
