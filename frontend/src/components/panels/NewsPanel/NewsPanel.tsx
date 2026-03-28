import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNews, dislikePost } from '../../../hooks/useNews';
import { usePanelContext } from '../../PanelWrapper/PanelWrapper';
import type { NewsPost } from '../../../types';
import styles from './NewsPanel.module.css';

const AUTO_ADVANCE_MS = 12_000;

function ArticleOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return createPortal(
    <div className={styles.overlayBackdrop} onClick={onClose}>
      <div className={styles.overlayWindow} onClick={(e) => e.stopPropagation()}>
        <div className={styles.overlayHeader}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.overlayUrl}
            onClick={(e) => e.stopPropagation()}
          >
            {url}
          </a>
          <button className={styles.overlayClose} onClick={onClose} aria-label="Close article">
            ✕
          </button>
        </div>
        <iframe
          className={styles.overlayFrame}
          src={url}
          title="Article"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    </div>,
    document.body,
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NewsPanel() {
  const { data, error, isLoading } = useNews();
  const { isFocused } = usePanelContext();

  // Local dismissed set — posts removed by "not interested" without refetch
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  const visiblePosts: NewsPost[] = (data?.posts ?? []).filter(
    (p) => !dismissed.has(p.id),
  );

  // Keep currentIndex in bounds when posts change
  const safeIdx =
    visiblePosts.length > 0 ? currentIndex % visiblePosts.length : 0;
  const current = visiblePosts[safeIdx] ?? null;

  // Auto-advance when collapsed
  useEffect(() => {
    if (isFocused || visiblePosts.length < 2) return;
    const id = setInterval(
      () => setCurrentIndex((i) => (i + 1) % visiblePosts.length),
      AUTO_ADVANCE_MS,
    );
    return () => clearInterval(id);
  }, [isFocused, visiblePosts.length]);

  const handleDislike = useCallback(
    (post: NewsPost, e: React.MouseEvent) => {
      e.stopPropagation();
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(post.id);
        return next;
      });
      // Advance to next post if this was the current one
      setCurrentIndex((i) => {
        const total = visiblePosts.length - 1;
        return total > 0 ? i % total : 0;
      });
      // Persist learning signal (fire-and-forget)
      void dislikePost(post.id, post.title, post.description.slice(0, 200));
    },
    [visiblePosts.length],
  );

  if (isLoading) return <span className={styles.meta}>Loading…</span>;
  if (error || !data) return <span className={styles.meta}>Unavailable</span>;
  if (!current) return <span className={styles.meta}>No posts</span>;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) setCurrentIndex((i) => (i + 1) % visiblePosts.length);
    else setCurrentIndex((i) => (i - 1 + visiblePosts.length) % visiblePosts.length);
  };

  // ── Collapsed: scrollable list of all posts ────────────────────────────────
  if (!isFocused) {
    return (
      <>
        <div className={styles.stackList}>
          {visiblePosts.map((post, i) => (
            <div
              key={post.id}
              className={[styles.stackItem, i > 0 ? styles.stackSep : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => setCurrentIndex(i)}
            >
              {post.imageUrl && (
                <img
                  className={styles.stackThumb}
                  src={post.imageUrl}
                  alt=""
                  loading="lazy"
                />
              )}
              <div className={styles.stackText}>
                <span className={styles.collapsedSource}>{post.source}</span>
                <span className={styles.stackTitle}>{post.title}</span>
                <div className={styles.stackMeta}>
                  <span className={styles.stackTime}>{timeAgo(post.publishedAt)}</span>
                  <button
                    className={styles.readMoreBtn}
                    onClick={(e) => { e.stopPropagation(); setOverlayUrl(post.url); }}
                  >
                    Read more →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {overlayUrl && <ArticleOverlay url={overlayUrl} onClose={() => setOverlayUrl(null)} />}
      </>
    );
  }

  // ── Expanded / Detail view ────────────────────────────────────────────────
  return (
    <div
      className={styles.focusedLayout}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main card */}
      <div className={styles.card}>
        {current.imageUrl && (
          <div className={styles.imageWrap}>
            <img
              className={styles.image}
              src={current.imageUrl}
              alt=""
              loading="lazy"
            />
          </div>
        )}
        <div className={current.imageUrl ? styles.content : `${styles.content} ${styles.contentFull}`}>
          <div className={styles.cardMeta}>
            <span className={styles.source}>{current.source}</span>
            <span className={styles.time}>{timeAgo(current.publishedAt)}</span>
          </div>
          <div className={styles.title}>{current.title}</div>
          {current.description && (
            <div className={styles.description}>{current.description}</div>
          )}
          <div className={styles.cardActions}>
            <button
              className={styles.readMoreBtn}
              onClick={(e) => { e.stopPropagation(); setOverlayUrl(current.url); }}
            >
              Read more →
            </button>
            <button
              className={styles.dislikeBtn}
              onClick={(e) => handleDislike(current, e)}
              aria-label="Not interested in this article"
            >
              ✕ not interested
            </button>
          </div>
        </div>
      </div>

      {overlayUrl && <ArticleOverlay url={overlayUrl} onClose={() => setOverlayUrl(null)} />}

      {/* Sidebar: switch between posts */}
      <div className={styles.sidebar}>
        {visiblePosts.map((post, i) => (
          <div
            key={post.id}
            className={[
              styles.sidebarItem,
              i === safeIdx ? styles.sidebarItemActive : '',
              i > 0 ? styles.sidebarSep : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
          >
            {post.imageUrl && (
              <img
                className={styles.sidebarThumb}
                src={post.imageUrl}
                alt=""
                loading="lazy"
              />
            )}
            <div className={styles.sidebarText}>
              <span className={styles.sidebarSource}>{post.source}</span>
              <span className={styles.sidebarTitle}>{post.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
