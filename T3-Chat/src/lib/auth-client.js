import { createAuthClient } from "better-auth/react";

const clientBaseURL =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : undefined)
    : "http://localhost:3000";

export const { signIn, signUp, useSession, signOut } = createAuthClient({
  baseURL: clientBaseURL || "http://localhost:3000",
});
