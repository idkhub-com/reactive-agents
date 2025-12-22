import { Extension } from '@tiptap/core';

export interface JinjaHighlightOptions {
  variableClass: string;
  blockClass: string;
  commentClass: string;
}

export const JinjaHighlight = Extension.create<JinjaHighlightOptions>({
  name: 'jinjaHighlight',

  addOptions() {
    return {
      variableClass: 'jinja-variable',
      blockClass: 'jinja-block',
      commentClass: 'jinja-comment',
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          'data-jinja-enabled': {
            default: 'true',
          },
        },
      },
    ];
  },
});
