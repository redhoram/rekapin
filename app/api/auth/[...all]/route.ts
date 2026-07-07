import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Mounts the Better Auth handler for all /api/auth/* routes.
export const { GET, POST } = toNextJsHandler(auth);
