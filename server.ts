import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Explicitly load .env and log result
const envResult = dotenv.config();
if (envResult.error) {
  console.warn('💡 Tip: .env file not found or could not be loaded. If running locally, ensure .env exists in the root.');
}
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cron from 'node-cron';
import { z } from 'zod';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3008;
const JWT_SECRET = process.env.JWT_SECRET || 'expense-tracker-dev-secret-123';

if (process.env.JWT_SECRET) {
  console.log('✅ Success: JWT_SECRET loaded from .env file.');
} else {
  console.warn('⚠️ WARNING: JWT_SECRET is not set in .env. Using default development key.');
}

// --- Database Setup ---
const db = new Database('expense_tracker.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    is_credit_card BOOLEAN DEFAULT 0,
    from_account TEXT,
    to_account TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS recurring_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    day_of_month INTEGER NOT NULL,
    is_credit_card BOOLEAN DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Migration: Ensure transactions table has from_account and to_account columns
const tableInfo = db.prepare("PRAGMA table_info(transactions)").all() as any[];
const hasFromAccount = tableInfo.some(col => col.name === 'from_account');
const hasToAccount = tableInfo.some(col => col.name === 'to_account');
const hasIsCreditCard = tableInfo.some(col => col.name === 'is_credit_card');

if (!hasFromAccount) {
  console.log('Migrating: Adding from_account column to transactions table');
  db.exec("ALTER TABLE transactions ADD COLUMN from_account TEXT");
}
if (!hasToAccount) {
  console.log('Migrating: Adding to_account column to transactions table');
  db.exec("ALTER TABLE transactions ADD COLUMN to_account TEXT");
}
if (!hasIsCreditCard) {
  console.log('Migrating: Adding is_credit_card column to transactions table');
  db.exec("ALTER TABLE transactions ADD COLUMN is_credit_card BOOLEAN DEFAULT 0");
}

// --- Middleware ---
const app = express();
app.use(cors());
app.use(express.json());

// --- Auth Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// --- API Routes ---

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)');
    const info = stmt.run(email, hashedPassword, name);
    const token = jwt.sign({ id: Number(info.lastInsertRowid), email, name }, JWT_SECRET);
    res.json({ token, user: { id: Number(info.lastInsertRowid), email, name } });
  } catch (error) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: Number(user.id), email: user.email, name: user.name }, JWT_SECRET);
  res.json({ token, user: { id: Number(user.id), email: user.email, name: user.name } });
});

// Transactions
app.get('/api/transactions', authenticateToken, (req: any, res) => {
  const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC').all(req.user.id);
  res.json(transactions);
});

app.post('/api/transactions', authenticateToken, (req: any, res) => {
  try {
    const { type, amount, category, description, date, is_credit_card, from_account, to_account } = req.body;
    
    console.log('Attempting to add transaction:', { 
      userId: req.user?.id, 
      type, 
      amount, 
      category, 
      date,
      body: req.body 
    });

    // Basic validation
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User ID missing from token' });
    }

    if (!type || amount === undefined || isNaN(amount) || !date) {
      return res.status(400).json({ error: 'Missing or invalid required fields' });
    }

    const stmt = db.prepare(`
      INSERT INTO transactions (user_id, type, amount, category, description, date, is_credit_card, from_account, to_account)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      req.user.id, 
      type, 
      amount, 
      category || 'Other', // Default category if empty
      description || '', 
      date, 
      is_credit_card ? 1 : 0, 
      from_account || null, 
      to_account || null
    );
    
    res.json({ id: Number(info.lastInsertRowid) });
  } catch (error) {
    console.error('Database error in POST /api/transactions:', error);
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
  }
});

// Recurring Expenses
app.get('/api/recurring', authenticateToken, (req: any, res) => {
  const recurring = db.prepare('SELECT * FROM recurring_expenses WHERE user_id = ?').all(req.user.id);
  res.json(recurring);
});

app.post('/api/recurring', authenticateToken, (req: any, res) => {
  try {
    const { amount, category, description, day_of_month, is_credit_card } = req.body;
    
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User ID missing from token' });
    }

    if (amount === undefined || isNaN(amount) || !day_of_month) {
      return res.status(400).json({ error: 'Missing or invalid required fields' });
    }

    const stmt = db.prepare(`
      INSERT INTO recurring_expenses (user_id, amount, category, description, day_of_month, is_credit_card)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(req.user.id, amount, category || 'Other', description || '', day_of_month, is_credit_card ? 1 : 0);
    
    // Check if we should add it for the current month immediately
    const today = new Date();
    const currentDay = today.getDate();
    if (day_of_month <= currentDay) {
      const dateStr = today.toISOString().slice(0, 10);
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, category, description, date, is_credit_card)
        VALUES (?, 'expense', ?, ?, ?, ?, ?)
      `).run(req.user.id, amount, category || 'Other', `[Auto] ${description || ''}`, dateStr, is_credit_card ? 1 : 0);
    }

    res.json({ id: Number(info.lastInsertRowid) });
  } catch (error) {
    console.error('Database error in POST /api/recurring:', error);
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/recurring/:id', authenticateToken, (req: any, res) => {
  const stmt = db.prepare('DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?');
  stmt.run(req.params.id, req.user.id);
  res.json({ success: true });
});

// Stats
app.get('/api/stats', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
  
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(now.getMonth() - 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);

  const getMonthStats = (month: string) => {
    const income = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'income' AND date LIKE ?").get(userId, `${month}%`) as any;
    const expense = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date LIKE ?").get(userId, `${month}%`) as any;
    const categories = db.prepare("SELECT category as name, SUM(amount) as value FROM transactions WHERE user_id = ? AND type = 'expense' AND date LIKE ? GROUP BY category").all(userId, `${month}%`) as any[];
    
    return {
      income: income?.total || 0,
      expense: expense?.total || 0,
      savings: (income?.total || 0) - (expense?.total || 0),
      categories: categories || []
    };
  };

  const currentStats = getMonthStats(currentMonth);
  const previousStats = getMonthStats(lastMonth);

  res.json({ current: currentStats, previous: previousStats });
});

// --- Recurring Job ---
// Run every day at midnight
cron.schedule('0 0 * * *', () => {
  console.log('Running recurring expenses check...');
  const today = new Date();
  const dayOfMonth = today.getDate();
  const dateStr = today.toISOString().slice(0, 10);

  const recurring = db.prepare('SELECT * FROM recurring_expenses WHERE day_of_month = ?').all(dayOfMonth) as any[];
  
  for (const item of recurring) {
    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, category, description, date, is_credit_card)
      VALUES (?, 'expense', ?, ?, ?, ?, ?)
    `).run(item.user_id, item.amount, item.category, `[Auto] ${item.description}`, dateStr, item.is_credit_card);
  }
});

// --- Vite Integration ---
async function startServer() {
  const root = process.cwd();
  
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: true 
      },
      appType: 'spa',
      root: root,
    });
    
    // Use vite's connect instance as middleware
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(root, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Project root: ${root}`);
  });
}

startServer();
