/**
 * MISA meInvoice Google Apps Script Integration
 * 
 * Tích hợp API MISA meInvoice vào Google Sheets
 * Repository: https://github.com/your-username/misa-meinvoice-gas
 * 
 * @author Your Name
 * @version 1.0.0
 * @license MIT
 */

// ==================== CONFIGURATION ====================

/**
 * Cấu hình API MISA meInvoice
 * 
 * Lấy thông tin từ:
 * - APP_ID, CLIENT_ID: MISA cung cấp
 * - COMPANY_TAX_CODE: MST doanh nghiệp
 * - USERNAME: Email đăng nhập dịch vụ
 * - PASSWORD: Mật khẩu
 * 
 * Khuyến nghị: Lưu trong Script Properties thay vì hardcode
 */
const CONFIG = {
  // 🔴 CẬP NHẬT THÔNG TIN ĐÂY:
  APP_ID: 'your-app-id-here',
  CLIENT_ID: 'your-client-id-here',
  COMPANY_TAX_CODE: '0101243xxx',
  USERNAME: 'your-email@email.com',
  PASSWORD: 'your-password',
  
  // Môi trường: 'test' hoặc 'production'
  ENVIRONMENT: 'test',
  
  // URLs
  BASE_URL_TEST: 'https://testapp.meinvoice.vn/',
  BASE_URL2_TEST: 'https://testapi.meinvoice.vn/api2',
  BASE_URL_PROD: 'https://app.meinvoice.vn/',
  BASE_URL2_PROD: 'https://api.meinvoice.vn/api2',
  
  // Timeout (milliseconds)
  TIMEOUT: 30000,
  
  // Cache duration (seconds)
  CACHE_DURATION: 3600
};

// ==================== INITIALIZATION ====================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('🧾 MISA meInvoice')
    .addItem('🔐 Authenticate', 'menuAuthenticate')
    .addSeparator()
    .addItem('📋 Get Invoices', 'menuGetInvoices')
    .addItem('🔍 Get Invoice Detail', 'menuGetInvoiceDetail')
    .addItem('📊 Get Organizations', 'menuGetOrganizations')
    .addSeparator()
    .addItem('✏️ Update Accounting', 'menuUpdateAccounting')
    .addItem('💳 Update Payment', 'menuUpdatePayment')
    .addSeparator()
    .addItem('🏭 Get Suppliers', 'menuGetSuppliers')
    .addSeparator()
    .addItem('⚙️ Config', 'menuShowConfig')
    .addItem('🗑️ Clear Cache', 'menuClearCache')
    .addToUi();
  
  Logger.log('✅ MISA meInvoice menu loaded');
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get base URL by environment
 */
function getBaseUrl() {
  return CONFIG.ENVIRONMENT === 'test' 
    ? CONFIG.BASE_URL_TEST 
    : CONFIG.BASE_URL_PROD;
}

/**
 * Get base URL2 by environment
 */
function getBaseUrl2() {
  return CONFIG.ENVIRONMENT === 'test' 
    ? CONFIG.BASE_URL2_TEST 
    : CONFIG.BASE_URL2_PROD;
}

/**
 * Save data to Properties
 */
function setProperty(key, value) {
  PropertiesService.getUserProperties().setProperty(
    key, 
    JSON.stringify(value)
  );
}

/**
 * Get data from Properties
 */
function getProperty(key) {
  const value = PropertiesService.getUserProperties().getProperty(key);
  return value ? JSON.parse(value) : null;
}

/**
 * Delete data from Properties
 */
function deleteProperty(key) {
  PropertiesService.getUserProperties().deleteProperty(key);
}

/**
 * Make HTTP request
 */
function makeRequest(url, method = 'GET', headers = {}, payload = null) {
  const options = {
    method: method,
    headers: headers,
    muteHttpExceptions: true,
    timeout: CONFIG.TIMEOUT
  };
  
  if (payload) {
    options.payload = JSON.stringify(payload);
  }
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = {
      status: response.getResponseCode(),
      headers: response.getHeaders(),
      content: response.getContentText()
    };
    
    try {
      result.data = JSON.parse(response.getContentText());
    } catch (e) {
      result.data = response.getContentText();
    }
    
    return result;
  } catch (error) {
    Logger.log(`❌ Error fetching ${url}: ${error.toString()}`);
    return {
      status: 0,
      error: error.toString(),
      data: null
    };
  }
}

