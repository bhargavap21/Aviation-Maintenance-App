import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompts for aviation maintenance assistant
export const MAINTENANCE_ASSISTANT_PROMPT = `You are an AI assistant specialized in aviation maintenance for Part 135 charter operations. 

Your expertise includes:
- Gulfstream G550 aircraft systems and maintenance requirements
- Part 135 regulatory compliance (FAR 135.411, 135.419, etc.)
- Maintenance intervals: A-checks (500 hours), C-checks (2400 hours)
- Work order management and prioritization
- Parts inventory and supply chain management
- Safety-critical maintenance procedures
- Regulatory documentation requirements

Always prioritize safety and regulatory compliance in your responses. When discussing maintenance procedures:
1. Reference specific regulations when applicable
2. Emphasize safety considerations
3. Suggest proper documentation requirements
4. Consider operational impact and aircraft availability
5. Recommend appropriate personnel qualifications

Respond in a professional, safety-focused manner appropriate for aviation maintenance professionals.`;

export const VOICE_COMMAND_PROMPT = `You are processing voice commands for an aviation maintenance system. Extract the intent and entities from the user's speech.

Common intents:
- CREATE_WORK_ORDER: User wants to create a new maintenance work order
- UPDATE_STATUS: User wants to update the status of existing maintenance
- CHECK_SCHEDULE: User wants to check maintenance schedules or due dates
- FIND_AIRCRAFT: User wants to find information about specific aircraft
- UNKNOWN: Cannot determine user intent

Extract entities like:
- Aircraft tail numbers (e.g., N123AB, N456CD)
- Work order numbers
- Maintenance types (A-check, C-check, oil change, etc.)
- Priority levels (routine, urgent, AOG)
- Status updates (complete, in progress, waiting for parts)

Respond with structured JSON containing intent and entities.`;

// Helper function to generate maintenance recommendations
export async function generateMaintenanceRecommendation(
  aircraftData: any,
  maintenanceHistory: any[]
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: MAINTENANCE_ASSISTANT_PROMPT
        },
        {
          role: 'user',
          content: `Based on the following aircraft data and maintenance history, provide maintenance recommendations:
          
          Aircraft: ${JSON.stringify(aircraftData, null, 2)}
          Recent Maintenance: ${JSON.stringify(maintenanceHistory, null, 2)}
          
          Please provide:
          1. Upcoming maintenance priorities
          2. Any potential issues to monitor
          3. Parts that should be ordered proactively
          4. Compliance items that need attention`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    return response.choices[0]?.message?.content || 'Unable to generate recommendation';
  } catch (error) {
    console.error('Error generating maintenance recommendation:', error);
    throw new Error('Failed to generate maintenance recommendation');
  }
}

// Helper function to process voice commands
export async function processVoiceCommand(transcript: string): Promise<{
  intent: string;
  entities: Record<string, string>;
  confidence: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: VOICE_COMMAND_PROMPT
        },
        {
          role: 'user',
          content: `Process this voice command: "${transcript}"`
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(result);
  } catch (error) {
    console.error('Error processing voice command:', error);
    return {
      intent: 'UNKNOWN',
      entities: {},
      confidence: 0
    };
  }
}

// Helper function for maintenance chat assistance
export async function getChatResponse(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  context?: {
    aircraftTailNumber?: string;
    workOrderId?: string;
    currentUser?: string;
  }
): Promise<string> {
  try {
    const systemMessage = {
      role: 'system' as const,
      content: `${MAINTENANCE_ASSISTANT_PROMPT}
      
      Current context:
      ${context?.aircraftTailNumber ? `Aircraft: ${context.aircraftTailNumber}` : ''}
      ${context?.workOrderId ? `Work Order: ${context.workOrderId}` : ''}
      ${context?.currentUser ? `User: ${context.currentUser}` : ''}
      
      Provide helpful, accurate information while maintaining safety focus.`
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [systemMessage, ...messages],
      temperature: 0.4,
      max_tokens: 800
    });

    return response.choices[0]?.message?.content || 'I apologize, but I cannot provide a response at this time.';
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw new Error('Failed to generate response');
  }
} 