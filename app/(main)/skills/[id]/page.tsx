'use client';

import { SkillView } from '@client/components/skills';
import { useParams, useRouter } from 'next/navigation';
import type { ReactElement } from 'react';

export default function SkillPage(): ReactElement {
  const params = useParams();
  const router = useRouter();
  const skillId = params.id as string;

  const handleClose = () => {
    router.push('/skills');
  };

  return <SkillView skillId={skillId} onClose={handleClose} />;
}
