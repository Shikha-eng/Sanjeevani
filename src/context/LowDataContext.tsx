"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface LowDataContextType {
  isLowDataMode: boolean;
  toggleLowDataMode: () => void;
}

const LowDataContext = createContext<LowDataContextType | undefined>(undefined);

export const LowDataProvider = ({ children }: { children: ReactNode }) => {
  const [isLowDataMode, setIsLowDataMode] = useState(false);

  const toggleLowDataMode = () => {
    setIsLowDataMode((prev) => !prev);
  };

  return (
    <LowDataContext.Provider value={{ isLowDataMode, toggleLowDataMode }}>
      {children}
    </LowDataContext.Provider>
  );
};

export const useLowData = () => {
  const context = useContext(LowDataContext);
  if (context === undefined) {
    throw new Error("useLowData must be used within a LowDataProvider");
  }
  return context;
};
