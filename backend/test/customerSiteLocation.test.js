const axios = require('axios');
const baseURL = 'http://localhost:3004/api';

describe('Customer Site and Location API Tests', () => {
  let customerId;
  let locationId;
  let siteId;

  beforeAll(async () => {
    // Create a customer to use for tests
    const customerRes = await axios.post(`${baseURL}/customers`, {
      Name: 'Test Customer',
      CustomerCode: 'TST001',
      CustomerSite: [],
      CustomerOfficeAddress: [],
      CustomerKeyContact: [],
      CustomerCogentContact: null
    });
    customerId = customerRes.data.CustomerID;
  });

  afterAll(async () => {
    // Cleanup: delete the test customer (which should cascade delete sites)
    if (customerId) {
      await axios.delete(`${baseURL}/customers/${customerId}`);
    }
    if (locationId) {
      await axios.delete(`${baseURL}/locations/${locationId}`);
    }
  });

  test('Create, Read, Update, Delete Location', async () => {
    // Create location
    const createLocRes = await axios.post(`${baseURL}/locations`, {
      CustomerID: customerId,
      LocationName: 'Test Location',
      Address: '123 Test St'
    });
    expect(createLocRes.status).toBe(201);
    expect(createLocRes.data.LocationName).toBe('Test Location');
    locationId = createLocRes.data.LocationID;

    // Get location by ID
    const getLocRes = await axios.get(`${baseURL}/locations/${locationId}`);
    expect(getLocRes.status).toBe(200);
    expect(getLocRes.data.LocationName).toBe('Test Location');

    // Update location
    const updateLocRes = await axios.put(`${baseURL}/locations/${locationId}`, {
      CustomerID: customerId,
      LocationName: 'Updated Location',
      Address: '456 Updated St'
    });
    expect(updateLocRes.status).toBe(200);
    expect(updateLocRes.data.LocationName).toBe('Updated Location');

    // Delete location
    const deleteLocRes = await axios.delete(`${baseURL}/locations/${locationId}`);
    expect(deleteLocRes.status).toBe(200);
    locationId = null;
  });

  test('Create, Read, Update, Delete Customer Site', async () => {
    // Create location for site
    const locRes = await axios.post(`${baseURL}/locations`, {
      CustomerID: customerId,
      LocationName: 'Site Location',
      Address: '789 Site St'
    });
    expect(locRes.status).toBe(201);
    locationId = locRes.data.LocationID;

    // Create site
    const createSiteRes = await axios.post(`${baseURL}/customers/${customerId}/sites`, {
      LocationID: locationId,
      SiteName: 'Test Site'
    });
    expect(createSiteRes.status).toBe(201);
    expect(createSiteRes.data.data.SiteName).toBe('Test Site');
    siteId = createSiteRes.data.data.SiteID;

    // Get sites for customer
    const getSitesRes = await axios.get(`${baseURL}/customers/${customerId}/sites`);
    expect(getSitesRes.status).toBe(200);
    expect(getSitesRes.data.data.some(site => site.SiteID === siteId)).toBe(true);

    // Update site
    const updateSiteRes = await axios.put(`${baseURL}/customers/${customerId}/sites/${siteId}`, {
      LocationID: locationId,
      SiteName: 'Updated Site'
    });
    expect(updateSiteRes.status).toBe(200);
    expect(updateSiteRes.data.data.SiteName).toBe('Updated Site');

    // Delete site
    const deleteSiteRes = await axios.delete(`${baseURL}/customers/${customerId}/sites/${siteId}`);
    expect(deleteSiteRes.status).toBe(200);
    siteId = null;

    // Cleanup location
    const delLocRes = await axios.delete(`${baseURL}/locations/${locationId}`);
    expect(delLocRes.status).toBe(200);
    locationId = null;
  });
});