/**
 * Log message
 */
function log(message) {
  const timestamp = new Date().toLocaleString('vi-VN');
  Logger.log(`[${timestamp}] ${message}`);
}

// ==================== AUTHENTICATION ====================

/**
 * Get Secure Token - Step 1
 */
function getSecureToken() {
  log('🔐 Getting Secure Token...');
  
  const url = getBaseUrl2() + '/validateuser';
  const headers = {
    'AppID': CONFIG.APP_ID,
    'CompanyTaxCode': CONFIG.COMPANY_TAX_CODE,
    'UserName': CONFIG.USERNAME,
    'Content-Type': 'application/json'
  };
  
  const payload = { PassWord: CONFIG.PASSWORD };
  const response = makeRequest(url, 'POST', headers, payload);
  
  if (response.status === 200 && response.data && response.data.Success) {
    const parts = response.data.Data.split(';');
    const secureToken = parts.length > 1 ? parts[1].trim() : response.data.Data;
    
    setProperty('secureToken', secureToken);
    log(`✅ Secure Token obtained: ${secureToken.substring(0, 20)}...`);
    return secureToken;
  } else {
    log(`❌ Error: ${response.data?.Message || response.error}`);
    return null;
  }
}

/**
 * Get JWT Token - Step 2
 */
function getJwtToken() {
  log('🔐 Getting JWT Token...');
  
  let secureToken = getProperty('secureToken');
  
  if (!secureToken) {
    secureToken = getSecureToken();
  }
  
  if (!secureToken) {
    log('❌ No Secure Token available');
    return null;
  }
  
  const url = getBaseUrl2() + '/auth/jwttoken';
  const headers = {
    'AppID': CONFIG.APP_ID,
    'CompanyTaxCode': CONFIG.COMPANY_TAX_CODE,
    'UserName': CONFIG.USERNAME,
    'securetoken': secureToken,
    'Content-Type': 'application/json'
  };
  
  const response = makeRequest(url, 'POST', headers);
  
  if (response.status === 200 && response.data && response.data.Success) {
    const jwtData = response.data.Data;
    setProperty('jwtToken', jwtData.AccessToken);
    setProperty('jwtTokenType', jwtData.TokenType || 'Bearer');
    
    log(`✅ JWT Token obtained: ${jwtData.AccessToken.substring(0, 20)}...`);
    return {
      accessToken: jwtData.AccessToken,
      tokenType: jwtData.TokenType || 'Bearer'
    };
  } else {
    log(`❌ Error: ${response.data?.Message || response.error}`);
    return null;
  }
}

/**
 * Get Subscribers - Step 3
 */
function getSubscribers() {
  log('📋 Getting Subscribers...');
  
  const url = getBaseUrl() + `inbot/api/subscribers/code/${CONFIG.COMPANY_TAX_CODE}`;
  const headers = {
    'ClientId': CONFIG.CLIENT_ID
  };
  
  const response = makeRequest(url, 'GET', headers);
  
  if (response.status === 200 && response.data && response.data.Success) {
    const subscriberId = response.data.Data.Id;
    setProperty('subscriberId', subscriberId);
    log(`✅ Subscribers obtained: ${subscriberId.substring(0, 20)}...`);
    return subscriberId;
  } else {
    log(`❌ Error: ${response.data?.Message || response.error}`);
    return null;
  }
}

/**
 * Get Organizations - Step 4
 */
function getOrganizations() {
  log('🏢 Getting Organizations...');
  
  let subscriberId = getProperty('subscriberId');
  
  if (!subscriberId) {
    subscriberId = getSubscribers();
  }
  
  if (!subscriberId) {
    log('❌ No Subscribers ID');
    return null;
  }
  
  let jwtToken = getProperty('jwtToken');
  
  if (!jwtToken) {
    const jwt = getJwtToken();
    jwtToken = jwt?.accessToken;
  }
  
  if (!jwtToken) {
    log('❌ No JWT Token');
    return null;
  }
  
  const url = getBaseUrl() + `inbot/api/${subscriberId}/organizations`;
  const headers = {
    'ClientId': CONFIG.CLIENT_ID,
    'Authorization': `Bearer ${jwtToken}`
  };
  
  const response = makeRequest(url, 'GET', headers);
  
  if (response.status === 200 && response.data && response.data.Success) {
    const organizations = response.data.Data || [];
    setProperty('organizations', organizations);
    log(`✅ ${organizations.length} Organizations obtained`);
    return organizations;
  } else {
    log(`❌ Error: ${response.data?.Message || response.error}`);
    return null;
  }
}

