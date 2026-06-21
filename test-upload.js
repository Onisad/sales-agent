require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test the upload-images endpoint
async function testUpload() {
    const salesSiteUrl = process.env.SALES_SITE_URL || 'https://forsale.onisad.com';
    const uploadUrl = `${salesSiteUrl}/api/upload-images`;
    
    console.log('🧪 Testing /api/upload-images endpoint');
    console.log(`📍 URL: ${uploadUrl}`);
    console.log(`🔍 SALES_SITE_URL from env: ${process.env.SALES_SITE_URL || '(not set)'}`);
    console.log('');
    
    // Create a small test image (1x1 red pixel PNG as base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testDataUri = `data:image/png;base64,${testImageBase64}`;
    
    try {
        console.log('📤 Sending test request...');
        const response = await axios.post(uploadUrl, {
            images: [testDataUri]
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000,
            validateStatus: function (status) {
                return status < 500; // Don't throw on 4xx errors
            }
        });
        
        console.log('');
        console.log('✅ Response received:');
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Headers:`, JSON.stringify(response.headers, null, 2));
        console.log(`   Data:`, JSON.stringify(response.data, null, 2));
        
        if (response.status === 200 && response.data.success) {
            console.log('');
            console.log('✅ SUCCESS! Endpoint is working correctly.');
            if (response.data.images && response.data.images.length > 0) {
                console.log(`   Uploaded image URL: ${response.data.images[0]}`);
            }
        } else {
            console.log('');
            console.log('⚠️ Request completed but with errors:');
            console.log(`   Message: ${response.data.message || 'No message'}`);
            if (response.data.errors) {
                console.log(`   Errors:`, response.data.errors);
            }
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ Request failed:');
        console.log(`   Error: ${error.message}`);
        
        if (error.response) {
            // Server responded with error status
            console.log(`   Status: ${error.response.status} ${error.response.statusText}`);
            console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
            console.log(`   Headers:`, JSON.stringify(error.response.headers, null, 2));
        } else if (error.request) {
            // Request was made but no response received
            console.log(`   No response received from server`);
            console.log(`   Request config:`, {
                url: error.config?.url,
                method: error.config?.method,
                timeout: error.config?.timeout
            });
            if (error.code) {
                console.log(`   Error code: ${error.code}`);
            }
            if (error.code === 'ENOTFOUND') {
                console.log('   💡 DNS lookup failed - check if the domain is correct');
            } else if (error.code === 'ECONNREFUSED') {
                console.log('   💡 Connection refused - server might be down or port is wrong');
            } else if (error.code === 'ECONNABORTED') {
                console.log('   💡 Request timeout - server took too long to respond');
            } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
                console.log('   💡 SSL certificate issue - check certificate validity');
            }
        } else {
            // Error setting up the request
            console.log(`   Setup error:`, error.message);
        }
        
        if (error.stack) {
            console.log('');
            console.log('Stack trace:');
            console.log(error.stack);
        }
    }
}

// Run the test
testUpload().then(() => {
    console.log('');
    console.log('🏁 Test completed');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

