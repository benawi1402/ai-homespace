import { useQuery } from '@tanstack/react-query';
import type { NewsData } from '../types';

async function fetchNews(): Promise<NewsData> {
  const res = await fetch('/api/news');
  if (!res.ok) throw new Error(`News fetch failed: ${res.status}`);
  return res.json() as Promise<NewsData>;
}

export function useNews() {
  return useQuery({
    queryKey: ['news'],
    queryFn: fetchNews,
    refetchInterval: 30 * 60 * 1000, // matches server-side 30-min cache
    staleTime:       15 * 60 * 1000,
    retry: 2,
  });
}

export async function dislikePost(id: string, title: string, synopsis: string): Promise<void> {
  await fetch('/api/news/dislike', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, title, synopsis }),
  });
}
