const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testCreateCustomer() {
    try {
        const form = new FormData();
        // Required fields based on your schema/validation
        form.append('Name', 'Test Customer API ' + Date.now());
        form.append('MasterCustomerName', 'Test Master');
        form.append('CustomerGroup', 'Test Group');
        form.append('CustomerEmail', 'test@example.com');
        form.append('CustomerMobileNo', '9999999999');
        form.append('CityName', 'Delhi');

        // Attach a dummy file
        const dummyFilePath = path.join(__dirname, 'dummy.txt');
        fs.writeFileSync(dummyFilePath, 'This is a test file content');
        form.append('AgreementFile', fs.createReadStream(dummyFilePath));

        console.log('Sending POST request to /api/customers...');
        const response = await axios.post('http://localhost:3004/api/customers', form, {
            headers: {
                ...form.getHeaders()
            }
        });

        console.log('✅ Success:', response.status, response.data);
    } catch (error) {
        if (error.response) {
            console.error('❌ Server Error:', error.response.status, error.response.data);
        } else {
            console.error('❌ Request Error:', error.message);
        }
    }
}

testCreateCustomer();
