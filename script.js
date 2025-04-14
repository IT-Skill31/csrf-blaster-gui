// CSRF-Blaster GUI - Main Script
document.addEventListener('DOMContentLoaded', function() {
    // Initialize highlight.js
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });
    
    // Initialize variables
    let testResults = [];
    let generatedPayloads = [];
    
    // DOM Elements
    const csrfTestForm = document.getElementById('csrfTestForm');
    const targetUrlInput = document.getElementById('targetUrl');
    const frameworkSelect = document.getElementById('framework');
    const timeoutInput = document.getElementById('timeoutInput');
    const verboseModeCheckbox = document.getElementById('verboseModeCheckbox');
    const scanFormsCheckbox = document.getElementById('scanFormsCheckbox');
    const testApisCheckbox = document.getElementById('testApisCheckbox');
    const generatePayloadsCheckbox = document.getElementById('generatePayloadsCheckbox');
    const apiEndpointsTable = document.getElementById('apiEndpointsTable');
    const addApiEndpointBtn = document.getElementById('addApiEndpointBtn');
    const resetFormBtn = document.getElementById('resetFormBtn');
    const startTestBtn = document.getElementById('startTestBtn');
    
    const testProgressCard = document.getElementById('testProgressCard');
    const testProgressBar = document.getElementById('testProgressBar');
    const testStatusMessage = document.getElementById('testStatusMessage');
    const testConsole = document.getElementById('testConsole');
    
    const resultsCard = document.getElementById('resultsCard');
    const totalTestsCount = document.getElementById('totalTestsCount');
    const vulnerableCount = document.getElementById('vulnerableCount');
    const protectedCount = document.getElementById('protectedCount');
    const errorCount = document.getElementById('errorCount');
    const summaryText = document.getElementById('summaryText');
    const vulnerabilitySummary = document.getElementById('vulnerabilitySummary');
    const detailsTableBody = document.getElementById('detailsTableBody');
    const payloadsList = document.getElementById('payloadsList');
    const recommendationsText = document.getElementById('recommendationsText');
    
    const exportResultsBtn = document.getElementById('exportResultsBtn');
    const runNewTestBtn = document.getElementById('runNewTestBtn');
    
    // Modal elements
    const viewPayloadModal = document.getElementById('viewPayloadModal');
    const payloadModalTitle = document.getElementById('payloadModalTitle');
    const payloadModalContent = document.getElementById('payloadModalContent');
    const copyPayloadBtn = document.getElementById('copyPayloadBtn');
    const downloadPayloadBtn = document.getElementById('downloadPayloadBtn');
    
    // Add API Endpoint
    addApiEndpointBtn.addEventListener('click', function() {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="text" class="form-control form-control-sm" placeholder="/api/endpoint"></td>
            <td>
                <select class="form-select form-select-sm">
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                </select>
            </td>
            <td><input type="text" class="form-control form-control-sm" placeholder='{"param":"value"}'></td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-danger delete-endpoint-btn">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        apiEndpointsTable.querySelector('tbody').appendChild(newRow);
        
        // Add delete event listener to the new button
        newRow.querySelector('.delete-endpoint-btn').addEventListener('click', function() {
            newRow.remove();
        });
    });
    
    // Delete endpoint row
    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete-endpoint-btn')) {
            const row = e.target.closest('tr');
            if (apiEndpointsTable.querySelectorAll('tbody tr').length > 1) {
                row.remove();
            } else {
                // Don't remove the last row, just clear its inputs
                row.querySelectorAll('input').forEach(input => {
                    input.value = '';
                });
                row.querySelector('select').value = 'POST';
            }
        }
    });
    
    // Reset form
    resetFormBtn.addEventListener('click', function() {
        csrfTestForm.reset();
        // Reset API endpoints table to have only one empty row
        const tbody = apiEndpointsTable.querySelector('tbody');
        tbody.innerHTML = `
            <tr>
                <td><input type="text" class="form-control form-control-sm" placeholder="/api/endpoint"></td>
                <td>
                    <select class="form-select form-select-sm">
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                    </select>
                </td>
                <td><input type="text" class="form-control form-control-sm" placeholder='{"param":"value"}'></td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-danger delete-endpoint-btn">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    // Start Test
    csrfTestForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Hide results card if visible
        resultsCard.style.display = 'none';
        
        // Show progress card
        testProgressCard.style.display = 'block';
        testProgressBar.style.width = '0%';
        testStatusMessage.textContent = 'Preparing to test...';
        testConsole.innerHTML = '';
        
        // Scroll to progress card
        testProgressCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Get test configuration
        const testConfig = {
            targetUrl: targetUrlInput.value.trim(),
            framework: frameworkSelect.value,
            timeout: parseInt(timeoutInput.value),
            verbose: verboseModeCheckbox.checked,
            scanForms: scanFormsCheckbox.checked,
            testApis: testApisCheckbox.checked,
            generatePayloads: generatePayloadsCheckbox.checked,
            apiEndpoints: getApiEndpoints()
        };
        
        // Reset results
        testResults = [];
        generatedPayloads = [];
        
        // Run the test
        runCSRFTest(testConfig);
    });
    
    // Get API endpoints from the table
    function getApiEndpoints() {
        const endpoints = [];
        const rows = apiEndpointsTable.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const urlInput = row.querySelector('td:nth-child(1) input');
            const methodSelect = row.querySelector('td:nth-child(2) select');
            const dataInput = row.querySelector('td:nth-child(3) input');
            
            if (urlInput.value.trim()) {
                let data = {};
                try {
                    if (dataInput.value.trim()) {
                        data = JSON.parse(dataInput.value);
                    }
                } catch (e) {
                    // If JSON parsing fails, use the string as is
                    data = { value: dataInput.value };
                }
                
                endpoints.push({
                    url: urlInput.value.trim(),
                    method: methodSelect.value,
                    data: data
                });
            }
        });
        
        return endpoints;
    }
    
    // Run New Test button
    runNewTestBtn.addEventListener('click', function() {
        // Hide results card
        resultsCard.style.display = 'none';
        // Scroll to form
        csrfTestForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    
    // Export Results button
    exportResultsBtn.addEventListener('click', function() {
        const exportData = {
            testDate: new Date().toISOString(),
            targetUrl: targetUrlInput.value,
            framework: frameworkSelect.value,
            results: testResults,
            payloads: generatedPayloads,
            summary: {
                total: testResults.length,
                vulnerable: testResults.filter(r => r.vulnerable).length,
                protected: testResults.filter(r => r.vulnerable === false).length,
                errors: testResults.filter(r => r.error).length
            }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `csrf-test-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    // Copy Payload button
    copyPayloadBtn.addEventListener('click', function() {
        const payloadText = payloadModalContent.textContent;
        navigator.clipboard.writeText(payloadText).then(() => {
            const originalText = copyPayloadBtn.innerHTML;
            copyPayloadBtn.innerHTML = '<i class="bi bi-check me-1"></i>Copied!';
            setTimeout(() => {
                copyPayloadBtn.innerHTML = originalText;
            }, 2000);
        });
    });
    
    // Download Payload button
    downloadPayloadBtn.addEventListener('click', function() {
        const payloadName = payloadModalTitle.textContent.replace('CSRF Payload: ', '').trim();
        const payloadText = payloadModalContent.textContent;
        const blob = new Blob([payloadText], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `csrf-payload-${payloadName.toLowerCase().replace(/\s+/g, '-')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    // Simulated CSRF Test (for the UI demonstration)
    function runCSRFTest(config) {
        // Log test configuration
        logToConsole('info', 'Starting CSRF vulnerability test with configuration:');
        logToConsole('info', `Target URL: ${config.targetUrl}`);
        logToConsole('info', `Framework: ${config.framework}`);
        logToConsole('info', `Timeout: ${config.timeout}ms`);
        logToConsole('info', `Verbose Mode: ${config.verbose}`);
        logToConsole('info', `Scan Forms: ${config.scanForms}`);
        logToConsole('info', `Test APIs: ${config.testApis}`);
        logToConsole('info', `Generate Payloads: ${config.generatePayloads}`);
        
        if (config.apiEndpoints.length > 0) {
            logToConsole('info', `API Endpoints to test: ${config.apiEndpoints.length}`);
            if (config.verbose) {
                config.apiEndpoints.forEach((endpoint, index) => {
                    logToConsole('info', `  ${index + 1}. ${endpoint.method} ${endpoint.url}`);
                });
            }
        }
        
        // Update progress bar
        updateProgress(5, 'Initializing test environment...');
        
        // Simulate different stages of the test
        setTimeout(() => {
            // 1. Connect to the target
            updateProgress(10, 'Connecting to target...');
            logToConsole('info', 'Establishing connection to target...');
            
            // Simulate connection to target
            setTimeout(() => {
                logToConsole('success', `Successfully connected to ${config.targetUrl}`);
                
                // 2. Identify framework
                updateProgress(20, 'Identifying framework...');
                logToConsole('info', 'Attempting to identify framework...');
                
                setTimeout(() => {
                    // Framework detection
                    if (config.framework === 'auto') {
                        const detectedFramework = ['express', 'react', 'angular', 'vue', 'next', 'nuxt', 'svelte'][Math.floor(Math.random() * 7)];
                        logToConsole('success', `Framework detected: ${detectedFramework}`);
                        config.framework = detectedFramework;
                    } else {
                        logToConsole('info', `Using specified framework: ${config.framework}`);
                    }
                    
                    // 3. Scan for forms
                    if (config.scanForms) {
                        updateProgress(30, 'Scanning for forms...');
                        logToConsole('info', 'Scanning target for forms...');
                        
                        setTimeout(() => {
                            // Simulate form scanning results
                            const formCount = Math.floor(Math.random() * 5);
                            if (formCount > 0) {
                                logToConsole('success', `Found ${formCount} forms`);
                                
                                // Add forms to test results
                                for (let i = 0; i < formCount; i++) {
                                    const formPath = `/form${i + 1}`;
                                    const method = Math.random() > 0.5 ? 'POST' : 'GET';
                                    const hasCSRFToken = Math.random() > 0.6;
                                    
                                    const result = {
                                        type: 'form',
                                        url: `${config.targetUrl}${formPath}`,
                                        method: method,
                                        vulnerable: method === 'POST' && !hasCSRFToken,
                                        status: Math.random() > 0.8 ? 403 : 200,
                                        details: {
                                            fields: [
                                                { name: 'username', type: 'text' },
                                                { name: 'password', type: 'password' }
                                            ]
                                        }
                                    };
                                    
                                    if (hasCSRFToken) {
                                        result.details.fields.push({ name: '_csrf', type: 'hidden' });
                                        logToConsole('info', `Form #${i + 1} (${formPath}): CSRF token found`);
                                    } else {
                                        if (method === 'POST') {
                                            logToConsole('warning', `Form #${i + 1} (${formPath}): No CSRF token found in POST form!`);
                                        } else {
                                            logToConsole('info', `Form #${i + 1} (${formPath}): GET form (not vulnerable to CSRF)`);
                                        }
                                    }
                                    
                                    testResults.push(result);
                                    
                                    // Generate payload if vulnerable
                                    if (config.generatePayloads && result.vulnerable) {
                                        const payload = generateCSRFPayload(result, config.targetUrl);
                                        generatedPayloads.push({
                                            name: `Form ${formPath}`,
                                            html: payload
                                        });
                                    }
                                }
                            } else {
                                logToConsole('info', 'No forms found on the page');
                            }
                            
                            // 4. Test API endpoints
                            if (config.testApis && config.apiEndpoints.length > 0) {
                                updateProgress(60, 'Testing API endpoints...');
                                logToConsole('info', `Testing ${config.apiEndpoints.length} API endpoints for CSRF vulnerabilities...`);
                                
                                let testedEndpoints = 0;
                                const totalEndpoints = config.apiEndpoints.length;
                                
                                // Process each endpoint
                                function processNextEndpoint() {
                                    if (testedEndpoints < totalEndpoints) {
                                        const endpoint = config.apiEndpoints[testedEndpoints];
                                        logToConsole('info', `Testing ${endpoint.method} ${endpoint.url}...`);
                                        
                                        // Simulate API endpoint test
                                        setTimeout(() => {
                                            // Random test result
                                            const hasCSRFProtection = Math.random() > 0.5;
                                            const status = hasCSRFProtection ? 403 : 200;
                                            
                                            const result = {
                                                type: 'api',
                                                url: `${config.targetUrl}${endpoint.url}`,
                                                method: endpoint.method,
                                                vulnerable: !hasCSRFProtection,
                                                status: status,
                                                details: {
                                                    data: endpoint.data,
                                                    headers: hasCSRFProtection ? { 'csrf-token': 'required' } : {}
                                                }
                                            };
                                            
                                            if (!hasCSRFProtection) {
                                                logToConsole('error', `Endpoint ${endpoint.url} is vulnerable to CSRF attacks!`);
                                            } else {
                                                logToConsole('success', `Endpoint ${endpoint.url} is protected against CSRF attacks`);
                                            }
                                            
                                            testResults.push(result);
                                            
                                            // Generate payload if vulnerable
                                            if (config.generatePayloads && !hasCSRFProtection) {
                                                const payload = generateCSRFPayload(result, config.targetUrl);
                                                generatedPayloads.push({
                                                    name: `API ${endpoint.url}`,
                                                    html: payload
                                                });
                                            }
                                            
                                            testedEndpoints++;
                                            const progress = 60 + Math.round((testedEndpoints / totalEndpoints) * 30);
                                            updateProgress(progress, `Testing API endpoints (${testedEndpoints}/${totalEndpoints})...`);
                                            
                                            processNextEndpoint();
                                        }, 800);
                                    } else {
                                        // Finish the test
                                        finishTest(config);
                                    }
                                }
                                
                                // Start processing endpoints
                                processNextEndpoint();
                            } else {
                                // Skip API testing and finish
                                finishTest(config);
                            }
                        }, 1500);
                    } else {
                        // Skip form scanning
                        if (config.testApis && config.apiEndpoints.length > 0) {
                            // Jump to API testing
                            updateProgress(60, 'Testing API endpoints...');
                            logToConsole('info', `Skipping form scanning. Testing ${config.apiEndpoints.length} API endpoints...`);
                            
                            // ... (API testing code would be here, similar to above)
                            // For simplicity, just finish the test
                            setTimeout(() => {
                                finishTest(config);
                            }, 1500);
                        } else {
                            // No tests to run
                            updateProgress(90, 'No tests configured...');
                            logToConsole('warning', 'No tests configured. Please enable form scanning or add API endpoints to test.');
                            
                            setTimeout(() => {
                                finishTest(config);
                            }, 1000);
                        }
                    }
                }, 1200);
            }, 1000);
        }, 800);
    }
    
    // Finish the test and show results
    function finishTest(config) {
        updateProgress(100, 'Test completed!');
        logToConsole('success', 'CSRF vulnerability test completed!');
        
        // Calculate statistics
        const totalTests = testResults.length;
        const vulnerableTests = testResults.filter(r => r.vulnerable).length;
        const protectedTests = testResults.filter(r => r.vulnerable === false).length;
        const errorTests = testResults.filter(r => r.error).length;
        
        // Update results card
        totalTestsCount.textContent = totalTests;
        vulnerableCount.textContent = vulnerableTests;
        protectedCount.textContent = protectedTests;
        errorCount.textContent = errorTests;
        
        // Update summary
        if (totalTests === 0) {
            summaryText.innerHTML = 'No tests were performed. Please configure and run the test again.';
        } else {
            if (vulnerableTests > 0) {
                summaryText.innerHTML = `<strong class="text-danger">Warning!</strong> Found ${vulnerableTests} vulnerable endpoints out of ${totalTests} tested. These endpoints are susceptible to Cross-Site Request Forgery attacks.`;
            } else {
                summaryText.innerHTML = `<strong class="text-success">Good news!</strong> All ${totalTests} tested endpoints are protected against CSRF attacks.`;
            }
        }
        
        // Update vulnerability summary
        vulnerabilitySummary.innerHTML = '';
        testResults.forEach((result, index) => {
            const item = document.createElement('div');
            item.className = `vulnerability-item ${result.vulnerable ? 'vulnerable' : 'protected'}`;
            
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5>${result.method} ${result.url.replace(config.targetUrl, '')}</h5>
                        <p class="mb-0">
                            <span class="badge ${result.vulnerable ? 'bg-danger' : 'bg-success'} me-2">
                                ${result.vulnerable ? 'Vulnerable' : 'Protected'}
                            </span>
                            <span class="text-muted">
                                ${result.type.toUpperCase()} | Status: ${result.status}
                            </span>
                        </p>
                    </div>
                    ${result.vulnerable && generatedPayloads.length > 0 ? 
                      `<button class="btn btn-sm btn-outline-primary view-payload-btn" data-payload-index="${index}">
                           <i class="bi bi-code-slash me-1"></i>View Payload
                       </button>` : ''}
                </div>
                <div class="vuln-details-btn" data-bs-toggle="collapse" data-bs-target="#vulnDetails${index}">
                    <i class="bi bi-chevron-down me-1"></i>View Details
                </div>
                <div class="collapse mt-2" id="vulnDetails${index}">
                    <div class="card card-body">
                        ${result.type === 'form' ? 
                          `<p><strong>Form Fields:</strong></p>
                           <ul>
                               ${result.details.fields.map(field => 
                                   `<li>${field.name} (${field.type})</li>`
                               ).join('')}
                           </ul>` :
                          `<p><strong>Request Data:</strong></p>
                           <pre><code>${JSON.stringify(result.details.data || {}, null, 2)}</code></pre>`
                        }
                        ${result.vulnerable ? 
                          `<div class="alert alert-danger mt-2 mb-0">
                               <i class="bi bi-exclamation-triangle me-2"></i>
                               ${result.type === 'form' ? 
                                 'This form does not have CSRF protection. Add a CSRF token to prevent attacks.' :
                                 'This API endpoint accepts requests without CSRF validation.'}
                           </div>` :
                          `<div class="alert alert-success mt-2 mb-0">
                               <i class="bi bi-shield-check me-2"></i>
                               ${result.type === 'form' ? 
                                 'This form has proper CSRF protection.' :
                                 'This API endpoint validates CSRF tokens correctly.'}
                           </div>`
                        }
                    </div>
                </div>
            `;
            
            vulnerabilitySummary.appendChild(item);
        });
        
        // Update details table
        detailsTableBody.innerHTML = '';
        testResults.forEach((result, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${result.url.replace(config.targetUrl, '')}</td>
                <td>${result.method}</td>
                <td><span class="status-badge status-${result.status}">${result.status}</span></td>
                <td>
                    <span class="badge ${result.vulnerable ? 'bg-danger' : 'bg-success'}">
                        ${result.vulnerable ? 'Vulnerable' : 'Protected'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-info me-2" data-bs-toggle="collapse" data-bs-target="#details${index}">
                        <i class="bi bi-info-circle"></i>
                    </button>
                    ${result.vulnerable && generatedPayloads.length > 0 ? 
                      `<button class="btn btn-sm btn-outline-primary view-payload-btn" data-payload-index="${index}">
                           <i class="bi bi-code-slash"></i>
                       </button>` : ''}
                </td>
            `;
            detailsTableBody.appendChild(row);
            
            // Add collapsible details
            const detailsRow = document.createElement('tr');
            detailsRow.className = 'collapse';
            detailsRow.id = `details${index}`;
            detailsRow.innerHTML = `
                <td colspan="5">
                    <div class="card card-body bg-light">
                        <h6>Details:</h6>
                        <pre><code>${JSON.stringify(result.details || {}, null, 2)}</code></pre>
                    </div>
                </td>
            `;
            detailsTableBody.appendChild(detailsRow);
        });
        
        // Update payloads list
        payloadsList.innerHTML = '';
        if (generatedPayloads.length > 0) {
            generatedPayloads.forEach((payload, index) => {
                const item = document.createElement('a');
                item.href = '#';
                item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
                item.innerHTML = `
                    <div>
                        <h5 class="mb-1">CSRF Payload: ${payload.name}</h5>
                        <p class="mb-1 text-muted">HTML payload to test CSRF vulnerability</p>
                    </div>
                    <span class="badge bg-primary rounded-pill">View</span>
                `;
                
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    showPayloadModal(payload);
                });
                
                payloadsList.appendChild(item);
            });
        } else {
            payloadsList.innerHTML = `
                <div class="alert alert-info">
                    No payloads were generated. Enable the "Generate Payloads" option to create CSRF test payloads.
                </div>
            `;
        }
        
        // Update recommendations
        if (vulnerableTests > 0) {
            recommendationsText.innerHTML = `
                Your application has ${vulnerableTests} endpoints vulnerable to CSRF attacks. 
                Implement proper CSRF protection by using tokens, SameSite cookies, or other protection mechanisms.
                Review the implementation examples provided below.
            `;
        } else if (totalTests > 0) {
            recommendationsText.innerHTML = `
                Good job! Your application appears to be protected against CSRF attacks.
                Continue monitoring for new vulnerabilities and keep your security practices up to date.
            `;
        } else {
            recommendationsText.innerHTML = `
                No tests were performed. Configure and run the test to get specific recommendations.
            `;
        }
        
        // Show results
        setTimeout(() => {
            resultsCard.style.display = 'block';
            resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Highlight code blocks
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
        }, 1000);
    }
    
    // Add event listener for view payload buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.view-payload-btn')) {
            const button = e.target.closest('.view-payload-btn');
            const payloadIndex = parseInt(button.getAttribute('data-payload-index'));
            
            if (generatedPayloads[payloadIndex]) {
                showPayloadModal(generatedPayloads[payloadIndex]);
            }
        }
    });
    
    // Show payload modal
    function showPayloadModal(payload) {
        payloadModalTitle.textContent = `CSRF Payload: ${payload.name}`;
        payloadModalContent.textContent = payload.html;
        hljs.highlightBlock(payloadModalContent);
        
        const modal = new bootstrap.Modal(viewPayloadModal);
        modal.show();
    }
    
    // Update progress bar and status message
    function updateProgress(percent, message) {
        testProgressBar.style.width = `${percent}%`;
        testStatusMessage.textContent = message;
    }
    
    // Log message to console
    function logToConsole(type, message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `console-${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        testConsole.appendChild(logEntry);
        
        // Auto-scroll to bottom
        testConsole.scrollTop = testConsole.scrollHeight;
    }
    
    // Generate a CSRF payload HTML
    function generateCSRFPayload(result, baseUrl) {
        const url = result.url;
        const method = result.method;
        let data = {};
        
        if (result.type === 'form' && result.details.fields) {
            result.details.fields.forEach(field => {
                if (field.name !== '_csrf' && field.name.toLowerCase().indexOf('csrf') === -1) {
                    data[field.name] = field.type === 'password' ? 'P@ssw0rd' : 'test_value';
                }
            });
        } else if (result.type === 'api' && result.details.data) {
            data = result.details.data;
        }
        
        // Simple HTML template for the CSRF payload
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CSRF Test for ${url}</title>
</head>
<body>
    <h1>CSRF Test for ${url}</h1>
    <form id="csrf-form" action="${url}" method="${method}">
        ${Object.entries(data).map(([key, value]) => 
            `<input type="hidden" name="${key}" value="${value}">`
        ).join('\n        ')}
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
});
// CSRF-Blaster GUI - Main Script
document.addEventListener('DOMContentLoaded', function() {
    // Initialize highlight.js
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });
    
    // Initialize variables
    let testResults = [];
    let generatedPayloads = [];
    
    // DOM Elements
    const csrfTestForm = document.getElementById('csrfTestForm');
    const targetUrlInput = document.getElementById('targetUrl');
    const frameworkSelect = document.getElementById('framework');
    const timeoutInput = document.getElementById('timeoutInput');
    const verboseModeCheckbox = document.getElementById('verboseModeCheckbox');
    const scanFormsCheckbox = document.getElementById('scanFormsCheckbox');
    const testApisCheckbox = document.getElementById('testApisCheckbox');
    const generatePayloadsCheckbox = document.getElementById('generatePayloadsCheckbox');
    const apiEndpointsTable = document.getElementById('apiEndpointsTable');
    const addApiEndpointBtn = document.getElementById('addApiEndpointBtn');
    const resetFormBtn = document.getElementById('resetFormBtn');
    const startTestBtn = document.getElementById('startTestBtn');
    
    const testProgressCard = document.getElementById('testProgressCard');
    const testProgressBar = document.getElementById('testProgressBar');
    const testStatusMessage = document.getElementById('testStatusMessage');
    const testConsole = document.getElementById('testConsole');
    
    const resultsCard = document.getElementById('resultsCard');
    const totalTestsCount = document.getElementById('totalTestsCount');
    const vulnerableCount = document.getElementById('vulnerableCount');
    const protectedCount = document.getElementById('protectedCount');
    const errorCount = document.getElementById('errorCount');
    const summaryText = document.getElementById('summaryText');
    const vulnerabilitySummary = document.getElementById('vulnerabilitySummary');
    const detailsTableBody = document.getElementById('detailsTableBody');
    const payloadsList = document.getElementById('payloadsList');
    const recommendationsText = document.getElementById('recommendationsText');
    
    const exportResultsBtn = document.getElementById('exportResultsBtn');
    const runNewTestBtn = document.getElementById('runNewTestBtn');
});