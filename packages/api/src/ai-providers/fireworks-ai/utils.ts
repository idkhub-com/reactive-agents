import {
  FilePurpose,
  type FileRetrieveResponseBody,
  type FileStatus,
} from '@shared/types/api/routes/files-api';
import type { FireworksFile } from './types';

export const fireworksDatasetToOpenAIFile = (
  dataset: FireworksFile,
): FileRetrieveResponseBody => {
  const name = dataset.displayName || dataset.name;
  const id = name.split('/').at(-1);
  return {
    id: id ?? '',
    filename: `${id}.jsonl`,
    bytes: 0,
    // Doesn't support batches, so default to fine-tune
    purpose: FilePurpose.FINE_TUNE,
    status: dataset.state.toLowerCase() as FileStatus,
    created_at: new Date(dataset.createTime).getTime(),
    object: 'file',
  };
};
