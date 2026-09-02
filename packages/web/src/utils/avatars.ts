import { shapes } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';

const BACKGROUNDS = [
  '00acc1',
  '039be5',
  '1e88e5',
  '43a047',
  '546e7a',
  '5e35b1',
  '6d4c41',
  '757575',
  '7cb342',
  '8e24aa',
  'c0ca33',
  'd81b60',
  'e53935',
  'f4511e',
  'fb8c00',
  'fdd835',
  'ffb300',
  '00897b',
  '3949ab',
];

/** A skill's avatar, drawn from its name, as an image URL. */
export const createSkillAvatar = (skillName: string): string => {
  const svg = createAvatar(shapes, {
    seed: skillName,
    size: 24,
    backgroundColor: BACKGROUNDS,
  }).toString();
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
