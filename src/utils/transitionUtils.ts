/**
 * Transition Utilities
 * 
 * Helper functions to manage transitions and animations
 */

/**
 * Temporarily disable transitions on the page
 * This is useful when making DOM changes that might cause unwanted animations
 * 
 * @param duration Duration in milliseconds to disable transitions
 */
export const disableTransitions = (duration: number = 300): void => {
  // Add a class to disable transitions
  document.body.classList.add('no-transitions');
  
  // Remove the class after the specified duration
  setTimeout(() => {
    document.body.classList.remove('no-transitions');
  }, duration);
};

/**
 * Add a class to indicate Gemini chat is active
 * This applies special styles to prevent flickering in the Gemini chat UI
 * 
 * @param isActive Whether Gemini chat is active
 */
export const setGeminiChatActive = (isActive: boolean): void => {
  if (isActive) {
    document.body.classList.add('gemini-chat-active');
  } else {
    document.body.classList.remove('gemini-chat-active');
  }
};

export default {
  disableTransitions,
  setGeminiChatActive
};
