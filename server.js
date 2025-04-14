/**
 * CSRF-Blaster GUI - Simple Express Server
 * This server provides a way to use the GUI with Node.js and communicates with the backend testing functions
 */

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const puppeteer = require('puppeteer');

// Create express application
const app = express();
const port = process.env.PORT || 3000;

// Create a directory for test results if it doesn't exist
const resultsDir = path.join(__dirname, 'results');
if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
}

// Serve static files
app.use(express.static(__dirname));

// Parse JSON bodies
app.use(bodyParser.json());

// Main route - serve the GUI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API route to run CSRF tests
app.post('/api/test', async (req, res) => {
    const config = req.body;
    
    try {
        // Create a unique ID for this test run
        const testId = `test-${Date.now()}`;
        const testDir = path.join(resultsDir, testId);
        fs.mkdirSync(testDir, { recursive: true });
        
        // Log the test config
        fs.writeFileSync(
            path.join(testDir, 'config.json'),
            JSON.stringify(config, null, 2)
        );
        
        // Start the test and send initial response
        res.json({
            success: true,
            message: 'Test started',
            testId: testId
        });
        
        // Run the actual test asynchronously
        const results = await runCSRFTest(config, testDir);
        
        // Save the results
        fs.writeFileSync(
            path.join(testDir, 'results.json'),
            JSON.stringify(results, null, 2)
        );
    } catch (error) {
        console.error('Error running CSRF test:', error);
        res.status(500).json({
            success: false,
            message: 'Error running CSRF test',
            error: error.message
        });
    }
});

// API route to get test status
app.get('/api/test/:testId/status', (req, res) => {
    const testId = req.params.testId;
    const testDir = path.join(resultsDir, testId);
    
    try {
        // Check if test exists
        if (!fs.existsSync(testDir)) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }
        
        // Check if results file exists
        const resultsFile = path.join(testDir, 'results.json');
        if (fs.existsSync(resultsFile)) {
            const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
            return res.json({
                success: true,
                status: 'completed',
                results: results
            });
        }
        
        // Check if log file exists
        const logFile = path.join(testDir, 'log.json');
        if (fs.existsSync(logFile)) {
            const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
            return res.json({
                success: true,
                status: 'running',
                progress: logs.progress || 0,
                message: logs.message || 'Test in progress',
                logs: logs.entries || []
            });
        }
        
        // Otherwise, assume the test is initializing
        return res.json({
            success: true,
            status: 'initializing',
            progress: 0,
            message: 'Initializing test'
        });
    } catch (error) {
        console.error('Error getting test status:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting test status',
            error: error.message
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`CSRF-Blaster GUI server running at http://localhost:${port}`);
});

/**
 * Run CSRF vulnerability test
 * @param {Object} config - Test configuration
 * @param {string} testDir - Directory to save test results
 * @returns {Promise<Object>} - Test results
 */
