import { auth, authHandlersReady } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const authUnavailable = () =>
  Response.json(
    {
      error: "Auth is not configured",
    },
    { status: 503 }
  );

const handlers = authHandlersReady ? toNextJsHandler(auth) : null;

export const GET = handlers?.GET ?? authUnavailable;
export const POST = handlers?.POST ?? authUnavailable;
