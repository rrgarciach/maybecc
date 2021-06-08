const postgres = require('postgres');

const sql = postgres({
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

async function createSchema() {
  await sql`
  CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(32) NOT NULL,
    amount NUMERIC(16) NOT NULL,
    balance NUMERIC(16),
    apply_date DATE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    details JSONB default '{}' NOT NULL
  );
  `
}

async function selectAll(limit = 20, offset = 0) {
  const transactions = await sql`
  SELECT id, category, amount, balance, (amount / 100) AS dollars_amount, (balance / 100) AS dollars_balance, apply_date, details
  FROM transactions
  ORDER BY apply_date, id
  LIMIT ${limit} OFFSET ${offset}
  `
  console.log(transactions);
  return transactions;
}

async function currentBalance() {
  const balance = await sql`
  SELECT balance, (balance / 100) AS dollars_balance
  FROM transactions
  ORDER BY apply_date DESC, id DESC
  LIMIT 1
  `
  console.log(balance);
  return balance;
}

async function endEndOfMonthBalanceReport() {
  const report = await sql`
  SELECT balance, (balance / 100) AS dollars_balance
  FROM transactions
  WHERE apply_date 
    BETWEEN (EXTRACT(MONTH FROM CURRENT_TIMESTAMP::DATE) + INTERVAL '-1 MONTH 1 day') 
    AND (EXTRACT(MONTH FROM CURRENT_TIMESTAMP::DATE) + INTERVAL '1 MONTH -1 day')
  ORDER BY apply_date DESC, id DESC
  LIMIT 1
  `
  console.log(report);
  return report;
}

async function insert(data) {
  const [transaction] = await sql`
  INSERT INTO transactions 
  (category, amount, apply_date, details)
  VALUES (
  '${sql(data.category)}',
  ${sql(data.amount*100)},
  '${sql(data.apply_date)}',
  ${sql.json(data.details)}
  )
  RETURNING *
  `
  const [balance] = await sql`
  UPDATE transactions SET balance = balance.sum
  FROM (
    SELECT id, apply_date, SUM(amount) OVER (ORDER BY apply_date, id ASC) AS sum
    FROM transactions t 
    GROUP BY id
  ) AS balance
  WHERE balance.apply_date >= '${sql(data.apply_date)}'::DATE 
  AND balance.id = transactions.id
  RETURNING *
  `
  return [transaction, balance];
}

const transactions = [
  {
    category: 'bank',
    amount: 100, // stored as cents
    apply_date: '2021-03-12',
    details: {
      type: 'deposit',
      account_number: 123456789,
      concept: 'payroll',
    },
  },
  {
    category: 'bank',
    amount: 50, // stored as cents
    apply_date: '2021-03-13',
    details: {
      type: 'deposit',
      account_number: 123456789,
      concept: 'refund',
    },
  },
  {
    category: 'bank',
    amount: -30, // stored as cents
    apply_date: '2021-03-14',
    details: {
      type: 'withdrawal',
      account_number: 123456789,
      concept: 'payment',
    },
  },
  {
    category: 'crypto',
    amount: 130, // stored as cents
    apply_date: '2021-03-14',
    details: {
      portfolio: 'bitcoin',
      value: 53,
    },
  },
  {
    category: 'crypto',
    amount: -10, // stored as cents
    apply_date: '2021-03-10',
    details: {
      portfolio: 'bitcoin',
      value: 28,
    },
  },
  {
    category: 'crypto',
    amount: 47, // stored as cents
    apply_date: '2021-03-15',
    details: {
      portfolio: 'bitcoin',
      value: 40,
    },
  },
];

createSchema()
  .then(async () => {
    await Promise.all(transactions.map(insert));
    await selectAll();
    await currentBalance();
    // await endEndOfMonthBalanceReport();
  });
