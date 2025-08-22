'use client';

import { SkillListView } from '@client/components/skills/components/skill-list-view';
import type { ReactElement } from 'react';

export default function SkillsPage(): ReactElement {
  console.log('🛠️ Rendering SkillsPage');
  return <SkillListView />;
}
