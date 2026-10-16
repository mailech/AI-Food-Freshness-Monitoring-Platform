const puppeteer = require('puppeteer-core');
const path = require('path');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const HTML_FILE = 'file:///' + path.resolve(__dirname, '../frontend/fresh-os-website/dashboard.html').replace(/\\/g, '/');

function getAuthToken(email, password) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ email, password });
        const req = http.request({
            hostname: '127.0.0.1',
            port: 8000,
            path: '/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed);
                } catch(e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function testUser(email, roleName) {
    console.log(`\n======================================================`);
    console.log(`TESTING USER: ${email} (${roleName})`);
    console.log(`======================================================`);

    const authRes = await getAuthToken(email, 'Password123!');
    const token = authRes.access_token;
    const user = authRes.user;
    console.log('Login successful. Token:', token ? 'GOT_TOKEN' : 'NO_TOKEN');

    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', msg => {
        console.log(`  [CONSOLE ${msg.type()}]`, msg.text());
    });

    page.on('pageerror', err => {
        console.error('  [PAGE ERROR]', err.message);
    });

    page.on('requestfailed', req => {
        console.log(`  [REQ FAILED] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    // Set auth before navigation
    await page.evaluateOnNewDocument((t, u) => {
        sessionStorage.setItem('fresh_os_token', t);
        sessionStorage.setItem('fresh_os_user', JSON.stringify(u));
        localStorage.setItem('fresh_os_token', t);
        localStorage.setItem('fresh_os_user', JSON.stringify(u));
        localStorage.setItem('fresh_os_remembered', 'true');
    }, token, user);

    await page.goto(HTML_FILE, { waitUntil: 'networkidle0' });
    console.log('Page loaded URL:', page.url());

    // Wait 1 second
    await new Promise(r => setTimeout(r, 1000));

    // Find the bell
    const bell = await page.$('#notificationBellBtn');
    console.log('Bell element found:', !!bell);

    if (bell) {
        // Check unread badge text
        const badgeText = await page.evaluate(b => {
            const badge = b.querySelector('.notification-badge-dot') || b.querySelector('span.rounded-full');
            return badge ? badge.textContent : 'none';
        }, bell);
        console.log('Bell badge text:', badgeText);

        console.log('Clicking notification bell...');
        await bell.click();
        await new Promise(r => setTimeout(r, 1000));

        // Check dropdown status
        const dropdownInfo = await page.evaluate(() => {
            const d = document.getElementById('freshOsNotificationDropdown');
            if (!d) return { exists: false };
            const style = window.getComputedStyle(d);
            const rect = d.getBoundingClientRect();
            const list = document.getElementById('notifListContainer');
            return {
                exists: true,
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity,
                zIndex: style.zIndex,
                rect: { top: rect.top, right: rect.right, width: rect.width, height: rect.height },
                listContent: list ? list.innerText : 'NO_LIST_CONTAINER'
            };
        });

        console.log('Dropdown Info:', JSON.stringify(dropdownInfo, null, 2));

        // Save screenshot
        const screenshotPath = path.resolve(__dirname, `screenshot_${roleName}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log('Screenshot saved to:', screenshotPath);
    }

    await browser.close();
}

async function run() {
    await testUser('demo@freshos.com', 'retail_manager');
    await testUser('consumer@freshos.com', 'consumer');
}

run().catch(console.error);
