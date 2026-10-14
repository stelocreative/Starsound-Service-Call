"use client";

import { createContext, useContext } from "react";
import type { CurrentUser } from "@/lib/types";

const CurrentUserContext = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUser {
  const user = useContext(CurrentUserContext);
  if (!user) throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  return user;
}
