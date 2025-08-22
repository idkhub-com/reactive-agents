import { Button } from '@client/components/ui/button';
import { CardHeader, CardTitle } from '@client/components/ui/card';
import { Separator } from '@client/components/ui/separator';
import type { Agent } from '@shared/types/data/agent';
import type { Skill } from '@shared/types/data/skill';
import { Check, Edit, Trash2, User, Wrench, X } from 'lucide-react';

interface SkillHeaderProps {
  skill: Skill;
  agents: Agent[];
  isEditing: boolean;
  isUpdating: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function SkillHeader({
  skill,
  agents,
  isEditing,
  isUpdating,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onClose,
}: SkillHeaderProps): React.ReactElement {
  const getAgentName = (agentId: string): string => {
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name || 'Unknown Agent';
  };

  return (
    <CardHeader className="flex flex-row justify-between items-center p-2 bg-card-header">
      <CardTitle className="text-sm font-light m-0 pl-2 flex flex-row items-center gap-2">
        <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <span className="text-sm font-light">{skill.name}</span>
        <Separator orientation="vertical" />
        <span className="text-xs font-light bg-orange-100 dark:bg-orange-900/20 px-2 py-1 rounded-full text-orange-800 dark:text-orange-200">
          <User className="h-3 w-3 mr-1 inline" />
          {getAgentName(skill.agent_id)}
        </span>
      </CardTitle>
      <div className="flex flex-row justify-end shrink-0 gap-1">
        {isEditing ? (
          <>
            <Button
              onClick={onSave}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600 hover:bg-green-100"
              title="Save changes"
              disabled={isUpdating}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              onClick={onCancel}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-600 hover:bg-gray-100"
              title="Cancel editing"
              disabled={isUpdating}
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={onEdit}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-600 hover:bg-blue-100"
              title="Edit skill"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              onClick={onDelete}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:bg-red-100"
              title="Delete skill"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-600 hover:bg-gray-100"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </CardHeader>
  );
}
