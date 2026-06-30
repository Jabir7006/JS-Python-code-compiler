import { Settings } from "./hooks/useSettings";

export async function explainErrorAI(errorText: string, codeText: string, settings: Settings) {
  const prompt = `Explain this error in simple, beginner-friendly terms and suggest a fix.

Code:
\`\`\`
${codeText}
\`\`\`

Error:
\`\`\`
${errorText}
\`\`\`
`;

  if (settings.aiProvider === "gemini") {
    if (!settings.geminiApiKey) throw new Error("Gemini API key is not configured.");
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text as string;
  } 

  if (settings.aiProvider === "groq") {
    if (!settings.groqApiKey) throw new Error("Groq API key is not configured.");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }]
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content as string;
  }

  throw new Error("Invalid AI provider");
}

export async function generateCodeSnippet(promptText: string, language: string, settings: Settings) {
  const prompt = `Write only the ${language} code for the following request. Do not include markdown formatting or explanations, just the raw code.

Request: ${promptText}`;

  if (settings.aiProvider === "gemini") {
    if (!settings.geminiApiKey) throw new Error("Gemini API key is not configured.");
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    let code = data.candidates[0].content.parts[0].text as string;
    // Strip markdown formatting if the model still included it
    code = code.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '');
    return code.trim();
  } 

  if (settings.aiProvider === "groq") {
    if (!settings.groqApiKey) throw new Error("Groq API key is not configured.");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }]
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    let code = data.choices[0].message.content as string;
    // Strip markdown formatting if the model still included it
    code = code.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '');
    return code.trim();
  }

  throw new Error("Invalid AI provider");
}