/**
 * Full authentication
 */
function authenticate() {
  log('🔐 STARTING AUTHENTICATION...');
  
  try {
    const secureToken = getSecureToken();
    if (!secureToken) return false;
    
    const jwtData = getJwtToken();
    if (!jwtData) return false;
    
    const subscriberId = getSubscribers();
    if (!subscriberId) return false;
    
    const organizations = getOrganizations();
    if (!organizations) return false;
    
    log('✅ AUTHENTICATION SUCCESSFUL!');
    return true;
  } catch (error) {
    log(`❌ Authentication error: ${error.toString()}`);
    return false;
  }
}

// ==================== INVOICES ====================

/**
 * Get invoices by modified time
 */
function getInvoicesByModifiedTime(organizationId, fromDate, toDate, take = 20, skip = 0, filterInvDate = false) {
  log(`📋 Getting invoices from ${fromDate} to ${toDate}...`);
  
  let subscriberId = getProperty('subscriberId');
  let jwtToken = getProperty('jwtToken');
  
  if (!subscriberId || !jwtToken) {
    log('❌ Not authenticated');
    return null;
  }
  
  const url = getBaseUrl() + `inbot/api/${subscriberId}/${organizationId}/invoices/v2/modified`;
  const headers = {
    'ClientId': CONFIG.CLIENT_ID,
    'Authorization': `Bearer ${jwtToken}`
  };
  
  const params = `?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&take=${Math.min(take, 100)}&skip=${skip}&IsFilterInvDate=${filterInvDate}`;
  
  const response = makeRequest(url + params, 'GET', headers);
  
  if (response.status === 200 && response.data && response.data.Success) {
    const data = response.data.Data || {};
    log(`✅ Found ${data.Data?.length || 0}/${data.Total || 0} invoices`);
    return data;
  } else {
    log(`❌ Error: ${response.data?.Message || response.error}`);
    return null;
  }
}

/**
 * Get invoice detail
 */
function getInvoiceDetail(organizationId, invoiceId) {
  log(`🔍 Getting invoice detail: ${invoiceId}...`);
  
  let subscriberId = getProperty('subscriberId');
  let jwtToken = getProperty('jwtToken');
  
  if (!subscriberId || !jwtToken) {
    return null;
  }
  
  const url = getBaseUrl() + `inbot/api/${subscriberId}/${organizationId}/invoices/${invoiceId}`;
  const headers = {
    'ClientId': CONFIG.CLIENT_ID,
    'Authorization': `Bearer ${jwtToken}`
  };
  
  const response = makeRequest(url, 'GET', headers);
  
  if (response.status === 200 && response.data && response.data.Success) {
    log('✅ Invoice detail obtained');
    return response.data.Data;
  } else {
    log(`❌ Error: ${response.data?.Message || response.error}`);
    return null;
  }
}

/**
 * Get out invoices by modified time
 */
function getOutInvoicesByModifiedTime(organizationId, fromDate, toDate, take = 20, skip = 0, filterInvDate = false) {
  log(`📋 Getting out invoices from ${fromDate} to ${toDate}...`);
  
  let subscriberId = getProperty('subscriberId');
  let jwtToken = getProperty('jwtToken');
  
  if (!subscriberId || !jwtToken) {
    return null;
  }
  
  const url = getBaseUrl() + `inbot/api/${subscriberId}/${organizationId}/OutInvoices/modified`;
  const headers = {
    'ClientId': CONFIG.CLIENT_ID,
    'Authorization': `Bearer ${jwtToken}`
  };
  
  const params = `?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&take=${Math.min(take, 100)}&skip=${skip}&IsFilterInvDate=${filterInvDate}`;
  
  const response = makeRequest(url + params, 'GET', headers);
  
  if (response.status === 200 && response.data && response.data.Success) {
    const data = response.data.Data || {};
    log(`✅ Found ${data.Data?.length || 0}/${data.Total || 0} out invoices`);
    return data;
  } else {
    log(`❌ Error: ${response.data?.Message || response.error}`);
    return null;
  }
}

