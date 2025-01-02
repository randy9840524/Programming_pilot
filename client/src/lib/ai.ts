export async function analyzeCode(
  file: string,
  question: string
): Promise<string> {
  try {
    // Get file content
    const fileResponse = await fetch(`/api/files/${encodeURIComponent(file)}`);
    if (!fileResponse.ok) {
      throw new Error(`Failed to load file: ${await fileResponse.text()}`);
    }

    const fileData = await fileResponse.json();
    const code = fileData.content;

    // Send for analysis
    const analysisResponse = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, prompt: question }),
    });

    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.json();
      throw new Error(errorData.message || `Analysis failed: ${analysisResponse.statusText}`);
    }

    const data = await analysisResponse.json();
    if (!data.response) {
      throw new Error("No response from AI");
    }

    return data.response;
  } catch (error: any) {
    console.error("AI analysis failed:", error);
    throw new Error(error.message || "Failed to analyze code");
  }
}