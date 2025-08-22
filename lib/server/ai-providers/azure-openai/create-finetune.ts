import type { CreateFineTuningJobRequestBody } from '@shared/types/api/routes/fine-tuning-api/request';

export const azureTransformFinetuneBody = (
  body: CreateFineTuningJobRequestBody,
): CreateFineTuningJobRequestBody => {
  const _body = { ...body } as CreateFineTuningJobRequestBody;

  // if (_body.method && !_body.hyperparameters) {
  //   const hyperparameters =
  //     _body.method[_body.method.type]?.hyperparameters ?? {};
  //   _body.hyperparameters = {
  //     ...hyperparameters,
  //   } as unknown as typeof _body.hyperparameters;

  //   delete _body.method;
  // }  // TODO: fix this

  return {
    ..._body,
  };
};
