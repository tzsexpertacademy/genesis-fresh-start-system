// Simple transition utilities without complex functionality
export const transitionUtils = {
  disableTransitions: (duration: number = 500) => {
    // Simple disable transitions - can be enhanced later
    console.log(`Disabling transitions for ${duration}ms`);
  },
  
  enableTransitions: () => {
    // Simple enable transitions - can be enhanced later
    console.log('Enabling transitions');
  }
};

export default transitionUtils;