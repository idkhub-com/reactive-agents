export const FireworksFileUploadResponseTransform = (
  response: Response,
  responseStatus: number,
): Response => {
  if (responseStatus === 200) {
    return response;
  }
  return response;
};
