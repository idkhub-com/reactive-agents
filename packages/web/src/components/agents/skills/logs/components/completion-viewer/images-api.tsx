'use client';

import type { GenerateImageResponseBody } from '@shared/types/api/routes/images-api';

export function ImageGenerationViewer({
  response,
}: {
  response: GenerateImageResponseBody;
}): React.ReactElement {
  return (
    <div className="">
      {response.data.map((imageData) => (
        <img
          key={
            imageData.url ?? `b64-${(imageData.b64_json ?? '').slice(0, 16)}`
          }
          src={imageData.url ?? `data:image/png;base64,${imageData.b64_json}`}
          alt="Generated content"
          width={500}
          height={500}
        />
      ))}
    </div>
  );
}
