/**
 * Parse JSON from an API response body.
 * Local PHP 8.5 dev servers may prepend deprecation HTML before the JSON payload.
 */
export async function readApiJson<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  const trimmed = text.trimStart();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed) as T;
  }

  const jsonStart = text.search(/[{[]/);
  if (jsonStart === -1) {
    throw new SyntaxError(
      "API response is not JSON. If using a local Laravel API, PHP warnings in the response can break parsing — check the terminal running `php artisan serve`, or use the production API URL.",
    );
  }

  return JSON.parse(text.slice(jsonStart)) as T;
}
