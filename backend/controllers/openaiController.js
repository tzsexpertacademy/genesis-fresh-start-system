import { generateOpenAIResponse as generateOpenAIServiceResponse } from '../services/openaiService.js';
import { getConfig as getFullAiConfig } from '../services/gemini.js'; // To get all AI settings

export const getConfig = (req, res) => {
  try {
    const aiConfig = getFullAiConfig(); // Get the main AI config
    res.json({
      status: true,
      message: 'OpenAI configuration retrieved successfully',
      data: { 
        config: {
          apiKeySet: !!process.env.OPENAI_API_KEY, // Direct check from .env
          model: aiConfig.openaiModel || "gpt-3.5-turbo" // Get model from central config
        }
      },
    });
  } catch (error) {
    console.error('Error getting OpenAI config:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get OpenAI configuration',
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
    const modelToUse = aiConfig.openaiModel || "gpt-3.5-turbo"; // Get OpenAI model from config

    if (aiConfig.openaiSpecificInstructions && aiConfig.openaiSpecificInstructions.trim() !== '') {
      systemInstructionsToUse = aiConfig.openaiSpecificInstructions;
      console.log("Using OpenAI-specific instructions for chat.");
    } else {
      console.log("Using global instructions for OpenAI chat.");
    }
    
    console.log(`OpenAI direct chat using instructions: "${systemInstructionsToUse.substring(0,50)}..." on model ${modelToUse}`);

    const result = await generateOpenAIServiceResponse(prompt, history || [], systemInstructionsToUse, modelToUse);

    if (result.error) {
      return res.status(400).json({ status: false, message: result.error });
    }

    res.json({
      status: true,
      message: 'OpenAI response generated successfully',
      data: { response: result.text, history: result.history },
    });
  } catch (error) {
    console.error('Error generating OpenAI response:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to generate OpenAI response',
      error: error.message,
    });
  }
};