interface AIResponse {
  content: string;
  error?: string;
}

export async function analyzeCode(
  file: string,
  question: string
): Promise<AIResponse> {
  try {
    // Get file content first
    const fileResponse = await fetch(`/api/files/${encodeURIComponent(file)}`);
    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      throw new Error(`Failed to load file: ${errorText}`);
    }

    const fileData = await fileResponse.json();
    if (!fileData.content) {
      throw new Error("File content is empty");
    }

    // Prepare the code and question for analysis
    const analysisResponse = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `Here is the code I want you to analyze:\n\`\`\`\n${fileData.content}\n\`\`\`\n\nQuestion: ${question}`
      }),
      credentials: 'include'
    });

    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.json();
      throw new Error(errorData.message || `Analysis failed: ${analysisResponse.statusText}`);
    }

    const data = await analysisResponse.json();
    if (!data.response) {
      throw new Error("No response from AI");
    }

    return { content: data.response };
  } catch (error: any) {
    console.error("AI analysis failed:", error);
    return { 
      content: "", 
      error: error.message || "Failed to analyze code" 
    };
  }
}