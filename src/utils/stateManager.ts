/**
 * State Manager Utility
 *
 * This utility helps manage state updates across the application
 * to prevent unnecessary re-renders and sidebar refreshes.
 */

// Store for active components
interface ActiveComponents {
  geminiChat: boolean;
  inbox: boolean;
  dashboard: boolean;
}

// Store for pending updates
interface PendingUpdates {
  inbox: boolean;
  messages: boolean;
  status: boolean;
}

// Debounce timers
interface DebouncedActions {
  [key: string]: number;
}

// Global state
const state = {
  activeComponents: {
    geminiChat: false,
    inbox: false,
    dashboard: false
  } as ActiveComponents,
  pendingUpdates: {
    inbox: false,
    messages: false,
    status: false
  } as PendingUpdates,
  isProcessing: false,
  lastUpdateTime: Date.now(),
  debouncedActions: {} as DebouncedActions,
  processingStartTime: 0,
  lastApiRequestTime: Date.now()
};

/**
 * Register a component as active
 * @param component Component name
 */
export const registerComponent = (component: keyof ActiveComponents): void => {
  state.activeComponents[component] = true;

  // Store in sessionStorage for cross-component communication
  sessionStorage.setItem('active_component', component);
  sessionStorage.setItem(`${component}_active`, 'true');
};

/**
 * Unregister a component
 * @param component Component name
 */
export const unregisterComponent = (component: keyof ActiveComponents): void => {
  state.activeComponents[component] = false;

  // Clean up sessionStorage
  if (sessionStorage.getItem('active_component') === component) {
    sessionStorage.removeItem('active_component');
  }
  sessionStorage.removeItem(`${component}_active`);
};

/**
 * Check if a component is active
 * @param component Component name
 * @returns boolean
 */
export const isComponentActive = (component: keyof ActiveComponents): boolean => {
  // Check both local state and sessionStorage
  return state.activeComponents[component] ||
    sessionStorage.getItem(`${component}_active`) === 'true';
};

/**
 * Set processing state
 * @param isProcessing Processing state
 */
// Track processing state changes
let processingTimeoutId: number | null = null;
let lastProcessingChange = 0;
let processingDebounceActive = false;
const PROCESSING_DEBOUNCE_TIME = 1000; // 1 second debounce time

export const setProcessing = (isProcessing: boolean): void => {
  const now = Date.now();

  // If the current state already matches what we're trying to set, do nothing
  if (state.isProcessing === isProcessing) {
    return;
  }

  // Debounce rapid changes
  if (now - lastProcessingChange < PROCESSING_DEBOUNCE_TIME) {
    // Only set the processing state if we're turning it on
    // This ensures we don't prematurely turn off processing state
    if (isProcessing && !processingDebounceActive) {
      processingDebounceActive = true;

      // Update the state immediately when turning processing on
      state.isProcessing = true;
      state.processingStartTime = now;
      sessionStorage.setItem('global_processing', 'true');
      sessionStorage.setItem('processing_start_time', state.processingStartTime.toString());

      // Add CSS classes
      if (!document.body.classList.contains('no-transitions')) {
        document.body.classList.add('no-transitions');
      }
      if (state.activeComponents.geminiChat) {
        document.body.classList.add('gemini-chat-active');
      }

      // Schedule the debounce to end
      if (processingTimeoutId !== null) {
        clearTimeout(processingTimeoutId);
      }

      processingTimeoutId = window.setTimeout(() => {
        processingDebounceActive = false;
        lastProcessingChange = Date.now();
        processingTimeoutId = null;
      }, PROCESSING_DEBOUNCE_TIME);
    }

    return;
  }

  // Update the last change timestamp
  lastProcessingChange = now;

  // Update the state
  state.isProcessing = isProcessing;

  if (isProcessing) {
    // Store the processing start time in memory for faster access
    state.processingStartTime = now;

    // Also store in sessionStorage for cross-component communication
    sessionStorage.setItem('global_processing', 'true');
    sessionStorage.setItem('processing_start_time', state.processingStartTime.toString());

    // Add a CSS class to the body to disable transitions
    if (!document.body.classList.contains('no-transitions')) {
      document.body.classList.add('no-transitions');
    }

    // Add a class to indicate we're in a Gemini chat
    if (state.activeComponents.geminiChat) {
      document.body.classList.add('gemini-chat-active');
    }
  } else {
    // Only turn off processing if we're not in a debounce period
    if (!processingDebounceActive) {
      state.processingStartTime = 0;
      sessionStorage.removeItem('global_processing');
      sessionStorage.removeItem('processing_start_time');

      // Clear any existing timeout
      if (processingTimeoutId !== null) {
        clearTimeout(processingTimeoutId);
        processingTimeoutId = null;
      }

      // Remove the CSS class after a delay to ensure all DOM updates are complete
      processingTimeoutId = window.setTimeout(() => {
        document.body.classList.remove('no-transitions');
        processingTimeoutId = null;
      }, 500);
    }
  }
};

/**
 * Check if the application is currently processing
 * @returns boolean
 */
export const isProcessing = (): boolean => {
  // First check memory state for faster access
  if (state.isProcessing) return true;

  // Then check sessionStorage as fallback
  const isProcessingInSession = sessionStorage.getItem('global_processing') === 'true';

  // If processing state is found in sessionStorage but not in memory, sync them
  if (isProcessingInSession && !state.isProcessing) {
    state.isProcessing = true;
    const startTimeStr = sessionStorage.getItem('processing_start_time');
    state.processingStartTime = startTimeStr ? parseInt(startTimeStr) : Date.now();
  }

  return isProcessingInSession;
};