// ==================== UPDATE FUNCTIONS ====================

/**
 * Update accounting date
 */
function updateAccountingDate(organizationId, invoiceId, accountant, accountingDate, refNo) {
  log(`📝 Updating accounting date for ${invoiceId}...`);
  
  let subscriberId = getProperty('subscriberId');
  let jwtToken = getProperty('jwtToken');
  
  if (!subscriberId || !jwtToken) {
    return null;
  }
  
  const url = getBaseUrl() + `inbot/api/${subscriberId}/${organizationId}/invoices/invoiceaccountingdateV2`;
  const headers = {
    'ClientId': CONFIG.CLIENT_ID,
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  };
  
  const payload = {
    Accountant: accountant,
    AccountingDate: accountingDate,
    InvoiceId: invoiceId,
    RefNo: refNo
  };
  
  const response = makeRequest(url, 'POST', headers, payload);
  
  if (response.status === 200 && response.data && response.data.Success) {
    log('✅ Accounting date updated');
    return true;
  } else {
    log(`❌ Error: ${response.data?.Message || response.error}`);
    return false;
  }
}

/**
 * Update payment info
 */
function updatePaymentInfo(organizationId, invoiceId, paymentDate, paymentPair, 
                          totalAmountPayment, totalAmountNotPayment, amountPaymentStatus) {
  log(`💳 Updating payment for ${invoiceId}...`);
  
  let subscriberId = getProperty('subscriberId');
  let jwtToken = getProperty('jwtToken');
  
  if (!subscriberId || !jwtToken) {
    return null;
  }
  
  const url = getBaseUrl() + `inbot/api/${subscriberId}/${organizationId}/invoices/invoicepayment`;
  const headers = {
    'ClientId': CONFIG.CLIENT_ID,
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  };
  
  const payload = {
    InvoiceId: invoiceId,
    PaymentDate: paymentDate,
    PaymentPair: paymentPair,
    TotalAmountPayment: totalAmountPayment,
    TotalAmountNotPayment: totalAmountNotPayment,
    NumberPaymentNext: '',
    AmountPayment: amountPaymentStatus
  };
  
  const response = makeRequest(url, 'POST', headers, payload);
  
  if (response.status === 200 && response.data && response.data.Success) {
    log('✅ Payment info updated');
    return true;
  } else {
    log(`❌ Error: ${response.data?.Message || response.error}`);
    return false;
  }
}

// ==================== SUPPLIERS ====================

/**
 * Get suppliers
 */
function getSuppliers(organizationId, skip = 0, take = 20) {
  log('🏭 Getting suppliers...');
  
  let subscriberId = getProperty('subscriberId');
  let jwtToken = getProperty('jwtToken');
  
  if (!subscriberId || !jwtToken) {
    return null;
  }
  
  const url = getBaseUrl() + `inbot/api/${subscriberId}/${organizationId}/supplier`;
  const headers = {
    'ClientId': CONFIG.CLIENT_ID,
    'Authorization': `Bearer ${jwtToken}`
  };
  
  const params = `?skip=${skip}&take=${Math.min(take, 100)}`;
  
  const response = makeRequest(url + params, 'GET', headers);
  
  if (response.status === 200 && response.data && response.data.Success) {
    const data = response.data.Data || {};
    log(`✅ Found ${data.Data?.length || 0}/${data.Total || 0} suppliers`);
    return data;
  } else {
    log(`❌ Error: ${response.data?.Message || response.error}`);
    return null;
  }
}

// ==================== SHEET FUNCTIONS ====================

/**
 * Get invoices and add to sheet
 */
