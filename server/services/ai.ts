import { GoogleGenAI, Type } from '@google/genai';

// Retrieve the API key from environment variables
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Warning: GEMINI_API_KEY is not defined. AI analysis functionality will fail if called.');
}

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required but missing.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface BAAnalysisResult {
  executiveSummary: string;
  functionalRequirements: string[];
  userStories: Array<{
    title: string;
    story: string;
    acceptanceCriteria: string[];
  }>;
  risks: string[];
  assumptions: string[];
  clarifyingQuestions: string[];
}

export async function analyzeMeetingNotes(notes: string): Promise<BAAnalysisResult> {
  const client = getGeminiClient();

  const prompt = `
You are an expert enterprise-grade Senior Business Analyst.
Analyze the following meeting notes and generate a comprehensive set of structured business analysis documents.

MEETING NOTES:
---
${notes}
---

Your response MUST follow the strict structured JSON schema provided.
Ensure the elements are highly professional, clear, and actionable:
- **Executive Summary**: A concise, executive-level overview of the session, goals, and key decisions.
- **Functional Requirements**: Clear, developer-actionable functional requirements.
- **User Stories**: Multiple user stories written in standard format (As a... I want to... So that...).
- **Acceptance Criteria**: Concrete acceptance criteria for each user story, detailed as individual bullet points (Given/When/Then or checklist style).
- **Risks**: Potential technical, business, or timeline risks.
- **Assumptions**: Key assumptions made during the analysis.
- **Clarifying Questions**: Questions that remain unanswered from the notes to refine the scope.
`;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;
  let responseText: string | undefined;

  for (const model of modelsToTry) {
    let delay = 1000;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[AI] Attempt ${attempt}/${maxRetries} to analyze using model: ${model}`);
        const response = await client.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            systemInstruction: 'You are an elite Lead Business Analyst copilot. Your output must be complete, realistic, professional, and contain zero placeholders or mock text.',
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: {
                  type: Type.STRING,
                  description: 'Executive summary of the project and meeting notes.'
                },
                functionalRequirements: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of clear functional requirements.'
                },
                userStories: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: 'Short title for the story.' },
                      story: { type: Type.STRING, description: 'Standard story: As a [type of user], I want [some goal] so that [some reason].' },
                      acceptanceCriteria: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'Specific verification items for this user story.'
                      }
                    },
                    required: ['title', 'story', 'acceptanceCriteria']
                  },
                  description: 'Multiple user stories capturing user actions and value.'
                },
                risks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Potential project risks identified from the meeting.'
                },
                assumptions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Assumptions to make based on notes.'
                },
                clarifyingQuestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Unresolved questions to pose to stakeholders.'
                }
              },
              required: [
                'executiveSummary',
                'functionalRequirements',
                'userStories',
                'risks',
                'assumptions',
                'clarifyingQuestions'
              ]
            }
          }
        });

        if (response.text) {
          responseText = response.text;
          break; // Break the retry loop
        }
      } catch (error: any) {
        lastError = error;
        const errMsg = error?.message || String(error);
        console.warn(`[AI] Attempt ${attempt} with model ${model} failed: ${errMsg}`);

        // Don't retry if it's an authorization/API key error
        if (errMsg.includes('API key') || errMsg.includes('not found') || errMsg.includes('key is invalid')) {
          throw error;
        }

        if (attempt < maxRetries) {
          console.log(`[AI] Retrying in ${delay}ms...`);
          await sleep(delay);
          delay *= 2;
        }
      }
    }

    if (responseText) {
      break; // Break the model fallback loop
    }
  }

  if (!responseText) {
    const errorDetail = lastError instanceof Error ? lastError.message : JSON.stringify(lastError);
    console.error('All AI models and retries failed to generate analysis:', errorDetail);
    throw new Error(`Failed to analyze meeting notes with AI. Details: ${errorDetail}`);
  }

  try {
    const result: BAAnalysisResult = JSON.parse(responseText);
    return result;
  } catch (error) {
    console.error('Error parsing JSON from AI response:', error);
    throw new Error('Failed to parse the structured analysis document generated by the AI.');
  }
}
