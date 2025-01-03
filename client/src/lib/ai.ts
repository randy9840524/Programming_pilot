interface AIResponse {
  content: string;
  error?: string;
}

export async function analyzeCode(
  code: string,
  question: string
): Promise<string> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `${question}\n\nHere's the code:\n\`\`\`\n${code}\n\`\`\``
    }),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  return data.response;
}