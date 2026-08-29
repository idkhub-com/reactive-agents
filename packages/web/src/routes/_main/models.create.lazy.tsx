'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { ModelForm } from '@web/components/models/model-form';

export const Route = createLazyFileRoute('/_main/models/create')({
  component: ModelForm,
});
