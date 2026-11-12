import pg from 'pg';
import { DATABASE_URL } from './config.js';

export const db = new pg.Pool({ connectionString: DATABASE_URL });
