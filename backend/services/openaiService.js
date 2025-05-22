import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getConversationHistory, addToConversationHistory } from './conversationHistory.js'; // Assuming shared history
import { getAllItemsForAI } from './localStorageService.js'; // Import function to get items

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY;
let openai;

if (openaiApiKey) {
  openai = new OpenAI({ apiKey: openaiApiKey });
} else {
  console.warn('OpenAI API key not found. OpenAI service will not be available.');
}

const defaultOpenAIModel = "gpt-3.5-turbo"; 

export const getOpenAIConfig = () => {
  return {
    apiKeySet: !!openaiApiKey,
    model: defaultOpenAIModel, 
  };
};

export const generateOpenAIResponse = async (prompt, history = [], systemInstructions = "You are a helpful assistant.", modelToUse = defaultOpenAIModel) => {
  if (!openai) {
    return { status: false, error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in .env file.' };
  }

  // Fetch items data
  const items = await getAllItemsForAI();
  let itemsContext = "";
  if (items.length > 0) {
    itemsContext = "\n\nBerikut adalah daftar produk/layanan yang tersedia:\n" +
                     items.map(item => `- ${item.name}: ${item.description}${item.price ? ` (Harga: Rp${item.price.toLocaleString('id-ID')})` : ''} [Tipe: ${item.type}]`).join("\n");
  } else {
    itemsContext = "\n\nSaat ini tidak ada informasi produk/layanan yang tersedia.";
  }
  const finalSystemInstructions = systemInstructions + itemsContext;


  const messages = [
    { role: "system", content: finalSystemInstructions }, 
    ...history.map(item => ({ role: item.role, content: item.content })),
    { role: "user", content: prompt },
  ];
  
  console.log('--- OPENAI: SYSTEM INSTRUCTION BEING USED ---');
  console.log(finalSystemInstructions); // Log the combined instructions
  console.log('---------------------------------------------');
  console.log('--- OPENAI: USER PROMPT TO MODEL ---');
  console.log(prompt);
  console.log('------------------------------------');

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse, 
      messages: messages,
    });

    const responseText = completion.choices[0]?.message?.content || null; // Return null if no content
    
    if (!responseText) {
      return { status: false, error: "No response content from OpenAI.", text: null, history };
    }
    
    return {
      status: true,
      text: responseText,
      history: [...history, { role: 'user', content: prompt }, { role: 'assistant', content: responseText }],
    };
  } catch (error) {
    console.error('Error generating OpenAI response:', error);
    let errorMessage = 'Failed to generate response from OpenAI.';
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage = error.response.data.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return { status: false, error: errorMessage, text: null, history };
  }
};

export const processMessage = async (message, sender = null, systemInstructions = "You are a helpful assistant.", modelToUse = defaultOpenAIModel) => {
  const config = getOpenAIConfig(); 

  if (!config.apiKeySet) {
    console.log('No OpenAI API key configured, skipping processing by OpenAI.');
    return { status: false, text: null, error: 'OpenAI API key not configured.' };
  }

  try {
    let historyForGeneration = [];
    if (sender) {
      historyForGeneration = getConversationHistory(sender); 
    }

    // Do not add user message to history here, generateOpenAIResponse will include it for its context
    // but the actual saving to persistent history happens after a successful response.
    
    console.log(`(processMessage OpenAI): Sending history (length: ${historyForGeneration.length}) to generateOpenAIResponse for sender: ${sender}`);
    const response = await generateOpenAIResponse(message, historyForGeneration, systemInstructions, modelToUse);

    if (!response.status || !response.text) {
      console.error('Error generating OpenAI response in processMessage:', response.error);
      return { status: false, text: null, error: response.error || 'Failed to get text from OpenAI.' };
    }

    if (sender) {
      // Add both user message and AI response to history after successful generation
      addToConversationHistory(sender, 'user', message);
      addToConversationHistory(sender, 'assistant', response.text);
    }
    return { status: true, text: response.text };
  } catch (error) {
    console.error('Error processing message with OpenAI:', error);
    return { status: false, text: null, error: 'Maaf, terjadi kesalahan saat memproses pesan Anda dengan OpenAI.' };
  }
};