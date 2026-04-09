export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  openaiApiUrl: process.env.OPENAI_API_URL ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "",
  procfyApiToken: process.env.PROCFY_API_TOKEN ?? "",
  procfyBaseUrl: process.env.PROCFY_BASE_URL ?? "https://api.procfy.io/api/v1",
};
