'use client';

import { ChatCompletionsAPIViewer } from '@client/components/agents/skills/logs/components/completion-viewer/chat-completions-api';
import { CompletionsAPIViewer } from '@client/components/agents/skills/logs/components/completion-viewer/completions-api';
import { ImageGenerationViewer } from '@client/components/agents/skills/logs/components/completion-viewer/images-api';
import type { ReactiveAgentsRequestData } from '@shared/types/api/request/body';
import { FunctionName } from '@shared/types/api/request/function-name';
import { ResponsesAPIViewer } from './responses-api';

export function CompletionViewer({
  logId,
  raRequestData,
}: {
  logId: string;
  raRequestData: ReactiveAgentsRequestData;
}): React.ReactElement {
  if (!raRequestData.responseBody) {
    return <div>No response body found.</div>;
  }

  if (raRequestData.functionName === FunctionName.CHAT_COMPLETE) {
    return (
      <ChatCompletionsAPIViewer
        logId={logId}
        raRequestBody={raRequestData.requestBody}
        raResponseBody={raRequestData.responseBody}
      />
    );
  } else if (
    raRequestData.functionName === FunctionName.COMPLETE ||
    raRequestData.functionName === FunctionName.STREAM_COMPLETE
  ) {
    return (
      <CompletionsAPIViewer
        logId={logId}
        raResponseBody={raRequestData.responseBody}
      />
    );
  } else if (
    raRequestData.functionName === FunctionName.CREATE_MODEL_RESPONSE
  ) {
    return (
      <ResponsesAPIViewer
        logId={logId}
        raRequestBody={raRequestData.requestBody}
        raResponseBody={raRequestData.responseBody}
      />
    );
  } else if (raRequestData.functionName === FunctionName.GENERATE_IMAGE) {
    return <ImageGenerationViewer response={raRequestData.responseBody} />;
  } else if (raRequestData.functionName === FunctionName.MODERATE) {
    return <div>Moderation</div>;
  } else if (raRequestData.functionName === FunctionName.CREATE_SPEECH) {
    return <div>Speech</div>;
  } else if (raRequestData.functionName === FunctionName.PROXY) {
    return <div>Proxy</div>;
  } else {
    return <div>Unstructured output</div>;
  }
}
