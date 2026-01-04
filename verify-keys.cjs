const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 1. Read keys
const privateKey = fs.readFileSync('private.pem', 'utf8');
const publicKey = fs.readFileSync('public.pem', 'utf8');

console.log('✅ Keys read successfully');

// 2. Create test payload (simulating server payload)
const payload = {
    deviceId: 'TEST-DEVICE-ID-12345',
    productCode: 'MAYO_ATTENDANCE_V1',
    validFrom: new Date().toISOString(),
    validTo: null, // Lifetime license test
    licenseType: 'lifetime'
};

// 3. SERVER SIDE: Sign payload
console.log('🔄 Signing payload...');
const payloadString = JSON.stringify(payload);
const sign = crypto.createSign('RSA-SHA256');
sign.update(payloadString);
sign.end();
const signature = sign.sign(privateKey, 'base64');
console.log('📝 Signature generated');

// 4. CLIENT SIDE: Verify signature
console.log('🔄 Verifying signature...');
const verify = crypto.createVerify('RSA-SHA256');
verify.update(payloadString);
verify.end();

const isValid = verify.verify(publicKey, signature, 'base64');

if (isValid) {
    console.log('✅ SUCCESS: Keypair is valid and compatible!');
    console.log('✅ SIGNATURE VERIFIED: RSA-SHA256 works correctly.');
} else {
    console.error('❌ FAILURE: Signature verification failed.');
    process.exit(1);
}
