require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const app = express();
const db = new Database(process.env.DB_PATH || 'licenses.db');

db.exec(`CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY,
  email TEXT,
  username TEXT,
  product_id TEXT,
  prefix TEXT,
  license_key TEXT,
  stripe_event_id TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

app.use(express.json());

app.post('/create-checkout', async (req, res) => {
  try {
    const { email, username, plan } = req.body;
    if (!email || !plan) return res.status(400).json({ error: 'missing fields' });

    const priceId = plan === 'pro' ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_PERSONAL;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { username, plan },
      success_url: `${process.env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: process.env.CANCEL_URL
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Webhook: raw body required for signature verification
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const plan = session.metadata?.plan || 'personal';
    const prefix = plan === 'pro' ? 'Pro' : 'Personal';
    const username = session.metadata?.username || (session.customer_email || '').split('@')[0];
    const email = session.customer_email || session.metadata?.email || null;

    const licenseKey = `${prefix}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    try {
      const stmt = db.prepare(`INSERT INTO licenses (email, username, product_id, prefix, license_key, stripe_event_id)
        VALUES (?, ?, ?, ?, ?, ?)`);
      stmt.run(email, username, plan, prefix, licenseKey, event.id);
      console.log('License created for', email, licenseKey);
      // Optionally send email here
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        console.log('Duplicate event, already processed', event.id);
      } else {
        console.error('DB error', err);
      }
    }
  }

  res.json({ received: true });
});

// Fetch latest license by email (protect in prod)
app.get('/license', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email required' });
  const row = db.prepare('SELECT license_key, prefix, created_at FROM licenses WHERE email = ? ORDER BY created_at DESC LIMIT 1').get(email);
  if (!row) return res.status(404).json({ error: 'no license found' });
  res.json({ license: row.license_key, prefix: row.prefix, created_at: row.created_at });
});

const port = process.env.PORT || 4242;
app.listen(port, () => console.log(`Server listening on ${port}`));
