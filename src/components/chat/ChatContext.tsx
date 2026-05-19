"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ChatPageContext = {
  propertySlug?: string;
  propertyName?: string;
};

type ChatContextValue = {
  context: ChatPageContext;
  setContext: (context: ChatPageContext) => void;
  clearContext: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<ChatPageContext>({});
  const clearContext = useCallback(() => setContext({}), []);
  const value = useMemo(
    () => ({
      context,
      setContext,
      clearContext,
    }),
    [clearContext, context],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatPageContext() {
  return useContext(ChatContext);
}
