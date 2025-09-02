'use client';

import { ChatCompletionsAPIViewer } from '@client/components/agents/skills/logs/components/log-view/components/completion-viewer/chat-completions-api';
import { CompletionsAPIViewer } from '@client/components/agents/skills/logs/components/log-view/components/completion-viewer/completions-api';
import { ImageGenerationViewer } from '@client/components/agents/skills/logs/components/log-view/components/completion-viewer/images-api';
import type { IdkRequestData } from '@shared/types/api/request/body';
import { FunctionName } from '@shared/types/api/request/function-name';
import { ResponsesAPIViewer } from './responses-api';

export function CompletionViewer({
  logId,
  idkRequestData,
}: {
  logId: string;
  idkRequestData: IdkRequestData;
}): React.ReactElement {
  if (!idkRequestData.responseBody) {
    return <div>No response body found.</div>;
  }

  if (idkRequestData.functionName === FunctionName.CHAT_COMPLETE) {
    return (
      <ChatCompletionsAPIViewer
        logId={logId}
        idkRequestBody={idkRequestData.requestBody}
        idkResponseBody={idkRequestData.responseBody}
      />
    );
  } else if (
    idkRequestData.functionName === FunctionName.COMPLETE ||
    idkRequestData.functionName === FunctionName.STREAM_COMPLETE
  ) {
    return (
      <CompletionsAPIViewer
        logId={logId}
        idkResponseBody={idkRequestData.responseBody}
      />
    );
  } else if (
    idkRequestData.functionName === FunctionName.CREATE_MODEL_RESPONSE
  ) {
    return (
      <ResponsesAPIViewer
        logId={logId}
        idkRequestBody={idkRequestData.requestBody}
        idkResponseBody={idkRequestData.responseBody}
      />
    );
  } else if (idkRequestData.functionName === FunctionName.GENERATE_IMAGE) {
    return <ImageGenerationViewer response={idkRequestData.responseBody} />;
  } else if (idkRequestData.functionName === FunctionName.MODERATE) {
    return <div>Moderation</div>;
  } else if (idkRequestData.functionName === FunctionName.CREATE_SPEECH) {
    return <div>Speech</div>;
  } else if (idkRequestData.functionName === FunctionName.PROXY) {
    return <div>Proxy</div>;
  } else {
    return <div>Unstructured output</div>;
  }
}
