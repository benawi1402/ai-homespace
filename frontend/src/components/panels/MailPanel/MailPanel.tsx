import { useState } from 'react';
import { useMail } from '../../../hooks/useMail';
import { usePanelContext } from '../../PanelWrapper/PanelWrapper';
import type { MailMessage } from '../../../types';
import styles from './MailPanel.module.css';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 18" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="22" height="16" rx="1.5" fill="white" stroke="#DADCE0" strokeWidth="1"/>
      <path d="M2 2.5 L12 10 L22 2.5" stroke="#EA4335" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M2 2.5 L2 16.5" stroke="#4285F4" strokeWidth="1.5"/>
      <path d="M22 2.5 L22 16.5" stroke="#34A853" strokeWidth="1.5"/>
    </svg>
  );
}

function PosteoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 18" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="22" height="16" rx="1.5" fill="#F1F8E9" stroke="#66BB6A" strokeWidth="1.5"/>
      <path d="M2 2.5 L12 10 L22 2.5" stroke="#43A047" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M2 2.5 L2 16.5" stroke="#66BB6A" strokeWidth="1"/>
      <path d="M22 2.5 L22 16.5" stroke="#66BB6A" strokeWidth="1"/>
    </svg>
  );
}

function GenericMailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 18" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="22" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 2.5 L12 10 L22 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function ProviderIcon({ provider, className }: { provider: string; className?: string }) {
  if (provider === 'gmail') return <GmailIcon className={className} />;
  if (provider === 'posteo') return <PosteoIcon className={className} />;
  return <GenericMailIcon className={className} />;
}

function MailBodyView({ msg, onBack }: { msg: MailMessage; onBack: () => void }) {
  return (
    <div className={styles.bodyView} onClick={(e) => e.stopPropagation()}>
      <div className={styles.bodyHeader}>
        <button className={styles.backButton} onClick={onBack} aria-label="Back to list">
          ← back
        </button>
        <div className={styles.bodyMeta}>
          <span className={styles.bodySubject}>{msg.subject}</span>
          <span className={styles.bodyFrom}>
            {msg.from} &middot; {timeAgo(msg.date)}
          </span>
        </div>
      </div>
      <div className={styles.bodyContent}>
        {msg.htmlBody ? (
          <iframe
            className={styles.bodyFrame}
            srcDoc={msg.htmlBody}
            sandbox="allow-same-origin"
            title="Email content"
          />
        ) : msg.body ? (
          <pre className={styles.bodyText}>{msg.body}</pre>
        ) : (
          <em className={styles.noBody}>No content</em>
        )}
      </div>
    </div>
  );
}

export default function MailPanel() {
  const { data, error, isLoading } = useMail();
  const { isFocused } = usePanelContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isFocused && selectedId) setSelectedId(null);

  if (isLoading) return <span className={styles.meta}>Loading…</span>;
  if (error || !data) return <span className={styles.meta}>Unavailable</span>;

  const selected = selectedId ? (data.messages.find((m) => m.id === selectedId) ?? null) : null;

  // Group messages per account, preserving account order
  const byAccount = new Map<string, MailMessage[]>();
  for (const acct of data.accounts) {
    byAccount.set(acct.name, data.messages.filter((m) => m.account === acct.name));
  }

  // ── Body view (full-width, account icon on left) ─────────────────────────────
  if (isFocused && selected) {
    const acctInfo = data.accounts.find((a) => a.name === selected.account);
    return (
      <div className={[styles.container, styles.containerStretched].join(' ')}>
        <div className={styles.bodyAccountBar}>
          {acctInfo && (
            <ProviderIcon provider={acctInfo.provider} className={styles.providerIconLg} />
          )}
        </div>
        <MailBodyView msg={selected} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  // ── Collapsed ────────────────────────────────────────────────────────────────
  if (!isFocused) {
    return (
      <div className={styles.container}>
        {data.accounts.map((acct, i) => {
          const msgs = byAccount.get(acct.name) ?? [];
          const latest = msgs[msgs.length - 1];
          return (
            <div
              key={acct.name}
              className={[styles.collapsedAccount, i > 0 ? styles.collapsedSep : '']
                .filter(Boolean)
                .join(' ')}
            >
              <div className={styles.collapsedStats}>
                <ProviderIcon provider={acct.provider} className={styles.providerIcon} />
                <span className={styles.collapsedCount}>{acct.unreadCount}</span>
                <span className={styles.collapsedLabel}>unread</span>
              </div>
              {latest && (
                <div className={styles.collapsedPreview}>
                  <span className={styles.previewSubject}>{latest.subject}</span>
                  <span className={styles.previewFrom}>{latest.from}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Expanded: separate column per account ────────────────────────────────────
  return (
    <div className={[styles.container, styles.containerStretched].join(' ')}>
      {data.accounts.map((acct, i) => {
        const msgs = byAccount.get(acct.name) ?? [];
        return (
          <div
            key={acct.name}
            className={[styles.accountCol, i > 0 ? styles.accountColSep : '']
              .filter(Boolean)
              .join(' ')}
          >
            <div className={styles.accountHeader}>
              <ProviderIcon provider={acct.provider} className={styles.providerIcon} />
              <span className={styles.accountName}>{acct.name}</span>
              {acct.unreadCount > 0 && (
                <span className={styles.accountUnread}>{acct.unreadCount}</span>
              )}
            </div>
            <div className={styles.accountMessages}>
              {msgs.map((msg) => (
                <div
                  key={msg.id}
                  className={[
                    styles.message,
                    !msg.read ? styles.unread : '',
                    styles.clickable,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(msg.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      setSelectedId(msg.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open: ${msg.subject}`}
                >
                  <div className={styles.msgMeta}>
                    <span className={styles.from}>{msg.from}</span>
                    <span className={styles.time}>{timeAgo(msg.date)}</span>
                  </div>
                  <div className={styles.subject}>{msg.subject}</div>
                  {msg.preview && (
                    <div className={styles.msgPreview}>{msg.preview}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
