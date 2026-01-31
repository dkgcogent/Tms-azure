const request = require('supertest');
const express = require('express');
const mysql = require('mysql2/promise');

// Mock the database connection
jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => ({
    getConnection: jest.fn(() => Promise.resolve({
      release: jest.fn()
    })),
    query: jest.fn(),
    end: jest.fn()
  }))
}));

// Mock multer
jest.mock('multer', () => {
  const multer = jest.fn(() => ({
    single: jest.fn(() => (req, res, next) => {
      req.file = {
        fieldname: 'file',
        originalname: 'test.xlsx',
        encoding: '7bit',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('mock file content'),
        size: 1024
      };
      next();
    }),
    diskStorage: jest.fn(() => ({
      destination: jest.fn(),
      filename: jest.fn()
    }))
  }));
  multer.diskStorage = jest.fn();
  return multer;
});

// Mock the XLSX module
jest.mock('xlsx', () => ({
  readFile: jest.fn(),
  utils: {
    json_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn(),
    sheet_to_json: jest.fn(() => [])
  },
  write: jest.fn(() => Buffer.from('mock excel data'))
}));

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn()
  }
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  extname: jest.fn((filename) => '.' + filename.split('.').pop()),
  basename: jest.fn((filename, ext) => filename.replace(ext, ''))
}));

// Import the routes after mocking
const ratesRoutes = require('../routes/rates');

describe('Rates API Routes', () => {
  let app;
  let mockPool;

  beforeAll(() => {
    // Create mock pool
    mockPool = {
      getConnection: jest.fn(() => Promise.resolve({
        release: jest.fn()
      })),
      query: jest.fn(),
      end: jest.fn()
    };

    // Create express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/rates', ratesRoutes(mockPool));
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    jest.clearAllMocks();
  });

  describe('GET /api/rates/template', () => {
    it('should download rates template successfully', async () => {
      const response = await request(app)
        .get('/api/rates/template')
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('attachment; filename="rates_template.xlsx"');
    });

    it('should handle template generation errors', async () => {
      // Mock XLSX.write to throw error
      const XLSX = require('xlsx');
      XLSX.write.mockImplementationOnce(() => {
        throw new Error('Template generation failed');
      });

      const response = await request(app)
        .get('/api/rates/template')
        .expect(500);

      expect(response.body.error).toBe('Failed to generate template');
    });
  });

  describe('GET /api/rates', () => {
    it('should fetch rates successfully', async () => {
      const mockRates = [
        {
          CustomerID: 1,
          CustomerCode: 'CUST001',
          CustomerName: 'Test Customer',
          Rates: JSON.stringify([
            {
              vehicleType: 'Truck 10MT',
              baseRate: 1500,
              fuelRate: 100
            }
          ])
        }
      ];

      mockPool.query.mockResolvedValueOnce([mockRates]);

      const response = await request(app)
        .get('/api/rates')
        .expect(200);

      expect(response.body.rates).toBeDefined();
      expect(Array.isArray(response.body.rates)).toBe(true);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/rates')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch rates');
    });
  });

  describe('PUT /api/rates/:customerId', () => {
    it('should update rates successfully', async () => {
      const customerId = '1';
      const ratesData = [
        {
          vehicleType: 'Truck 10MT',
          baseRate: 1500,
          fuelRate: 100
        }
      ];

      mockPool.query.mockResolvedValueOnce([[{ CustomerID: customerId }]]);

      const response = await request(app)
        .put(`/api/rates/${customerId}`)
        .send({ rates: ratesData })
        .expect(200);

      expect(response.body.message).toBe('Rates updated successfully');
      expect(response.body.customerId).toBe(customerId);
    });

    it('should validate rates data', async () => {
      const customerId = '1';
      const invalidRatesData = [
        {
          vehicleType: '', // Invalid: empty vehicle type
          baseRate: -100 // Invalid: negative rate
        }
      ];

      const response = await request(app)
        .put(`/api/rates/${customerId}`)
        .send({ rates: invalidRatesData })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should handle missing rates data', async () => {
      const customerId = '1';

      const response = await request(app)
        .put(`/api/rates/${customerId}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Invalid rates data');
    });
  });

  describe('DELETE /api/rates/:customerId/file', () => {
    it('should delete rates file successfully', async () => {
      const customerId = '1';
      const mockCustomer = {
        CustomerID: customerId,
        RatesAnnexureFile: 'rates_1234567890.xlsx'
      };

      mockPool.query.mockResolvedValueOnce([[mockCustomer]]);

      const response = await request(app)
        .delete(`/api/rates/${customerId}/file`)
        .expect(200);

      expect(response.body.message).toBe('Rates annexure file deleted successfully');
    });

    it('should handle customer not found', async () => {
      const customerId = '999';

      mockPool.query.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .delete(`/api/rates/${customerId}/file`)
        .expect(404);

      expect(response.body.error).toBe('Customer not found');
    });
  });

  describe('POST /api/rates/import', () => {
    it('should import rates successfully', async () => {
      const customerId = '1';

      // Mock file operations
      const fs = require('fs');
      fs.promises.mkdir.mockResolvedValue();
      fs.promises.unlink.mockResolvedValue();

      // Mock XLSX operations
      const XLSX = require('xlsx');
      XLSX.readFile.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      });
      XLSX.utils.sheet_to_json.mockReturnValue([
        {
          'Customer Code': 'CUST001',
          'Vehicle Type': 'Truck 10MT',
          'Base Rate': 1500
        }
      ]);

      // Mock database operations
      mockPool.query
        .mockResolvedValueOnce([[{ CustomerID: customerId }]]) // Customer lookup
        .mockResolvedValueOnce([[{ CustomerID: customerId }]]) // Existing rates
        .mockResolvedValueOnce([]); // Save rates

      const response = await request(app)
        .post('/api/rates/import')
        .field('customerId', customerId)
        .attach('file', Buffer.from('mock file content'), 'test.xlsx')
        .expect(200);

      expect(response.body.message).toBe('Rates imported successfully');
      expect(response.body.recordsProcessed).toBe(1);
    });

    it('should handle missing file', async () => {
      const response = await request(app)
        .post('/api/rates/import')
        .expect(400);

      expect(response.body.error).toBe('No file uploaded');
    });

    it('should validate file format', async () => {
      const response = await request(app)
        .post('/api/rates/import')
        .attach('file', Buffer.from('mock content'), 'test.txt')
        .expect(400);

      expect(response.body.error).toContain('Only Excel');
    });
  });
});
