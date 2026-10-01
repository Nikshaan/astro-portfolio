/** Strip credentials from a URL before it lands in an error message or log. */
export function redactUrl(url) {
  return url.replace(/([?&]api_key=)[^&]*/gi, "$1[REDACTED]");
}

/**
 * Last.fm reports some failures (rate limit, bad key, unknown user) as a JSON
 * `{ error, message }` body, sometimes with HTTP 200.
 */
export function assertLastFmOk(json) {
  if (json && typeof json === "object" && json.error != null) {
    throw new Error(`Last.fm error ${json.error}: ${json.message ?? ""}`);
  }
}
