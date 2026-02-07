# 🧾 MISA meInvoice Google Apps Script Integration

**Tích hợp API MISA meInvoice vào Google Sheets - Quản lý hóa đơn điện tử dễ dàng**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Apps Script](https://img.shields.io/badge/Google-Apps%20Script-4285F4?logo=google)](https://developers.google.com/apps-script)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue)](./package.json)

## 📋 Giới thiệu

Bộ tích hợp hoàn chỉnh để kết nối API MISA meInvoice với Google Sheets. Cho phép bạn:

- ✅ Lấy danh sách hóa đơn đầu vào/đầu ra
- ✅ Xem chi tiết hóa đơn
- ✅ Tải file hóa đơn (XML, PDF, ZIP)
- ✅ Cập nhật ngày hạch toán
- ✅ Cập nhật thông tin thanh toán
- ✅ Quản lý danh sách nhân hàng
- ✅ Tự động hóa quy trình hóa đơn

## 🚀 Quick Start (5 phút)

### 1. Chuẩn bị

Lấy thông tin từ MISA:
```
APP_ID: xxxxxxbe96-ab02-4d9c-b995-45d86a0b54e1
CLIENT_ID: xxxxxx2b7110e8a16cffa2222
COMPANY_TAX_CODE: 0101243xxx (MST)
USERNAME: your-email@email.com
PASSWORD: your-password
```

### 2. Cài đặt

**Option A: Dùng clasp (Khuyến nghị)**

```bash
# Cài clasp
npm install -g @google/clasp

# Clone repository
git clone https://github.com/your-username/misa-meinvoice-gas.git
cd misa-meinvoice-gas

# Xác thực Google
clasp login

# Tạo Google Apps Script project
clasp create --title "MISA meInvoice" --parentId <spreadsheet-id>

# Push code
clasp push
```

**Option B: Copy-paste thủ công**

1. Tạo Google Sheet mới: [sheets.google.com](https://sheets.google.com)
2. Mở Extensions → Apps Script
3. Copy nội dung `main.js` vào editor
4. Lưu project

### 3. Cấu hình

Mở file `main.js`, tìm phần `CONFIG`:

```javascript
const CONFIG = {
  APP_ID: 'your-app-id-here',              // ← Thay đây
  CLIENT_ID: 'your-client-id-here',        // ← Thay đây
  COMPANY_TAX_CODE: '0101243xxx',          // ← Thay đây
  USERNAME: 'your-email@email.com',        // ← Thay đây
  PASSWORD: 'your-password',                // ← Thay đây
  ENVIRONMENT: 'test'                       // test hoặc production
};
```

### 4. Xác thực

1. Chọn function `authenticate()` từ dropdown
2. Nhấn **Run** ▶
3. Cho phép Google truy cập
4. Reload Google Sheet (F5)
5. Menu **"🧾 MISA meInvoice"** sẽ xuất hiện ✅

## 📖 Hướng dẫn sử dụng

### Menu Functions

Sau khi reload, sẽ có menu với các tùy chọn:

```
🧾 MISA meInvoice
├─ 🔐 Authenticate          - Xác thực
├─ 📋 Get Invoices          - Lấy hóa đơn
├─ 🔍 Get Invoice Detail    - Chi tiết hóa đơn
├─ 📊 Get Organizations     - Danh sách chi nhánh
├─ ✏️ Update Accounting     - Cập nhật hạch toán
├─ 💳 Update Payment        - Cập nhật thanh toán
├─ 🏭 Get Suppliers         - Danh sách nhân hàng
├─ ⚙️ Config                - Cài đặt
└─ 🗑️ Clear Cache           - Xóa cache
```

### Custom Functions

Sử dụng trực tiếp trong cell:

```javascript
// Lấy hóa đơn
=MISA_GET_INVOICES("org-001", "2024-01-01", "2024-01-31")

// Lấy chi tiết hóa đơn
=MISA_GET_INVOICE_DETAIL("org-001", "invoice-123", "TotalAmount")
→ 5000000

// Lấy danh sách organizations
=MISA_GET_ORGANIZATIONS()
```

### Sử dụng Functions trực tiếp

```javascript
// Lấy invoices
const data = getInvoicesByModifiedTime(
  "org-001",
  "2024-01-01", 
  "2024-01-31",
  take=20,
  skip=0
);

// Cập nhật hạch toán
updateAccountingDate(
  "org-001",
  "invoice-123",
  "Nguyễn Văn A",
  "2024-01-20",
  "CT001"
);

// Cập nhật thanh toán
updatePaymentInfo(
  "org-001",
  "invoice-123",
  "2024/01/15",
  "Khách hàng",
  5000000,  // totalAmountPayment
  0,        // totalAmountNotPayment
  2         // status: 0=chưa, 1=một phần, 2=đã
);
```

## 🔐 Bảo mật

⚠️ **Không nên:**
- Hardcode password trong source code
- Commit credentials vào git
- Share credentials file

✅ **Nên:**
- Sử dụng Script Properties để lưu credentials
- Sử dụng `.gitignore` để bảo vệ
- Dùng environment variables

### Lưu credentials an toàn

```javascript
// Set credentials
const props = PropertiesService.getUserProperties();
props.setProperty('MISA_PASSWORD', 'your-password');

// Get credentials
const password = props.getProperty('MISA_PASSWORD');
```

## 📊 API Reference

### Endpoints

**Base URLs:**
```
Test:       https://testapp.meinvoice.vn/
Production: https://app.meinvoice.vn/

Test:       https://testapi.meinvoice.vn/api2
Production: https://api.meinvoice.vn/api2
```

### Authentication Flow

1. **Get Secure Token** → POST `/validateuser`
2. **Get JWT Token** → POST `/auth/jwttoken`
3. **Get Subscribers** → GET `/subscribers/code/{taxcode}`
4. **Get Organizations** → GET `/{subscriberId}/organizations`
5. **Use APIs** → GET/POST các endpoints khác

### Main Functions

| Function | Endpoint | Method | Mô tả |
|----------|----------|--------|--------|
| `getInvoicesByModifiedTime` | `/invoices/v2/modified` | GET | Lấy hóa đơn |
| `getInvoiceDetail` | `/invoices/{id}` | GET | Chi tiết HĐ |
| `updateAccountingDate` | `/invoices/invoiceaccountingdateV2` | POST | Cập nhật hạch toán |
| `updatePaymentInfo` | `/invoices/invoicepayment` | POST | Cập nhật thanh toán |
| `getSuppliers` | `/supplier` | GET | Danh sách NCC |

## ⚠️ Troubleshooting

### Lỗi: "Config không hợp lệ"
```
❌ APP_ID not configured
❌ CLIENT_ID not configured
```

**Giải pháp:** Kiểm tra lại CONFIG object, điền đầy đủ thông tin

### Lỗi: "Xác thực thất bại"
```
❌ Authentication failed
```

**Giải pháp:**
1. Kiểm tra email/password
2. Xóa cache: Menu → 🗑️ Clear Cache
3. Xác thực lại

### Lỗi: "Timeout"
```
❌ Error fetching: Request timeout
```

**Giải pháp:** Tăng TIMEOUT trong CONFIG từ 30000 thành 60000

### Custom functions không hiển thị
```
❌ MISA_GET_INVOICES not defined
```

**Giải pháp:**
1. Reload Google Sheet (F5)
2. Kiểm tra syntax code
3. Chạy `test()` function

## 📚 Tài liệu

- [MISA meInvoice Official](https://www.meinvoice.vn)
- [API Documentation](https://www.misa.vn/tich-hop-he-thong/)
- [Google Apps Script Docs](https://developers.google.com/apps-script)

## 🛠️ Development

### Setup

```bash
npm install
```

### Push to Google Apps Script

```bash
# Push code
npm run clasp-push

# Deploy version
npm run clasp-deploy
```

### Testing

```javascript
// Run test function
test()

// Check logs
View → Execution log
```

## 📝 Project Structure

```
misa-meinvoice-gas/
├── main.js                 # Main code
├── appsscript.json        # GAS project config
├── package.json           # NPM config
├── .gitignore            # Git ignore rules
├── README.md             # This file
├── CHANGELOG.md          # Version history
├── LICENSE               # MIT License
└── docs/
    ├── SETUP.md          # Detailed setup guide
    ├── API_REFERENCE.md  # API endpoints
    └── EXAMPLES.md       # Code examples
```

## 🤝 Đóng góp

Chào mừng pull requests! Để đóng góp:

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📋 Roadmap

- [ ] Support hóa đơn đầu ra (out invoices)
- [ ] Batch update accounting dates
- [ ] Download invoices in bulk
- [ ] Custom report templates
- [ ] Webhook integration
- [ ] Unit tests
- [ ] CI/CD pipeline

## ❓ FAQ

**Q: Tôi cần App ID ở đâu?**
A: Liên hệ MISA support (support@misa.vn)

**Q: Token hết hạn khi nào?**
A: Sau 1 giờ. Xác thực lại là được

**Q: Có rate limiting không?**
A: Có, tối đa 100 dòng/request

**Q: Tôi có thể dùng cho production không?**
A: Có, thay đổi `ENVIRONMENT: 'production'` trong CONFIG

## 📜 License

MIT © 2024

## 📞 Support

- 📧 MISA Support: support@misa.vn
- 🌐 Website: https://www.meinvoice.vn
- 💬 Issues: [GitHub Issues](https://github.com/your-username/misa-meinvoice-gas/issues)

## 🙏 Cảm ơn

- MISA meInvoice Team
- Google Apps Script Community
- Tất cả những người đóng góp

---

**Made with ❤️ by [Your Name]**

**Last Updated:** January 2024  
**Version:** 1.0.0
