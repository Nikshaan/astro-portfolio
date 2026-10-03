export function redactUrl(url) {
  return url.replace(/([?&]api_key=)[^&]*/gi, "$1[REDACTED]");
}

export function assertLastFmOk(json) {
  if (json && typeof json === "object" && json.error != null) {
    throw new Error(`Last.fm error ${json.error}: ${json.message ?? ""}`);
  }
}
