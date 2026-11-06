// Retry only temporary provider failures. User input and permission errors are not retried.
export async function generateResponse(url: string, body: object) {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(18_000) });
    if (![502, 503, 504].includes(response.status) || attempt === 2) return response;
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
  throw new Error('AI response missing');
}
