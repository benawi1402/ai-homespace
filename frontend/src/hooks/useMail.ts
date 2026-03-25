import { useQuery } from '@tanstack/react-query';
import type { MailData } from '../types';

async function fetchMail(): Promise<MailData> {
  const res = await fetch('/api/mail');
  if (!res.ok) throw new Error(`Mail fetch failed: ${res.status}`);
  return res.json() as Promise<MailData>;
}

export function useMail() {
  return useQuery({
    queryKey: ['mail'],
    queryFn: fetchMail,
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
    retry: 2,
  });
}
