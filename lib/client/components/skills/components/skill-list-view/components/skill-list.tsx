'use client';

import { Button } from '@client/components/ui/button';
import { useSkills } from '@client/providers/skills';
import { cn } from '@client/utils/ui/utils';
import type { Skill } from '@shared/types/data';
import { format } from 'date-fns';
import { Settings, Trash2, User, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type * as React from 'react';

interface SkillsListProps {
  skills: Skill[];
  getAgentName: (agentId: string) => string;
}

export function SkillsList({
  skills,
  getAgentName,
}: SkillsListProps): React.ReactElement {
  const { selectedSkill, setSelectedSkill, deleteSkill } = useSkills();
  const router = useRouter();

  const handleSelectSkill = (skill: Skill) => {
    setSelectedSkill(skill);
  };

  const handleViewSkill = (skill: Skill) => {
    router.push(`/skills/${skill.id}`);
  };

  const handleDeleteSkill = async (
    e: React.MouseEvent,
    skill: Skill,
  ): Promise<void> => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${skill.name}"?`)) {
      try {
        await deleteSkill(skill.id);
      } catch (error) {
        console.error('Error deleting skill:', error);
      }
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return format(date, 'MMM d, HH:mm:ss a');
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="space-y-2 p-2">
        {skills.map((skill) => {
          const isSelected = selectedSkill?.id === skill.id;
          const agentName = getAgentName(skill.agent_id);

          return (
            // biome-ignore lint/a11y/useSemanticElements: Wrapper contains nested buttons; using div with button semantics
            <div
              key={skill.id}
              className={cn(
                'group relative cursor-pointer rounded-lg border p-3 transition-all hover:bg-accent',
                isSelected && 'border-primary bg-accent',
              )}
              role="button"
              tabIndex={0}
              onClick={() => handleViewSkill(skill)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleViewSkill(skill);
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-lg shrink-0">
                    <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">
                        {skill.name}
                      </h3>
                      {isSelected && (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    {skill.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {skill.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created: {formatTimestamp(skill.created_at)}</span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {agentName}
                      </span>
                      {Object.keys(skill.metadata).length > 0 && (
                        <span>
                          {Object.keys(skill.metadata).length} metadata fields
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isSelected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSkill(skill);
                      }}
                      className="h-8 w-8 p-0"
                      title="Set as active skill"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteSkill(e, skill)}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title="Delete skill"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
