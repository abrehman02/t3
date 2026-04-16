import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import db from "./db";

const requiredAuthEnvVars = [
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "DATABASE_URL",
];

const missingAuthEnvVars = requiredAuthEnvVars.filter(
  (envVar) => !process.env[envVar]
);

export const authHandlersReady = missingAuthEnvVars.length === 0;

if (!authHandlersReady) {
  console.warn(
    `Auth not initialized - missing env: ${missingAuthEnvVars.join(", ")}`
  );
}

const socialProviders = {};

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

const disabledAuth = {
  api: {
    getSession: async () => null,
  },
};

export const auth = authHandlersReady
  ? betterAuth({
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.BETTER_AUTH_URL,
      database: prismaAdapter(db, {
        provider: "postgresql",
      }),
      socialProviders,
    })
  : disabledAuth;
