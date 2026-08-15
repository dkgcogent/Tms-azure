const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Helper to sanitize numeric values for database (converts empty strings to null)
  const sanitizeValue = (val) => {
    if (val === undefined || val === null || val === '') return null;
    return val;
  };

  // Helper to extract ID from string like "Name / 5" or resolve by DB query
  const extractId = async (str, table = 'customer') => {
    if (!str || typeof str !== 'string') return null;
    const parts = str.split('/');
    if (parts.length > 1) {
      const id = parseInt(parts[parts.length - 1].trim(), 10);
      if (!isNaN(id)) return id;
    }
    // Fallback lookup by name
    try {
      if (table === 'customer') {
        const [rows] = await pool.query("SELECT CustomerID FROM customer WHERE MasterCustomerName = ? OR Name = ? OR Name LIKE ?", [str.trim(), str.trim(), `%${str.trim()}%`]);
        if (rows.length > 0) return rows[0].CustomerID;
      } else if (table === 'project') {
        const [rows] = await pool.query("SELECT ProjectID FROM project WHERE ProjectName = ? OR ProjectName LIKE ?", [str.trim(), `%${str.trim()}%`]);
        if (rows.length > 0) return rows[0].ProjectID;
      }
    } catch (e) {
      console.error('Error in extractId DB lookup:', e);
    }
    return null;
  };

  // Create a new customer commercial agreement
  router.post('/', async (req, res) => {
    const data = req.body;
    console.log('🚀 POST /api/customer-commercials - Received payload:', data);

    try {
      const customer_id = await extractId(data.master_customer, 'customer');
      const project_id = await extractId(data.project, 'project');

      const query = `
        INSERT INTO customer_commercial (
          master_customer, company_name, project, state, 
          type_of_vehicle_placement, type_of_vehicle, type_of_body, 
          no_of_days_per_month, hours, fixed_rate, 
          km_include_in_fix_rate, additional_rate_per_km, toll, 
          parking, fixed_charges_loading_unloading, da_applicable, 
          da_charges, no_entry_pass_charges, above_551_lts, 
          between_351_550_lts, description_only_sbs, 
          handling_charges_applicable, handling_charges, 
          state_tax_charges, floor_delivery_charges, 
          driver_charges, over_time_charges, holiday_working_charges, 
          additional_delivery_points_charges, per_kg_cost, 
          created_at, updated_at, customer_id, project_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)
      `;

      const params = [
        sanitizeValue(data.master_customer),
        sanitizeValue(data.company_name),
        sanitizeValue(data.project),
        sanitizeValue(data.state),
        sanitizeValue(data.type_of_vehicle_placement),
        sanitizeValue(data.type_of_vehicle),
        sanitizeValue(data.type_of_body),
        sanitizeValue(data.no_of_days_per_month),
        sanitizeValue(data.hours),
        sanitizeValue(data.fixed_rate),
        sanitizeValue(data.km_include_in_fix_rate),
        sanitizeValue(data.additional_rate_per_km),
        sanitizeValue(data.toll),
        sanitizeValue(data.parking),
        sanitizeValue(data.fixed_charges_loading_unloading),
        sanitizeValue(data.da_applicable),
        sanitizeValue(data.da_charges),
        sanitizeValue(data.no_entry_pass_charges),
        sanitizeValue(data.above_551_lts),
        sanitizeValue(data.between_351_550_lts),
        sanitizeValue(data.description_only_sbs),
        sanitizeValue(data.handling_charges_applicable),
        sanitizeValue(data.handling_charges),
        sanitizeValue(data.state_tax_charges),
        sanitizeValue(data.floor_delivery_charges),
        sanitizeValue(data.driver_charges),
        sanitizeValue(data.over_time_charges),
        sanitizeValue(data.holiday_working_charges),
        sanitizeValue(data.additional_delivery_points_charges),
        sanitizeValue(data.per_kg_cost),
        customer_id,
        project_id
      ];

      const [result] = await pool.query(query, params);
      
      console.log('✅ Commercial Agreement saved successfully, ID:', result.insertId);
      
      res.status(201).json({
        success: true,
        message: 'Commercial agreement saved successfully',
        id: result.insertId
      });
    } catch (error) {
      console.error('❌ Error saving commercial agreement:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  });

  // Get all commercial agreements
  router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM customer_commercial ORDER BY created_at DESC');
      res.json(rows);
    } catch (error) {
      console.error('Error fetching commercial agreements:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update a commercial agreement
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    console.log(`🚀 PUT /api/customer-commercials/${id} - Received payload:`, data);

    try {
      const customer_id = await extractId(data.master_customer, 'customer');
      const project_id = await extractId(data.project, 'project');

      const query = `
        UPDATE customer_commercial SET
          master_customer = ?, company_name = ?, project = ?, state = ?, 
          type_of_vehicle_placement = ?, type_of_vehicle = ?, type_of_body = ?, 
          no_of_days_per_month = ?, hours = ?, fixed_rate = ?, 
          km_include_in_fix_rate = ?, additional_rate_per_km = ?, toll = ?, 
          parking = ?, fixed_charges_loading_unloading = ?, da_applicable = ?, 
          da_charges = ?, no_entry_pass_charges = ?, above_551_lts = ?, 
          between_351_550_lts = ?, description_only_sbs = ?, 
          handling_charges_applicable = ?, handling_charges = ?, 
          state_tax_charges = ?, floor_delivery_charges = ?, 
          driver_charges = ?, over_time_charges = ?, holiday_working_charges = ?, 
          additional_delivery_points_charges = ?, per_kg_cost = ?, 
          updated_at = NOW(), customer_id = ?, project_id = ?
        WHERE id = ?
      `;

      const params = [
        sanitizeValue(data.master_customer),
        sanitizeValue(data.company_name),
        sanitizeValue(data.project),
        sanitizeValue(data.state),
        sanitizeValue(data.type_of_vehicle_placement),
        sanitizeValue(data.type_of_vehicle),
        sanitizeValue(data.type_of_body),
        sanitizeValue(data.no_of_days_per_month),
        sanitizeValue(data.hours),
        sanitizeValue(data.fixed_rate),
        sanitizeValue(data.km_include_in_fix_rate),
        sanitizeValue(data.additional_rate_per_km),
        sanitizeValue(data.toll),
        sanitizeValue(data.parking),
        sanitizeValue(data.fixed_charges_loading_unloading),
        sanitizeValue(data.da_applicable),
        sanitizeValue(data.da_charges),
        sanitizeValue(data.no_entry_pass_charges),
        sanitizeValue(data.above_551_lts),
        sanitizeValue(data.between_351_550_lts),
        sanitizeValue(data.description_only_sbs),
        sanitizeValue(data.handling_charges_applicable),
        sanitizeValue(data.handling_charges),
        sanitizeValue(data.state_tax_charges),
        sanitizeValue(data.floor_delivery_charges),
        sanitizeValue(data.driver_charges),
        sanitizeValue(data.over_time_charges),
        sanitizeValue(data.holiday_working_charges),
        sanitizeValue(data.additional_delivery_points_charges),
        sanitizeValue(data.per_kg_cost),
        customer_id,
        project_id,
        id
      ];

      const [result] = await pool.query(query, params);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Commercial agreement not found' });
      }
      
      console.log('✅ Commercial Agreement updated successfully, ID:', id);
      res.json({ success: true, message: 'Commercial agreement updated successfully' });
    } catch (error) {
      console.error('❌ Error updating commercial agreement:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  // Delete a single commercial agreement
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [result] = await pool.query('DELETE FROM customer_commercial WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Commercial agreement not found' });
      }
      console.log('✅ Deleted commercial agreement ID:', id);
      res.json({ success: true, message: 'Commercial agreement deleted successfully' });
    } catch (error) {
      console.error('Error deleting commercial agreement:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Bulk delete commercial agreements
  router.delete('/bulk', async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided for deletion' });
    }

    try {
      const [result] = await pool.query('DELETE FROM customer_commercial WHERE id IN (?)', [ids]);
      console.log(`✅ Bulk deleted ${result.affectedRows} commercial agreements`);
      res.json({ success: true, message: `Successfully deleted ${result.affectedRows} records` });
    } catch (error) {
      console.error('Error bulk deleting commercial agreements:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
