const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Get all employees for dropdowns
  router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          id,
          CONCAT(first_name, ' ', IFNULL(last_name, '')) as employee_name,
          employee_id as employee_code
        FROM hrms_employees 
        WHERE status = 'ACTIVE'
        ORDER BY first_name ASC
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Fallback if there is no status or if column names differ
      try {
        const [fallbackRows] = await pool.query(`
          SELECT * FROM hrms_employees
        `);
        res.json({ success: true, data: fallbackRows });
      } catch (fallbackError) {
        console.error('Fallback error fetching employees:', fallbackError);
        res.status(500).json({ error: 'Unable to load employee list.' });
      }
    }
  });

  return router;
};
