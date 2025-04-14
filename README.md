# CSRF-Blaster GUI

A powerful graphical user interface for testing Cross-Site Request Forgery (CSRF) vulnerabilities in web applications.

![CSRF-Blaster GUI Screenshot](https://reviewsradar.shop/wp-content/uploads/2025/04/csrf-blaster-gui-screenshot.png)
*Note: Replace with your actual screenshot once available*

## Overview

CSRF-Blaster GUI provides an intuitive interface for security professionals and developers to test web applications for CSRF vulnerabilities. Built on top of the CSRF-Blaster core package, this GUI simplifies the process of identifying, exploiting, and documenting potential security issues.

> ⚠️ **WARNING**: This tool is intended for ethical security testing only. Always ensure you have proper authorization before testing any system.

## Features

- 🔍 **Cross-Framework Support**: Test applications built with Express.js, React, Angular, Vue.js, Next.js, Nuxt.js, and Svelte
- 🔎 **Automatic Framework Detection**: Identify the underlying technology stack of the target application
- 📝 **Form Scanner**: Automatically detect and test forms on the target website
- 🚀 **API Endpoint Testing**: Specify and test custom API routes for CSRF vulnerabilities
- 🛠️ **Payload Generation**: Create HTML payloads to demonstrate exploitable vulnerabilities
- 📊 **Visual Results**: Interpret test results through an intuitive dashboard
- 📋 **Detailed Reporting**: Get comprehensive summaries and recommendations for fixing issues
- 💾 **Export Functionality**: Save and share test results and payloads

## Installation

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Option 1: Run from source

1. Clone this repository:
```bash
git clone https://github.com/IT-Skill31/csrf-blaster-gui.git
cd csrf-blaster-gui
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### Option 2: Install as a global package

1. Install from npm:
```bash
npm install -g csrf-blaster-gui
```

2. Run from anywhere:
```bash
csrf-blaster-gui
```

## Quick Start Guide

### Basic Testing Workflow

1. Enter the target URL of the web application
2. Select the target framework or choose "Auto Detect"
3. Configure your test options
4. Add specific API endpoints to test if needed
5. Click "Start Test"
6. Review the results and generated payloads

### Example: Testing a Form

To test a form for CSRF vulnerabilities:

1. Enter the URL of the page containing the form
2. Ensure "Scan Forms" is checked in test options
3. Click "Start Test"
4. View the results to see if the form is protected against CSRF

See [form-example.html](examples/form-example.html) for a sample vulnerable form you can use for testing.

### Example: Testing an API

To test an API endpoint:

1. Click "Add Endpoint" in the "API Endpoints to Test" section
2. Enter the endpoint path (e.g., `/api/update-profile`)
3. Select the HTTP method (e.g., POST)
4. Enter the request data in JSON format (e.g., `{"name":"Test","email":"test@example.com"}`)
5. Ensure "Test API Endpoints" is checked
6. Click "Start Test"

See [api-example.html](examples/api-example.html) for a sample API endpoint you can use for testing.

## Advanced Usage

### Custom Test Configuration

Adjust these settings for more precise testing:

* **Timeout**: Increase for slower applications
* **Verbose Mode**: Enable for detailed logs
* **Generate Payloads**: Create HTML files to demonstrate vulnerabilities

### Interpreting Results

The results dashboard provides:

* **Summary**: High-level overview of vulnerable and protected endpoints
* **Details**: Comprehensive information about each tested endpoint
* **Payloads**: Generated HTML files that exploit discovered vulnerabilities
* **Recommendations**: Framework-specific guidance for implementing CSRF protection

### Exporting Results

After completing a test:

1. Click "Export Results" to download a JSON file
2. Use the JSON file for documentation or sharing with your team
3. Individual payloads can also be downloaded or copied from the Payloads tab

## Recommendations for CSRF Protection

### For Express.js Applications

```javascript
const express = require('express');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const app = express();

// Setup middleware
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(csrf({ cookie: true }));

// Add CSRF token to all rendered templates
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// In your HTML forms:
// <input type="hidden" name="_csrf" value="{{ csrfToken }}">

// Error handler for CSRF errors
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).send('CSRF validation failed');
  }
  next(err);
});
```

### For Modern Frontend Frameworks

```javascript
// Include CSRF token in all API requests
const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify(data)
});
```

## Troubleshooting

### Common Issues

* **No Forms Detected**: Ensure the forms use standard HTML form elements
* **Connection Errors**: Check if the target URL is accessible and correct
* **Timeout Errors**: Increase the timeout value for slower applications
* **API Test Failing**: Verify the API endpoint path and request format

### Browser Compatibility

CSRF-Blaster GUI works best with:
* Google Chrome (recommended)
* Mozilla Firefox
* Microsoft Edge

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security

If you discover a security vulnerability, please send an email to [your-email]. All security vulnerabilities will be promptly addressed.

## Acknowledgements

* Built on top of the [CSRF-Blaster](https://github.com/IT-Skill31/csrf-blaster) package
* Interface designed with [Bootstrap](https://getbootstrap.com/)
* Testing powered by [Puppeteer](https://pptr.dev/)