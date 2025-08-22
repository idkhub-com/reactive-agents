import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Textarea } from '@client/components/ui/textarea';
import type { Skill } from '@shared/types/data/skill';
import { sanitizeDescription, sanitizeMetadata } from '@shared/utils/security';
import { format } from 'date-fns';
import { Calendar, Settings, Wrench } from 'lucide-react';

interface SkillContentProps {
  skill: Skill;
  isEditing: boolean;
  editDescription: string;
  onDescriptionChange: (description: string) => void;
  isUpdating: boolean;
}

export function SkillContent({
  skill,
  isEditing,
  editDescription,
  onDescriptionChange,
  isUpdating,
}: SkillContentProps): React.ReactElement {
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return format(date, 'PPP p');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <CardContent className="flex flex-row p-0 h-full relative border-t overflow-hidden">
      <div className="inset-0 flex flex-col flex-1 w-full p-4 gap-4 overflow-hidden overflow-y-auto">
        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Skill Name
                </p>
                <p className="text-sm bg-muted/50 p-2 rounded font-mono">
                  {skill.name}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Description
              </p>
              {isEditing ? (
                <Textarea
                  value={editDescription}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder="Enter skill description..."
                  className="text-sm min-h-[60px]"
                  disabled={isUpdating}
                />
              ) : (
                <p className="text-sm bg-muted/50 p-2 rounded min-h-[60px]">
                  {sanitizeDescription(skill.description || '') || (
                    <span className="text-muted-foreground italic">
                      No description provided
                    </span>
                  )}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Created At
                </p>
                <p className="text-sm bg-muted/50 p-2 rounded font-mono">
                  {formatTimestamp(skill.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Metadata
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(skill.metadata).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(sanitizeMetadata(skill.metadata)).map(
                  ([key, value]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {key}
                      </p>
                      <p className="text-sm bg-muted/50 p-2 rounded font-mono">
                        {value}
                      </p>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground italic">
                  No metadata available
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CardContent>
  );
}
