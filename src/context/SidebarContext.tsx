import React, { createContext, useContext, useState, ReactNode } from 'react';

type SidebarContextType = {
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileOpen: boolean;
  setIsMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isHovered: boolean;
  setIsHovered: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

type SidebarProviderProps = {
  children: ReactNode;
};

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const toggleSidebar = () => {
    setIsExpanded(prev => !prev);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(prev => !prev);
  };

  return (
    <SidebarContext.Provider
      value={{
        isExpanded,
        setIsExpanded,
        isMobileOpen,
        setIsMobileOpen,
        isHovered,
        setIsHovered,
        toggleSidebar,
        toggleMobileSidebar
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
