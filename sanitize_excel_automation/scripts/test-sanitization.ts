import { sanitizePhoneNumber, sanitizeCampaignId, generateEmailFromPhone, validateHeaders } from '../lib/utils/sanitization';

const testPhoneNumbers = [
    { input: "p:+91 9890450988", expected: "9890450988" },
    { input: "+91-9890450988", expected: "9890450988" },
    { input: "98904 50988", expected: "9890450988" },
    { input: "p : 9890450988", expected: "9890450988" },
    { input: "9890450988", expected: "9890450988" },
    { input: "12345", expected: "12345" }, // Should return as is if less than 10 but cleaned
];

const testCampaignIds = [
    { input: "c:123456789", expected: "123456789" },
    { input: "c : 123456789", expected: "123456789" },
    { input: "campaign:123456789", expected: "123456789" },
    { input: "123456789", expected: "123456789" },
];

const testCityHeaders = [
    { input: ["name", "phone", "campaign", "source", "city"], expected: "city" },
    { input: ["name", "phone", "campaign", "source", "adress"], expected: "adress" },
    { input: ["name", "phone", "campaign", "source", "street_address"], expected: "street_address" },
    { input: ["name", "phone", "campaign", "source", "Street Address"], expected: "Street Address" },
    { input: ["name", "phone", "campaign", "source", "other"], expected: undefined },
];

function runTests() {
    console.log("--- Running Sanitization Tests ---");

    let failed = 0;

    console.log("\nPhone Number Sanitization:");
    testPhoneNumbers.forEach(t => {
        const result = sanitizePhoneNumber(t.input);
        const pass = result === t.expected;
        console.log(`${pass ? '✅' : '❌'} Input: "${t.input}" -> Result: "${result}" (Expected: "${t.expected}")`);
        if (!pass) failed++;
    });

    console.log("\nCampaign ID Sanitization:");
    testCampaignIds.forEach(t => {
        const result = sanitizeCampaignId(t.input);
        const pass = result === t.expected;
        console.log(`${pass ? '✅' : '❌'} Input: "${t.input}" -> Result: "${result}" (Expected: "${t.expected}")`);
        if (!pass) failed++;
    });

    console.log("\nEmail Generation:");
    const phone = "9890450988";
    const email = generateEmailFromPhone(phone);
    const expectedEmail = "9890450988@gmail.com";
    const emailPass = email === expectedEmail;
    console.log(`${emailPass ? '✅' : '❌'} Phone: "${phone}" -> Email: "${email}" (Expected: "${expectedEmail}")`);
    if (!emailPass) failed++;

    console.log("\nCity/Address Header Mapping:");
    testCityHeaders.forEach(t => {
        const result = validateHeaders(t.input);
        const mappedCity = result.mapping['city'];
        const pass = mappedCity === t.expected;
        console.log(`${pass ? '✅' : '❌'} Headers: [${t.input.join(', ')}] -> Mapped City Header: "${mappedCity}" (Expected: "${t.expected}")`);
        if (!pass) failed++;
    });

    console.log(`\nTests Completed. ${failed} failures.`);
}

runTests();
