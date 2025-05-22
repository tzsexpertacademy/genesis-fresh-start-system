import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { getConversationHistory, addToConversationHistory } from './conversationHistory.js'; // Assuming shared history
import { getAllItemsForAI } from './localStorageService.js'; // Import function to get items

dotenv.config();

const groqApiKey = process.env.GROQ_API_KEY;
let groq;

if (groqApiKey) {
  groq = new Groq({ apiKey: groqApiKey });
} else {
  console.warn('Groq API key not found. Groq service will not be available.');
}

const defaultGroqModel = "llama3-8b-8192"; 

export const getGroqConfig = () => {
  return {
    apiKeySet: !!groqApiKey,
    model: defaultGroqModel,
  };
};

export const generateGroqResponse = async (prompt, history = [], systemInstructions = "You are a helpful assistant.") => {
  if (!groq) {
    return { status: false, error: 'Groq API key not configured. Please set GROQ_API_KEY in .env file.' };
  }
  
  // Fetch items data
  const items = await getAllItemsForAI();
  let itemsContext = "";
  if (items.length > 0) {
    itemsContext = "\n\nBerikut adalah daftar produk/layanan yang tersedia:\n" +
                     items.map(item => `- ${item.name}: ${item.description}${item.price ? ` (Harga: Rp${item.price.toLocaleString('id-ID')})` : ''} [Tipe: ${item.type}]`).join("\n");
  } else {
    itemsContext = "\n\nSaat ini tidak ada informasi produk/layanan yang tersedia. Jika Pengguna tidak menanyakan produk atau layanan atau jasa tidak perlu untuk menjawab mengenai itu jawab saja sebagai chatbot biasa";
  }
  const finalSystemInstructions = systemInstructions + itemsContext;

  const userPromptForModel = `Pertanyaan Pengguna (jawab dalam Bahasa Indonesia): ${prompt}`;
  
  console.log('--- GROQ: SYSTEM INSTRUCTION BEING USED (generateGroqResponse - as system message) ---');
  console.log(finalSystemInstructions); // Log the combined instructions
  console.log('-----------------------------------------------------------------');
  console.log('--- GROQ: USER PROMPT TO MODEL ---');
  console.log(userPromptForModel);
  console.log('-------------------------------------------------------------');

  const messages = [
    { role: "system", content: finalSystemInstructions }, 
    ...history.map(item => ({ role: item.role, content: item.content })),
    { role: "user", content: userPromptForModel }, 
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: defaultGroqModel,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || null; // Return null if no content
    
    if (!responseText) {
      return { status: false, error: "No response content from Groq.", text: null, history };
    }
    
    return {
      status: true,
      text: responseText,
      history: [...history, { role: 'user', content: prompt }, { role: 'assistant', content: responseText }], 
    };
  } catch (error) {
    console.error('Error generating Groq response:', error);
    let errorMessage = 'Failed to generate response from Groq.';
    if (error.message) {
      errorMessage = error.message;
    }
    return { status: false, error: errorMessage, text: null, history };
  }
};

export const processMessage = async (message, sender = null, systemInstructions = "You are a helpful assistant.") => {
  const config = getGroqConfig();

  if (!config.apiKeySet) {
    console.log('No Groq API key configured, skipping processing by Groq.');
    return { status: false, text: null, error: 'Groq API key not configured.' };
  }

  try {
    let historyForGeneration = [];
    if (sender) {
      historyForGeneration = getConversationHistory(sender); 
    }
    
    console.log(`(processMessage Groq): Sending history (length: ${historyForGeneration.length}) to generateGroqResponse for sender: ${sender}`);
    const response = await generateGroqResponse(message, historyForGeneration, systemInstructions);

    if (!response.status || !response.text) {
      console.error('Error generating Groq response in processMessage:', response.error);
      return { status: false, text: null, error: response.error || 'Failed to get text from Groq.' };
    }

    if (sender) {
      addToConversationHistory(sender, 'user', message); // Save user message
      addToConversationHistory(sender, 'assistant', response.text); // Save AI response
    }
    return { status: true, text: response.text };
  } catch (error) {
    console.error('Error processing message with Groq:', error);
    return { status: false, text: null, error: 'Maaf, terjadi kesalahan saat memproses pesan Anda dengan Groq.' };
  }
};