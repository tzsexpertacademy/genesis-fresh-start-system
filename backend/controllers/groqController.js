import { generateGroqResponse as generateGroqServiceResponse } from '../services/groqService.js';
import { getConfig as getFullAiConfig } from '../services/gemini.js'; // To get all AI settings, including instructions

export const getConfig = (req, res) => {
  // Note: This getConfig is for Groq-specific client-side needs, like knowing if API key is set.
  // It does not return system instructions, as those are handled server-side for generation.
  try {
    // For client-side, we only need to know if API key is set and the model name.
    // The actual API key and detailed config are managed server-side.
    const groqServiceConfig = getFullAiConfig(); // Get the main AI config
    res.json({
      status: true,
      message: 'Groq configuration retrieved successfully',
      data: { 
        config: {
          apiKeySet: !!process.env.GROQ_API_KEY, // Check .env directly for API key status
          model: groqServiceConfig.groqModel || "llama3-8b-8192" // Provide a default if not set
        } 
      },
    });
  } catch (error) {
    console.error('Error getting Groq config:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get Groq configuration',
      error: error.message,
    });
  }
};

export const generateResponse = async (req, res) => {
  try {
    const { prompt, history } = req.body;

    if (!prompt) {
      return res.status(400).json({ status: false, message: 'Prompt is required' });
    }

    const aiConfig = getFullAiConfig(); // Get the full AI configuration
    let systemInstructionsToUse = aiConfig.instructions; // Default to global instructions

    if (aiConfig.groqSpecificInstructions && aiConfig.groqSpecificInstructions.trim() !== '') {
      systemInstructionsToUse = aiConfig.groqSpecificInstructions;
      console.log("Using Groq-specific instructions for chat.");
    } else {
      console.log("Using global instructions for Groq chat.");
    }
    
    console.log(`Groq direct chat using instructions: "${systemInstructionsToUse.substring(0,50)}..."`);

    const result = await generateGroqServiceResponse(prompt, history || [], systemInstructionsToUse);

    if (result.error) {
      return res.status(400).json({ status: false, message: result.error });
    }

    res.json({
      status: true,
      message: 'Groq response generated successfully',
      data: { response: result.text, history: result.history },
    });
  } catch (error) {
    console.error('Error generating Groq response:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to generate Groq response',
      error: error.message,
    });
  }
};