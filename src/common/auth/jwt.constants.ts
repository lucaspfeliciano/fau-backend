export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  expiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 28800),
} as const;
