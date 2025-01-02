export async function analyzeCode(
  file: string,
  question: string
): Promise<string> {
  try {
    // Get file content
    const fileResponse = await fetch(`/api/files/${encodeURIComponent(file)}`);
    const code = await fileResponse.text();

    // Send for analysis
    const analysisResponse = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, prompt: question }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${analysisResponse.statusText}`);
    }

    const data = await analysisResponse.json();
    return data.response || "No response from AI";
  } catch (error) {
    console.error("AI analysis failed:", error);
    throw error;
  }
}