import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  secret: import.meta.env.BETTER_AUTH_SECRET || '',
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: import.meta.env.GOOGLE_CLIENT_ID || '',
      clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
});
