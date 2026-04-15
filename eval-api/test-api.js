const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
// Using curl via execSync for requests

async function runTest() {
    const port = 3000;
    const url = `http://localhost:${port}`;
    
    // 1. Create a dummy zip file
    const zipPath = 'test-upload.zip';
    const zip = new AdmZip();
    zip.addFile('test.txt', Buffer.from('hello world'));
    zip.writeZip(zipPath);
    console.log('Created test-upload.zip');

    try {
        // 2. Upload zip
        // Since axios might not be installed, I'll use a simple node script with 'form-data' if needed
        // Or just use 'curl' via children process if easier. 
        // Let's use curl via exec for simplicity in testing script.
        const { execSync } = require('child_process');
        
        console.log('Uploading zip...');
        const uploadOutput = execSync(`curl -s -X POST -F "file=@${zipPath}" ${url}/upload`).toString();
        const { uploadID } = JSON.parse(uploadOutput);
        console.log(`Received uploadID: ${uploadID}`);

        // 3. Wait for processing
        console.log('Waiting for background processing (3 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 4. Get result
        console.log(`Checking result for ${uploadID}...`);
        const resultOutput = execSync(`curl -s ${url}/result/${uploadID}`).toString();
        
        console.log('API Response:');
        console.log(resultOutput);

        if (resultOutput.includes('success')) {
            console.log('TEST PASSED!');
        } else {
            console.log('TEST FAILED or processing not finished yet.');
        }

    } catch (err) {
        console.error('Test error:', err.message);
    } finally {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    }
}

runTest();
