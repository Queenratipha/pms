require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const session  = require('express-session');
const bcrypt   = require('bcryptjs');
const pool     = require('./db');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'pms_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }, // 8 h
}));

// ─── Auth guard ───────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ message: 'Unauthorized. Please log in.' });
}

// ════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════════════════════════

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required.' });
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Users WHERE UserName = ?', [username]
    );
    if (rows.length === 0)
      return res.status(401).json({ message: 'Invalid credentials.' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.Password);
    if (!match)
      return res.status(401).json({ message: 'Invalid credentials.' });
    req.session.user = { id: user.UserID, username: user.UserName, role: user.Role };
    return res.json({ message: 'Login successful.', user: req.session.user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out.' }));
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.session.user));

// POST /api/auth/register  (Admin only – or first-time setup)
app.post('/api/auth/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required.' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO Users (UserName, Password, Role) VALUES (?, ?, ?)',
      [username, hash, role || 'Staff']
    );
    return res.status(201).json({ message: 'User created.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'Username already exists.' });
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════
//  VEHICLE ROUTES
// ════════════════════════════════════════════════════════════

// GET /api/vehicles?search=
app.get('/api/vehicles', requireAuth, async (req, res) => {
  const { search } = req.query;
  let sql = `SELECT v.*, u.UserName AS RegisteredByName
             FROM Vehicle v
             LEFT JOIN Users u ON v.RegisteredBy = u.UserID`;
  const params = [];
  if (search) {
    sql += ` WHERE v.Plate_Number LIKE ? OR v.Brand LIKE ? OR v.Model LIKE ?`;
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY v.CreatedAt DESC';
  try {
    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/vehicles/:id
app.get('/api/vehicles/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Vehicle WHERE Plate_Number = ?', [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Vehicle not found.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/vehicles
app.post('/api/vehicles', requireAuth, async (req, res) => {
  const { Plate_Number, Brand, Model, Year, Vehicle_Type, Purchase_Price, Status } = req.body;
  if (!Plate_Number || !Brand || !Model || !Year || !Vehicle_Type || !Purchase_Price)
    return res.status(400).json({ message: 'All fields are required.' });
  try {
    await pool.query(
      `INSERT INTO Vehicle (Plate_Number, Brand, Model, Year, Vehicle_Type, Purchase_Price, Status, RegisteredBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [Plate_Number, Brand, Model, Year, Vehicle_Type, Purchase_Price, Status || 'Available', req.session.user.id]
    );
    return res.status(201).json({ message: 'Vehicle added.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'Plate number already exists.' });
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/vehicles/:id
app.put('/api/vehicles/:id', requireAuth, async (req, res) => {
  const { Brand, Model, Year, Vehicle_Type, Purchase_Price, Status } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE Vehicle SET Brand=?, Model=?, Year=?, Vehicle_Type=?, Purchase_Price=?, Status=?
       WHERE Plate_Number=?`,
      [Brand, Model, Year, Vehicle_Type, Purchase_Price, Status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Vehicle not found.' });
    return res.json({ message: 'Vehicle updated.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/vehicles/:id
app.delete('/api/vehicles/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM Vehicle WHERE Plate_Number = ?', [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Vehicle not found.' });
    return res.json({ message: 'Vehicle deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════
//  CUSTOMER ROUTES
// ════════════════════════════════════════════════════════════

app.get('/api/customers', requireAuth, async (req, res) => {
  const { search } = req.query;
  let sql = `SELECT c.*, u.UserName AS RegisteredByName
             FROM Customer c
             LEFT JOIN Users u ON c.RegisteredBy = u.UserID`;
  const params = [];
  if (search) {
    sql += ` WHERE c.FirstName LIKE ? OR c.LastName LIKE ? OR c.Email LIKE ? OR c.PhoneNumber LIKE ?`;
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  sql += ' ORDER BY c.CreatedAt DESC';
  try {
    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.get('/api/customers/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Customer WHERE CustomerID = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Customer not found.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.post('/api/customers', requireAuth, async (req, res) => {
  const { FirstName, LastName, Email, PhoneNumber, Status } = req.body;
  if (!FirstName || !LastName || !Email || !PhoneNumber)
    return res.status(400).json({ message: 'All fields are required.' });
  try {
    await pool.query(
      `INSERT INTO Customer (FirstName, LastName, Email, PhoneNumber, Status, RegisteredBy)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [FirstName, LastName, Email, PhoneNumber, Status || 'Active', req.session.user.id]
    );
    return res.status(201).json({ message: 'Customer added.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'Email already exists.' });
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.put('/api/customers/:id', requireAuth, async (req, res) => {
  const { FirstName, LastName, Email, PhoneNumber, Status } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE Customer SET FirstName=?, LastName=?, Email=?, PhoneNumber=?, Status=?
       WHERE CustomerID=?`,
      [FirstName, LastName, Email, PhoneNumber, Status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Customer not found.' });
    return res.json({ message: 'Customer updated.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.delete('/api/customers/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Customer WHERE CustomerID = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Customer not found.' });
    return res.json({ message: 'Customer deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════
//  PROMOTION ROUTES
// ════════════════════════════════════════════════════════════

app.get('/api/promotions', requireAuth, async (req, res) => {
  const { search } = req.query;
  let sql = `SELECT p.*, u.UserName AS CreatedByName
             FROM Promotion p
             LEFT JOIN Users u ON p.CreatedBy = u.UserID`;
  const params = [];
  if (search) {
    sql += ` WHERE p.Title LIKE ? OR p.Discount_Type LIKE ?`;
    const like = `%${search}%`;
    params.push(like, like);
  }
  sql += ' ORDER BY p.CreatedAt DESC';
  try {
    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.get('/api/promotions/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Promotion WHERE PromotionID = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Promotion not found.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.post('/api/promotions', requireAuth, async (req, res) => {
  const { Title, Description, Discount_Type, Discount_Value, Start_Date, End_Date, Status } = req.body;
  if (!Title || !Discount_Type || !Start_Date || !End_Date)
    return res.status(400).json({ message: 'Title, Discount Type, Start Date and End Date are required.' });
  if (new Date(End_Date) < new Date(Start_Date))
    return res.status(400).json({ message: 'End Date must be on or after Start Date.' });
  try {
    await pool.query(
      `INSERT INTO Promotion (Title, Description, Discount_Type, Discount_Value, Start_Date, End_Date, Status, CreatedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [Title, Description || '', Discount_Type, Discount_Value || 0, Start_Date, End_Date, Status || 'Active', req.session.user.id]
    );
    return res.status(201).json({ message: 'Promotion created.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.put('/api/promotions/:id', requireAuth, async (req, res) => {
  const { Title, Description, Discount_Type, Discount_Value, Start_Date, End_Date, Status } = req.body;
  if (new Date(End_Date) < new Date(Start_Date))
    return res.status(400).json({ message: 'End Date must be on or after Start Date.' });
  try {
    const [result] = await pool.query(
      `UPDATE Promotion SET Title=?, Description=?, Discount_Type=?, Discount_Value=?,
       Start_Date=?, End_Date=?, Status=? WHERE PromotionID=?`,
      [Title, Description, Discount_Type, Discount_Value, Start_Date, End_Date, Status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Promotion not found.' });
    return res.json({ message: 'Promotion updated.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.delete('/api/promotions/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Promotion WHERE PromotionID = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Promotion not found.' });
    return res.json({ message: 'Promotion deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════
//  PROMOTION_VEHICLE ROUTES
// ════════════════════════════════════════════════════════════

app.get('/api/promo-vehicles', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pv.*, p.Title AS PromotionTitle, v.Brand, v.Model
       FROM Promotion_Vehicle pv
       JOIN Promotion p ON pv.PromotionID = p.PromotionID
       JOIN Vehicle v ON pv.Plate_Number = v.Plate_Number
       ORDER BY pv.AssignedAt DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// GET vehicles for a specific promotion
app.get('/api/promotions/:id/vehicles', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pv.*, v.Brand, v.Model, v.Vehicle_Type, v.Status AS VehicleStatus
       FROM Promotion_Vehicle pv
       JOIN Vehicle v ON pv.Plate_Number = v.Plate_Number
       WHERE pv.PromotionID = ?`,
      [req.params.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.post('/api/promo-vehicles', requireAuth, async (req, res) => {
  const { PromotionID, Plate_Number, Performance } = req.body;
  if (!PromotionID || !Plate_Number)
    return res.status(400).json({ message: 'PromotionID and Plate_Number are required.' });
  try {
    await pool.query(
      'INSERT INTO Promotion_Vehicle (PromotionID, Plate_Number, Performance) VALUES (?, ?, ?)',
      [PromotionID, Plate_Number, Performance || '']
    );
    return res.status(201).json({ message: 'Vehicle assigned to promotion.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'This vehicle is already in this promotion.' });
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.delete('/api/promo-vehicles/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM Promotion_Vehicle WHERE PromoVehicleID = ?', [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Record not found.' });
    return res.json({ message: 'Removed.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════
//  REPORT  – customers with active promotions applicable to
//            vehicles they are associated with
// ════════════════════════════════════════════════════════════
app.get('/api/reports/customers-promotions', requireAuth, async (req, res) => {
  try {
    // Returns all active customers + all active promotions (cross join for report)
    const [rows] = await pool.query(
      `SELECT
         c.CustomerID,
         CONCAT(c.FirstName,' ',c.LastName) AS CustomerName,
         c.Email,
         c.PhoneNumber,
         c.Status AS CustomerStatus,
         p.PromotionID,
         p.Title        AS PromotionTitle,
         p.Discount_Type,
         p.Discount_Value,
         p.Start_Date,
         p.End_Date,
         p.Status       AS PromotionStatus
       FROM Customer c
       CROSS JOIN Promotion p
       WHERE c.Status = 'Active'
         AND p.Status = 'Active'
         AND CURDATE() BETWEEN p.Start_Date AND p.End_Date
       ORDER BY c.LastName, c.FirstName, p.Title`
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`SwiftWheels PMS API running on http://localhost:${PORT}`);
});
