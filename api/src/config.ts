// En dev, la configuration vient de api/.env ; en production, de l'hébergeur.
// Ce module doit être importé avant tout code qui lit process.env.
try {
  process.loadEnvFile();
} catch {
  // Pas de .env : on garde l'environnement tel quel
}

export const {
  DATABASE_URL,
  AI_BASE_URL,
  AI_MODEL,
  AI_API_KEY = '',
} = process.env;
export const PORT = Number(process.env.PORT ?? 3000);
