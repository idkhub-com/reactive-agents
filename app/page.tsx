'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace('/agents');
  }, [router]);

  return null;
}
