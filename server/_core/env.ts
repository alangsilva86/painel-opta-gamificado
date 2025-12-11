export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  openaiApiUrl: process.env.OPENAI_API_URL ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
};
