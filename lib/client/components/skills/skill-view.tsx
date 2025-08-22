'use client';

import { Card } from '@client/components/ui/card';
import { useAgents } from '@client/providers/agents';
import { useSkills } from '@client/providers/skills';
import type { Skill } from '@shared/types/data/skill';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SkillContent } from './components/skill-content';
import { SkillHeader } from './components/skill-header';

interface SkillViewProps {
  skillId: string;
  onClose: () => void;
}

export function SkillView({
  skillId,
  onClose,
}: SkillViewProps): React.ReactElement {
  const { skills, updateSkill, deleteSkill, isUpdating } = useSkills();
  const { agents } = useAgents();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [currentSkill, setCurrentSkill] = useState<Skill | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');

  // Find skill by ID
  useEffect(() => {
    if (skillId) {
      const skill = skills.find((s) => s.id === skillId) || null;
      setCurrentSkill(skill);
    } else {
      setCurrentSkill(null);
    }
  }, [skillId, skills]);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Update editDescription when currentSkill changes and reset edit state
  useEffect(() => {
    if (currentSkill) {
      setEditDescription(currentSkill.description || '');
      setIsEditing(false); // Reset edit state when switching skills
    }
  }, [currentSkill]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setEditDescription(currentSkill?.description || '');
  }, [currentSkill]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditDescription(currentSkill?.description || '');
  }, [currentSkill]);

  const handleSave = useCallback(async () => {
    if (!currentSkill) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await updateSkill(currentSkill.id, {
        description: editDescription.trim() === '' ? null : editDescription,
      });

      if (abortController.signal.aborted) return;

      setIsEditing(false);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Failed to update skill:', error);
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [currentSkill, editDescription, updateSkill]);

  const handleDelete = useCallback(async () => {
    if (
      !currentSkill ||
      !confirm('Are you sure you want to delete this skill?')
    )
      return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await deleteSkill(currentSkill.id);

      if (abortController.signal.aborted) return;

      handleClose();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Failed to delete skill:', error);
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [currentSkill, deleteSkill, handleClose]);

  if (!currentSkill) {
    return <div aria-hidden="true" />;
  }

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      data-testid="skill-view"
    >
      <Card
        id="skill-view-card"
        className="flex flex-col h-full relative overflow-hidden shadow-xl"
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>): void => {
          if (e.key === 'Escape') {
            handleClose();
          }
        }}
      >
        <SkillHeader
          skill={currentSkill}
          agents={agents}
          isEditing={isEditing}
          isUpdating={isUpdating}
          onEdit={handleEdit}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={handleDelete}
          onClose={handleClose}
        />

        <SkillContent
          skill={currentSkill}
          isEditing={isEditing}
          editDescription={editDescription}
          onDescriptionChange={setEditDescription}
          isUpdating={isUpdating}
        />
      </Card>
    </div>
  );
}