async function runCSRFTest(config, testDir) {
    // Create a log file
    const logFile = path.join(testDir, 'log.json');
    const logs = {
        progress: 0,
        message: 'Initializing test',
        entries: []
    };
    
    function updateLog(progress, message, type = 'info') {
        logs.progress = progress;
        logs.message = message;
        logs.entries.push({
            time: new Date().toISOString(),
            message,
            type
        });
        
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    }
    
    // Initialize test results
    const results = {
        testDate: new Date().toISOString(),
        targetUrl: config.targetUrl,
        framework: config.framework,
        endpoints: [],
        payloads: [],
        summary: {
            total: 0,
            vulnerable: 0,
            protected: 0,
            errors: 0
        }
    };
    
    try {
        updateLog(5, 'Initializing browser for testing...');
        
        // Launch headless browser
        const browser = await puppeteer.launch({ 
            headless: "new"
        });
        
        try {
            updateLog(10, 'Connecting to target...');
            
            // Navigate to the target URL
            const page = await browser.newPage();
            await page.goto(config.targetUrl, { 
                waitUntil: 'networkidle2',
                timeout: config.timeout || 30000
            });
            
            updateLog(20, 'Successfully connected to target');
            
            // Auto-detect framework if needed
            if (config.framework === 'auto') {
                updateLog(25, 'Attempting to identify framework...');
                
                // Check for framework indicators in page source
                const frameworkIndicators = await page.evaluate(() => {
                    const html = document.documentElement.outerHTML;
                    return {
                        react: html.includes('react') || html.includes('_reactRootContainer') || !!window.React,
                        angular: !!document.querySelector('[ng-version]') || !!window.angular,
                        vue: !!document.querySelector('[data-v-') || !!window.Vue,
                        next: !!document.getElementById('__NEXT_DATA__'),
                        nuxt: !!window.__NUXT__ || !!document.querySelector('[data-n-head]'),
                        svelte: !!document.querySelector('[class*="svelte-"]'),
                        express: document.querySelector('meta[name="generator"]')?.content?.includes('Express')
                    };
                });
                
                // Determine the most likely framework
                const detectedFramework = Object.entries(frameworkIndicators)
                    .filter(([_, detected]) => detected)
                    .map(([framework]) => framework)[0] || 'express';
                
                config.framework = detectedFramework;
                updateLog(30, `Framework detected: ${config.framework}`, 'success');
            } else {
                updateLog(30, `Using specified framework: ${config.framework}`);
            }
            
            // Scan for forms if enabled
            if (config.scanForms) {
                updateLog(35, 'Scanning for forms...');
                
                // Extract forms from the page
                const forms = await page.evaluate(() => {
                    return Array.from(document.forms).map(form => {
                        return {
                            action: form.action,
                            method: form.method.toUpperCase() || 'GET',
                            fields: Array.from(form.elements)
                                .filter(el => el.name)
                                .map(el => ({
                                    name: el.name,
                                    type: el.type,
                                    value: el.value
                                }))
                        };
                    });
                });
                
                updateLog(40, `Found ${forms.length} forms`, forms.length > 0 ? 'success' : 'info');
                
                // Test each form for CSRF vulnerability
                for (let i = 0; i < forms.length; i++) {
                    const form = forms[i];
                    const progress = 40 + Math.round((i / forms.length) * 20);
                    updateLog(progress, `Testing form ${i + 1}/${forms.length}: ${form.action}`);
                    
                    // Skip GET forms as they're not vulnerable to CSRF
                    if (form.method === 'GET') {
                        updateLog(progress, `Form ${i + 1} uses GET method (not vulnerable to CSRF)`, 'info');
                        results.endpoints.push({
                            type: 'form',
                            url: form.action,
                            method: 'GET',
                            vulnerable: false,
                            status: 200,
                            details: {
                                fields: form.fields
                            }
                        });
                        continue;
                    }
                    
                    // Check for CSRF token
                    const hasCSRFToken = form.fields.some(field => {
                        const name = field.name.toLowerCase();
                        return name.includes('csrf') || 
                               name.includes('token') || 
                               name.includes('_csrf') || 
                               name === 'xsrf';
                    });
                    
                    if (hasCSRFToken) {
                        updateLog(progress, `Form ${i + 1} has CSRF protection`, 'success');
                        results.endpoints.push({
                            type: 'form',
                            url: form.action,
                            method: form.method,
                            vulnerable: false,
                            status: 403, // Simulated status
                            details: {
                                fields: form.fields
                            }
                        });
                    } else {
                        updateLog(progress, `Form ${i + 1} has no CSRF protection!`, 'warning');
                        
                        // Try to submit a test form to confirm vulnerability
                        const testResult = await testFormCSRF(browser, form, config.targetUrl);
                        
                        results.endpoints.push({
                            type: 'form',
                            url: form.action,
                            method: form.method,
                            vulnerable: testResult.vulnerable,
                            status: testResult.status,
                            details: {
                                fields: form.fields,
                                response: testResult.response
                            }
                        });
                        
                        // Generate a payload for vulnerable form
                        if (config.generatePayloads && testResult.vulnerable) {
                            const payload = generateCSRFPayload({
                                url: form.action,
                                method: form.method,
                                fields: form.fields
                            });
                            
                            results.payloads.push({
                                name: `Form ${new URL(form.action).pathname}`,
                                html: payload
                            });
                        }
                    }
                }
            }
            
            // Test API endpoints if enabled
            if (config.testApis && config.apiEndpoints && config.apiEndpoints.length > 0) {
                updateLog(60, `Testing ${config.apiEndpoints.length} API endpoints...`);
                
                for (let i = 0; i < config.apiEndpoints.length; i++) {
                    const endpoint = config.apiEndpoints[i];
                    const progress = 60 + Math.round((i / config.apiEndpoints.length) * 30);
                    updateLog(progress, `Testing API endpoint ${i + 1}/${config.apiEndpoints.length}: ${endpoint.url}`);
                    
                    // Build the full URL
                    const fullUrl = new URL(endpoint.url, config.targetUrl).href;
                    
                    // Test the API endpoint
                    const testResult = await testApiCSRF(browser, {
                        url: fullUrl,
                        method: endpoint.method,
                        data: endpoint.data
                    });
                    
                    const endpointResult = {
                        type: 'api',
                        url: fullUrl,
                        method: endpoint.method,
                        vulnerable: testResult.vulnerable,
                        status: testResult.status,
                        details: {
                            data: endpoint.data,
                            response: testResult.response
                        }
                    };
                    
                    if (testResult.vulnerable) {
                        updateLog(progress, `API endpoint ${endpoint.url} is vulnerable to CSRF!`, 'error');
                    } else {
                        updateLog(progress, `API endpoint ${endpoint.url} is protected against CSRF`, 'success');
                    }
                    
                    results.endpoints.push(endpointResult);
                    
                    // Generate a payload for vulnerable endpoint
                    if (config.generatePayloads && testResult.vulnerable) {
                        const payload = generateCSRFPayload({
                            url: fullUrl,
                            method: endpoint.method,
                            data: endpoint.data
                        });
                        
                        results.payloads.push({
                            name: `API ${endpoint.url}`,
                            html: payload
                        });
                    }
                }
            }
            
            // Finish the test
            updateLog(100, 'Test completed!', 'success');
            
            // Calculate summary
            results.summary.total = results.endpoints.length;
            results.summary.vulnerable = results.endpoints.filter(r => r.vulnerable).length;
            results.summary.protected = results.endpoints.filter(r => r.vulnerable === false).length;
            results.summary.errors = results.endpoints.filter(r => r.error).length;
            
            return results;
        } finally {
            await browser.close();
        }
    } catch (error) {
        updateLog(100, `Error during test: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Test a form for CSRF vulnerability
 * @param {Object} browser - Puppeteer browser instance
 * @param {Object} form - Form to test
 * @param {string} baseUrl - Base URL of the target
 * @returns {Promise<Object>} - Test result
 */
async function testFormCSRF(browser, form, baseUrl) {
    // Create a new page for the test
    const page = await browser.newPage();
    
    try {
        // Create test data for the form
        const formData = {};
        form.fields.forEach(field => {
            if (field.type === 'password') {
                formData[field.name] = 'TestPassword123!';
            } else if (field.type === 'email') {
                formData[field.name] = 'test@example.com';
            } else {
                formData[field.name] = field.value || 'test_value';
            }
        });
        
        // Create a HTML form that submits to the target
        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>CSRF Test</title></head>
            <body>
                <form id="csrf-form" action="${form.action}" method="${form.method}">
                    ${Object.entries(formData).map(([key, value]) => 
                        `<input type="hidden" name="${key}" value="${value}">`
                    ).join('\n')}
                </form>
                <script>
                    document.getElementById('csrf-form').submit();
                </script>
            </body>
            </html>
        `;
        
        // Set up response monitoring
        let status = null;
        let responseData = null;
        
        page.on('response', async response => {
            if (response.url() === form.action) {
                status = response.status();
                try {
                    const contentType = response.headers()['content-type'] || '';
                    if (contentType.includes('application/json')) {
                        responseData = await response.json();
                    } else {
                        responseData = await response.text();
                    }
                } catch (e) {
                    responseData = `Error parsing response: ${e.message}`;
                }
            }
        });
        
        // Load the test page
        await page.setContent(html);
        
        // Wait for navigation or timeout
        try {
            await page.waitForNavigation({ timeout: 5000 });
        } catch (e) {
            // Ignore timeout errors
        }
        
        // Determine if the form is vulnerable
        const vulnerable = status && status >= 200 && status < 400;
        
        return {
            vulnerable,
            status: status || 'timeout',
            response: responseData
        };
    } finally {
        await page.close();
    }
}

/**
 * Test an API endpoint for CSRF vulnerability
 * @param {Object} browser - Puppeteer browser instance
 * @param {Object} endpoint - API endpoint to test
 * @returns {Promise<Object>} - Test result
 */
async function testApiCSRF(browser, endpoint) {
    // Create a new page for the test
    const page = await browser.newPage();
    
    try {
        // Determine the appropriate fetch request based on method
        let fetchCode;
        
        if (endpoint.method === 'GET') {
            fetchCode = `
                fetch('${endpoint.url}', {
                    method: 'GET',
                    credentials: 'include'
                })
            `;
        } else {
            fetchCode = `
                fetch('${endpoint.url}', {
                    method: '${endpoint.method}',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(${JSON.stringify(endpoint.data || {})})
                })
            `;
        }
        
        // Create HTML with the fetch request
        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>CSRF API Test</title></head>
            <body>
                <h1>Testing ${endpoint.method} ${endpoint.url}</h1>
                <div id="result"></div>
                <script>
                    async function testApi() {
                        try {
                            const response = await ${fetchCode};
                            
                            document.getElementById('result').innerText = 'Status: ' + response.status;
                            window.__CSRF_TEST_STATUS = response.status;
                            
                            try {
                                const contentType = response.headers.get('content-type') || '';
                                let data;
                                
                                if (contentType.includes('application/json')) {
                                    data = await response.json();
                                } else {
                                    data = await response.text();
                                }
                                
                                window.__CSRF_TEST_DATA = data;
                            } catch (error) {
                                window.__CSRF_TEST_ERROR = error.message;
                            }
                        } catch (error) {
                            document.getElementById('result').innerText = 'Error: ' + error.message;
                            window.__CSRF_TEST_ERROR = error.message;
                        }
                        
                        window.__CSRF_TEST_COMPLETED = true;
                    }
                    
                    testApi();
                </script>
            </body>
            </html>
        `;
        
        // Load the test page
        await page.setContent(html);
        
        // Wait for the test to complete
        await page.waitForFunction('window.__CSRF_TEST_COMPLETED === true', { timeout: 10000 }).catch(() => {});
        
        // Get the results
        const result = await page.evaluate(() => {
            return {
                status: window.__CSRF_TEST_STATUS || 'timeout',
                data: window.__CSRF_TEST_DATA,
                error: window.__CSRF_TEST_ERROR
            };
        });
        
        // Determine if the endpoint is vulnerable
        const vulnerable = result.status >= 200 && result.status < 400;
        
        return {
            vulnerable,
            status: result.status,
            response: result.data || result.error
        };
    } finally {
        await page.close();
    }
}

/**
 * Generate a CSRF payload HTML
 * @param {Object} target - Target endpoint
 * @returns {string} - HTML payload
 */
function generateCSRFPayload(target) {
    const { url, method, fields, data } = target;
    
    // Determine what data to include in the form
    let formData = {};
    
    if (fields) {
        // For forms, use the fields
        fields.forEach(field => {
            if (!field.name.toLowerCase().includes('csrf') && !field.name.toLowerCase().includes('token')) {
                formData[field.name] = field.type === 'password' ? 'TestPassword123!' : 'test_value';
            }
        });
    } else if (data) {
        // For API endpoints, use the provided data
        formData = data;
    }
    
    // Generate an appropriate payload
    if (method === 'GET') {
        // GET method - include params in the URL
        const params = new URLSearchParams();
        Object.entries(formData).forEach(([key, value]) => {
            params.append(key, value);
        });
        
        const urlWithParams = url + (url.includes('?') ? '&' : '?') + params.toString();
        
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CSRF Test for ${url}</title>
</head>
<body>
    <h1>CSRF Test for ${url}</h1>
    <p>Clicking the link below will simulate a CSRF attack:</p>
    <a href="${urlWithParams}" id="csrf-link">Click here</a>
    <p>This link will be automatically clicked when the page loads...</p>
    <script>
        window.onload = function() {
            document.getElementById('csrf-link').click();
        };
    </script>
</body>
</html>`;
    } else {
        // POST, PUT, DELETE methods - use a form
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CSRF Test for ${url}</title>
</head>
<body>
    <h1>CSRF Test for ${url}</h1>
    <form id="csrf-form" action="${url}" method="${method}">
        ${Object.entries(formData).map(([key, value]) => {
            if (typeof value === 'object') {
                value = JSON.stringify(value);
            }
            return `<input type="hidden" name="${key}" value="${value}">`;
        }).join('\n        ')}
    </form>
    <p>This form will be automatically submitted when the page loads...</p>
    <script>
        window.onload = function() {
            document.getElementById('csrf-form').submit();
        };
    </script>
</body>
</html>`;
    }
}