function getInvoicesIntoSheet(organizationId, fromDate, toDate) {
  const data = getInvoicesByModifiedTime(organizationId, fromDate, toDate, 100);
  
  if (!data || !data.Data) {
    return [['❌ No data found']];
  }
  
  const headers = [
    'Invoice No', 'Series', 'Date', 'Seller', 'Seller Tax Code', 'Buyer', 
    'Buyer Tax Code', 'Total Amount', 'VAT', 'Status'
  ];
  
  const rows = data.Data.map(inv => [
    inv.InvoiceNo,
    inv.Series,
    inv.InvoiceDate,
    inv.SellerName,
    inv.SellerTaxCode,
    inv.BuyerName,
    inv.BuyerTaxCode,
    inv.TotalAmount,
    inv.TotalVATAmount,
    inv.StatusInvoice
  ]);
  
  return [headers, ...rows];
}

/**
 * Custom function for Google Sheets
 */
function MISA_GET_INVOICES(organizationId, fromDate, toDate) {
  return getInvoicesIntoSheet(organizationId, fromDate, toDate);
}

/**
 * Custom function for Google Sheets
 */
function MISA_GET_INVOICE_DETAIL(organizationId, invoiceId, field) {
  const invoice = getInvoiceDetail(organizationId, invoiceId);
  
  if (!invoice) {
    return '❌ Invoice not found';
  }
  
  return invoice[field] || 'N/A';
}

/**
 * Custom function for Google Sheets
 */
function MISA_GET_ORGANIZATIONS() {
  let orgs = getProperty('organizations');
  
  if (!orgs) {
    orgs = getOrganizations();
  }
  
  if (!orgs) {
    return [['❌ No organizations found']];
  }
  
  const headers = ['Name', 'ID', 'Tax Code'];
  const rows = orgs.map(org => [
    org.Name,
    org.Id,
    org.TaxCode
  ]);
  
  return [headers, ...rows];
}

// ==================== MENU FUNCTIONS ====================

/**
 * Menu: Authenticate
 */
function menuAuthenticate() {
  const ui = SpreadsheetApp.getUi();
  
  if (authenticate()) {
    ui.alert('✅ Authentication successful!');
  } else {
    ui.alert('❌ Authentication failed. Check CONFIG.');
  }
}

/**
 * Menu: Get Invoices
 */
function menuGetInvoices() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.prompt('Enter date range (format: 2024-01-01|2024-01-31):');
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const input = response.getResponseText();
    const [fromDate, toDate] = input.split('|');
    
    if (!fromDate || !toDate) {
      ui.alert('❌ Invalid format!');
      return;
    }
    
    const orgs = getProperty('organizations');
    if (!orgs || orgs.length === 0) {
      ui.alert('❌ No organizations. Authenticate first!');
      return;
    }
    
    const orgId = orgs[0].Id;
    const data = getInvoicesIntoSheet(orgId, fromDate, toDate);
    
    const sheet = SpreadsheetApp.getActiveSheet();
    sheet.clear();
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    
    ui.alert(`✅ Added ${data.length - 1} invoices!`);
  }
}

/**
 * Menu: Get Organizations
 */
function menuGetOrganizations() {
  const ui = SpreadsheetApp.getUi();
  
  const data = MISA_GET_ORGANIZATIONS();
  
  const sheet = SpreadsheetApp.getActiveSheet();
  sheet.clear();
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  
  ui.alert(`✅ Added ${data.length - 1} organizations!`);
}

/**
 * Menu: Get Invoice Detail
 */
function menuGetInvoiceDetail() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.prompt('Enter Organization ID and Invoice ID (format: org-id|invoice-id):');
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const [orgId, invId] = response.getResponseText().split('|');
    const invoice = getInvoiceDetail(orgId.trim(), invId.trim());
    
    if (!invoice) {
      ui.alert('❌ Invoice not found');
      return;
    }
    
    ui.alert(`Invoice: ${invoice.InvoiceNo}\nTotal: ${invoice.TotalAmount}`);
  }
}

/**
 * Menu: Update Accounting
 */
function menuUpdateAccounting() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.prompt('Enter: org-id|invoice-id|accountant|date|ref-no');
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const parts = response.getResponseText().split('|');
    if (parts.length < 5) {
      ui.alert('❌ Invalid format!');
      return;
    }
    
    const result = updateAccountingDate(
      parts[0].trim(),
      parts[1].trim(),
      parts[2].trim(),
      parts[3].trim(),
      parts[4].trim()
    );
    
    ui.alert(result ? '✅ Updated!' : '❌ Failed!');
  }
}