/**
 * Schedule an update for a specific type
 * @param updateType Update type
 */
export const scheduleUpdate = (updateType: keyof PendingUpdates): void => {
  state.pendingUpdates[updateType] = true;
  state.lastUpdateTime = Date.now();

  // Store in sessionStorage
  sessionStorage.setItem(`pending_update_${updateType}`, 'true');
  sessionStorage.setItem('last_update_time', state.lastUpdateTime.toString());
};

/**
 * Check if an update is pending
 * @param updateType Update type
 * @returns boolean
 */
export const isUpdatePending = (updateType: keyof PendingUpdates): boolean => {
  // Check both local state and sessionStorage
  return state.pendingUpdates[updateType] ||
    sessionStorage.getItem(`pending_update_${updateType}`) === 'true';
};

/**
 * Clear a pending update
 * @param updateType Update type
 */
export const clearPendingUpdate = (updateType: keyof PendingUpdates): void => {
  state.pendingUpdates[updateType] = false;
  sessionStorage.removeItem(`pending_update_${updateType}`);
};

/**
 * Check if we should throttle updates
 * @param minInterval Minimum interval between updates in ms
 * @returns boolean
 */
export const shouldThrottleUpdates = (minInterval: number = 5000): boolean => {
  // First check memory state for faster access
  const now = Date.now();
  const timeSinceLastUpdate = now - state.lastUpdateTime;

  if (timeSinceLastUpdate < minInterval) {
    return true;
  }

  // Then check sessionStorage as fallback
  const lastUpdateTimeFromSession = parseInt(sessionStorage.getItem('last_update_time') || '0');
  const timeSinceLastUpdateFromSession = now - lastUpdateTimeFromSession;

  return timeSinceLastUpdateFromSession < minInterval;
};

/**
 * Debounce a function call with improved handling and reduced UI flickering
 * @param actionKey Unique key for the action
 * @param debounceTime Time to debounce in ms
 * @returns boolean - true if the action should proceed, false if it was debounced
 */
export const debounce = (actionKey: string, debounceTime: number = 1000): boolean => {
  const now = Date.now();

  // Special handling for UI-related actions to prevent flickering
  const isUiAction = actionKey.includes('slider_') ||
                     actionKey.includes('gemini_settings') ||
                     actionKey.includes('send_button');

  // Special handling for save actions - we want to be more permissive
  const isSaveAction = actionKey.includes('update_config') ||
                      actionKey.includes('save_');

  // Adjust debounce times based on action type
  let effectiveDebounceTime = debounceTime;

  // UI actions need longer debounce to prevent flickering
  if (isUiAction) {
    effectiveDebounceTime = Math.max(debounceTime, 300);
  }

  // Save actions need shorter debounce to be more responsive
  if (isSaveAction) {
    effectiveDebounceTime = Math.min(debounceTime, 800);
  }

  // Check if we have a pending debounce for this action
  if (state.debouncedActions[actionKey]) {
    const timeSinceLastCall = now - state.debouncedActions[actionKey];

    // If not enough time has passed, debounce the action
    if (timeSinceLastCall < effectiveDebounceTime) {
      // For UI actions, we want to prevent rapid updates completely
      if (isUiAction && timeSinceLastCall < 100) {
        return false;
      }

      // For save actions, use a very short debounce to prevent double-clicks
      // but still allow intentional repeated saves
      if (isSaveAction && timeSinceLastCall > 500) {
        // Allow save actions after 500ms even if within debounce period
        // This makes the UI more responsive for intentional saves
        state.debouncedActions[actionKey] = now;
        return true;
      }

      // For other actions, use the standard debounce logic
      return false;
    }
  }

  // Update the timestamp and allow the action to proceed
  state.debouncedActions[actionKey] = now;

  // Clean up old debounced actions to prevent memory leaks
  // Only do this occasionally to reduce processing overhead
  if (now % 10 === 0) { // Only clean up ~10% of the time
    const oldestAllowedTime = now - 60000; // 1 minute
    Object.keys(state.debouncedActions).forEach(key => {
      if (state.debouncedActions[key] < oldestAllowedTime) {
        delete state.debouncedActions[key];
      }
    });
  }

  return true;
};

/**
 * Track API request timing to prevent too many requests
 * @param endpoint API endpoint
 * @param minInterval Minimum interval between requests to the same endpoint
 * @returns boolean - true if the request should proceed, false if it should be skipped
 */
export const shouldMakeApiRequest = (endpoint: string, minInterval: number = 2000): boolean => {
  // Never throttle Gemini API validation requests
  if (endpoint === '/gemini/validate-key') {
    return true;
  }

  const now = Date.now();
  const actionKey = `api_${endpoint}`;

  // Use the debounce function to check if we should make the request
  return debounce(actionKey, minInterval);
};

/**
 * Prevent page refresh during processing
 * This should be called in a useEffect
 * @returns Cleanup function
 *
 * NOTE: We've disabled this functionality to prevent annoying prompts
 * when refreshing the page
 */
export const preventRefreshDuringProcessing = (): () => void => {
  // Return an empty cleanup function
  return () => {};
};

export default {
  registerComponent,
  unregisterComponent,
  isComponentActive,
  setProcessing,
  isProcessing,
  scheduleUpdate,
  isUpdatePending,
  clearPendingUpdate,
  shouldThrottleUpdates,
  debounce,
  shouldMakeApiRequest,
  preventRefreshDuringProcessing
};
