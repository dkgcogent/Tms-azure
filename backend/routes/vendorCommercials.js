const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Helper to sanitize numeric values for database (converts empty strings to null)
  const sanitizeValue = (val) => {
    if (val === undefined || val === null || val === '') return null;
    return val;
  };

  // Create a new vendor commercial agreement
  router.post('/', async (req, res) => {
    const data = req.body;
    console.log('🚀 POST /api/vendor-commercials - Received payload:', data);

    try {
      const query = `
        INSERT INTO vendor_commercial (
          vendor_id, vendor_name, vendor_company_name, project, state, 
          type_of_vehicle_placement, type_of_vehicle, type_of_body, 
          sunday_option, no_of_days_per_month, hours, fixed_rate, 
          km_include_in_fix_rate, additional_rate_per_km, toll, 
          parking, fixed_charges_loading_unloading, da_applicable, 
          da_charges, no_entry_pass_charges, above_551_lts, 
          between_351_550_lts, description_only_sbs, 
          handling_charges_applicable, handling_charges, 
          state_tax_charges, floor_delivery_charges, 
          driver_charges, over_time_charges, holiday_working_charges, 
          additional_delivery_points_charges, per_kg_cost, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const params = [
        sanitizeValue(data.vendor_id),
        sanitizeValue(data.vendor_name),
        sanitizeValue(data.vendor_company_name),
        sanitizeValue(data.project),
        sanitizeValue(data.state),
        sanitizeValue(data.type_of_vehicle_placement),
        sanitizeValue(data.type_of_vehicle),
        sanitizeValue(data.type_of_body),
        sanitizeValue(data.sunday_option || 'Sunday Including'),
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
        sanitizeValue(data.per_kg_cost)
      ];

      const [result] = await pool.query(query, params);
      
      console.log('✅ Vendor Commercial Agreement saved successfully, ID:', result.insertId);
      
      res.status(201).json({
        success: true,
        message: 'Vendor Commercial agreement saved successfully',
        id: result.insertId
      });
    } catch (error) {
      console.error('❌ Error saving vendor commercial agreement:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  });

  // Get all vendor commercial agreements
  router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM vendor_commercial ORDER BY created_at DESC');
      res.json(rows);
    } catch (error) {
      console.error('Error fetching vendor commercial agreements:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update a vendor commercial agreement
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    console.log(`🚀 PUT /api/vendor-commercials/${id} - Received payload:`, data);

    try {
      const query = `
        UPDATE vendor_commercial SET
          vendor_id = ?, vendor_name = ?, vendor_company_name = ?, project = ?, state = ?, 
          type_of_vehicle_placement = ?, type_of_vehicle = ?, type_of_body = ?, 
          sunday_option = ?, no_of_days_per_month = ?, hours = ?, fixed_rate = ?, 
          km_include_in_fix_rate = ?, additional_rate_per_km = ?, toll = ?, 
          parking = ?, fixed_charges_loading_unloading = ?, da_applicable = ?, 
          da_charges = ?, no_entry_pass_charges = ?, above_551_lts = ?, 
          between_351_550_lts = ?, description_only_sbs = ?, 
          handling_charges_applicable = ?, handling_charges = ?, 
          state_tax_charges = ?, floor_delivery_charges = ?, 
          driver_charges = ?, over_time_charges = ?, holiday_working_charges = ?, 
          additional_delivery_points_charges = ?, per_kg_cost = ?, 
          updated_at = NOW()
        WHERE id = ?
      `;

      const params = [
        sanitizeValue(data.vendor_id),
        sanitizeValue(data.vendor_name),
        sanitizeValue(data.vendor_company_name),
        sanitizeValue(data.project),
        sanitizeValue(data.state),
        sanitizeValue(data.type_of_vehicle_placement),
        sanitizeValue(data.type_of_vehicle),
        sanitizeValue(data.type_of_body),
        sanitizeValue(data.sunday_option || 'Sunday Including'),
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
        id
      ];

      const [result] = await pool.query(query, params);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Vendor Commercial agreement not found' });
      }
      
      console.log('✅ Vendor Commercial Agreement updated successfully, ID:', id);
      res.json({ success: true, message: 'Vendor Commercial agreement updated successfully' });
    } catch (error) {
      console.error('❌ Error updating vendor commercial agreement:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  // Delete a single vendor commercial agreement
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [result] = await pool.query('DELETE FROM vendor_commercial WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Vendor Commercial agreement not found' });
      }
      console.log('✅ Deleted vendor commercial agreement ID:', id);
      res.json({ success: true, message: 'Vendor Commercial agreement deleted successfully' });
    } catch (error) {
      console.error('Error deleting vendor commercial agreement:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Bulk delete vendor commercial agreements
  router.delete('/bulk', async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided for deletion' });
    }

    try {
      const [result] = await pool.query('DELETE FROM vendor_commercial WHERE id IN (?)', [ids]);
      console.log(`✅ Bulk deleted ${result.affectedRows} vendor commercial agreements`);
      res.json({ success: true, message: `Successfully deleted ${result.affectedRows} records` });
    } catch (error) {
      console.error('Error bulk deleting vendor commercial agreements:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