/**
 * Menu: Update Payment
 */
function menuUpdatePayment() {
  const ui = SpreadsheetApp.getUi();
  
  ui.alert('Please use MISA_UPDATE_PAYMENT custom function in cells');
}

/**
 * Menu: Get Suppliers
 */
function menuGetSuppliers() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.prompt('Enter Organization ID:');
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const orgId = response.getResponseText().trim();
    const data = getSuppliers(orgId);
    
    if (!data || !data.Data) {
      ui.alert('❌ No suppliers found');
      return;
    }
    
    const headers = ['Code', 'Name', 'Tax Code', 'Total Invoices'];
    const rows = data.Data.map(s => [
      s.SupplierCode,
      s.Name,
      s.TaxCode,
      s.TotalInvoice
    ]);
    
    const sheet = SpreadsheetApp.getActiveSheet();
    sheet.clear();
    sheet.getRange(1, 1, rows.length + 1, headers.length).setValues([headers, ...rows]);
    
    ui.alert(`✅ Added ${rows.length} suppliers!`);
  }
}

/**
 * Menu: Show Config
 */
function menuShowConfig() {
  const ui = SpreadsheetApp.getUi();
  
  const html = `
    <h3>⚙️ MISA meInvoice Config</h3>
    <p>
      <strong>APP_ID:</strong> ${CONFIG.APP_ID}<br>
      <strong>CLIENT_ID:</strong> ${CONFIG.CLIENT_ID}<br>
      <strong>COMPANY_TAX_CODE:</strong> ${CONFIG.COMPANY_TAX_CODE}<br>
      <strong>USERNAME:</strong> ${CONFIG.USERNAME}<br>
      <strong>ENVIRONMENT:</strong> ${CONFIG.ENVIRONMENT}<br>
    </p>
    <p>Edit CONFIG object in code to change settings.</p>
  `;
  
  ui.showModelessDialog(HtmlService.createHtmlOutput(html), 'Config');
}

/**
 * Menu: Clear Cache
 */
function menuClearCache() {
  const ui = SpreadsheetApp.getUi();
  
  deleteProperty('secureToken');
  deleteProperty('jwtToken');
  deleteProperty('subscriberId');
  deleteProperty('organizations');
  
  ui.alert('✅ Cache cleared!');
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate configuration
 */
function validateConfig() {
  const errors = [];
  
  if (!CONFIG.APP_ID || CONFIG.APP_ID === 'your-app-id-here') {
    errors.push('APP_ID not configured');
  }
  
  if (!CONFIG.CLIENT_ID || CONFIG.CLIENT_ID === 'your-client-id-here') {
    errors.push('CLIENT_ID not configured');
  }
  
  if (!CONFIG.COMPANY_TAX_CODE || CONFIG.COMPANY_TAX_CODE === '0101243xxx') {
    errors.push('COMPANY_TAX_CODE not configured');
  }
  
  if (!CONFIG.USERNAME || CONFIG.USERNAME === 'your-email@email.com') {
    errors.push('USERNAME not configured');
  }
  
  if (!CONFIG.PASSWORD || CONFIG.PASSWORD === 'your-password') {
    errors.push('PASSWORD not configured');
  }
  
  if (errors.length > 0) {
    log('❌ Configuration errors:');
    errors.forEach(err => log(`  - ${err}`));
    return false;
  }
  
  log('✅ Configuration valid');
  return true;
}

/**
 * Test connection
 */
function testConnection() {
  log('🧪 Testing MISA API connection...');
  
  if (!validateConfig()) {
    return false;
  }
  
  return authenticate();
}

// ==================== DEBUG ====================

function test() {
  log('Starting test...');
  
  if (!validateConfig()) {
    return;
  }
  
  if (authenticate()) {
    const orgs = getProperty('organizations');
    if (orgs && orgs.length > 0) {
      const orgId = orgs[0].Id;
      log(`Testing with organization: ${orgs[0].Name}`);
      
      const invoices = getInvoicesByModifiedTime(
        orgId,
        '2024-01-01',
        '2024-01-31',
        5
      );
      
      if (invoices) {
        log(`✅ Found ${invoices.Data?.length || 0} invoices`);
      }
    }
  }
  
  log('Test complete!');
}
