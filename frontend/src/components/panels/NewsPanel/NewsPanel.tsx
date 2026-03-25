import { useState, useEffect, useCallback, useRef } from 'react';
import { useNews, dislikePost } from '../../../hooks/useNews';
import { usePanelContext } from '../../PanelWrapper/PanelWrapper';
import type { NewsPost } from '../../../types';
import styles from './NewsPanel.module.css';

const AUTO_ADVANCE_MS = 12_000;

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

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (visiblePosts.length < 2) return;
    setCurrentIndex((i) => (i - 1 + visiblePosts.length) % visiblePosts.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (visiblePosts.length < 2) return;
    setCurrentIndex((i) => (i + 1) % visiblePosts.length);
  };

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

  // ── Collapsed ──────────────────────────────────────────────────────────────
  if (!isFocused) {
    return (
      <div className={styles.collapsed}>
        {current.imageUrl && (
          <img
            className={styles.collapsedThumb}
            src={current.imageUrl}
            alt=""
            loading="lazy"
          />
        )}
        <div className={styles.collapsedText}>
          <div className={styles.collapsedSource}>{current.source}</div>
          <div className={styles.collapsedTitle}>{current.title}</div>
        </div>
        <div className={styles.dots}>
          {visiblePosts.slice(0, 8).map((_, i) => (
            <span
              key={i}
              className={[styles.dot, i === safeIdx ? styles.dotActive : '']
                .filter(Boolean)
                .join(' ')}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Expanded / Gallery ─────────────────────────────────────────────────────
  return (
    <div
      className={styles.gallery}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Previous arrow */}
      <button
        className={styles.arrow}
        onClick={handlePrev}
        disabled={visiblePosts.length < 2}
        aria-label="Previous article"
      >
        ‹
      </button>

      {/* Card */}
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
          <button
            className={styles.dislikeBtn}
            onClick={(e) => handleDislike(current, e)}
            aria-label="Not interested in this article"
          >
            ✕ not interested
          </button>
        </div>
      </div>

      {/* Next arrow */}
      <button
        className={styles.arrow}
        onClick={handleNext}
        disabled={visiblePosts.length < 2}
        aria-label="Next article"
      >
        ›
      </button>

      {/* Progress dots */}
      <div className={styles.dotsBottom}>
        {visiblePosts.slice(0, 10).map((_, i) => (
          <button
            key={i}
            className={[styles.dot, i === safeIdx ? styles.dotActive : '']
              .filter(Boolean)
              .join(' ')}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(i);
            }}
            aria-label={`Go to article ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
