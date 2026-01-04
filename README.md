<div dir="rtl">

# 🔧 Mayo Fix Enterprise | نظام إدارة ورشة الصيانة

<div align="center">

![Mayo Tech](https://img.shields.io/badge/Mayo%20Tech-Enterprise-1a237e?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-1.0.0-f97316?style=for-the-badge)
![Electron](https://img.shields.io/badge/Electron-30.0.1-47848F?style=for-the-badge&logo=electron)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-3178C6?style=for-the-badge&logo=typescript)

**نظام متكامل لإدارة ورش صيانة الهواتف والأجهزة الإلكترونية**

</div>

---

## ✨ المميزات الرئيسية

### 🎫 نظام التذاكر (Tickets)
- إنشاء تذاكر صيانة
- تتبع حالة الإصلاح
- أرقام تذاكر فريدة (REP-1001)
- سجل كامل للتغييرات

### 👥 إدارة العملاء
- بيانات العملاء
- رصيد العميل
- سجل الإصلاحات
- معلومات الاتصال

### 📱 معلومات الأجهزة
- نوع الجهاز والماركة والموديل
- الرقم التسلسلي و IMEI
- حالة الجهاز
- رمز القفل

### 🔄 نظام الحالات (State Machine)
```
RECEIVED → DIAGNOSED → WAITING_PARTS → IN_PROGRESS → COMPLETED → DELIVERED
                              ↓
                          CANCELLED
```

### 🔧 إدارة قطع الغيار
- ربط مع المخزون
- تتبع القطع المستخدمة
- سعر القطعة وقت الإصلاح
- خصم تلقائي من المخزون

### 👨‍🔧 إدارة الفنيين
- لوحة تحكم للفنيين
- توزيع المهام
- تتبع الأداء

### 💰 النظام المالي
- تكلفة العمل (Labor)
- تكلفة القطع (Parts)
- الخصومات
- الضرائب
- العربون
- حالة الدفع

### 📊 التقارير
- تقارير الإصلاحات
- تقارير الإيرادات
- تقارير الفنيين
- رسوم بيانية تفاعلية

### 🔐 الأمان
- نظام صلاحيات RBAC
- تشفير قاعدة البيانات AES-256
- سجل المراجعة (Audit Logs)
- نظام ترخيص آمن

---

## 🛠️ التقنيات المستخدمة

| التقنية | الوصف |
|---------|-------|
| **Electron** | إطار تطبيقات سطح المكتب |
| **React 18** | واجهة المستخدم |
| **TypeScript** | لغة البرمجة |
| **Vite** | أداة البناء |
| **SQLite** | قاعدة البيانات (مشفرة) |
| **TailwindCSS** | تنسيق الواجهة |
| **React Query** | إدارة البيانات |
| **Zustand** | إدارة الحالة |
| **ApexCharts** | الرسوم البيانية |
| **Recharts** | رسوم بيانية إضافية |

---

## 📦 التثبيت والتشغيل

### المتطلبات
- Node.js 18+
- npm أو yarn
- Windows 10/11

### التثبيت

```bash
# استنساخ المشروع
git clone <repository-url>
cd repair-shop-system

# تثبيت الحزم
npm install

# تشغيل وضع التطوير
npm run dev

# بناء التطبيق
npm run build
```

### الأوامر المتاحة

| الأمر | الوصف |
|-------|-------|
| `npm run dev` | تشغيل وضع التطوير |
| `npm run build` | بناء التطبيق للإنتاج |
| `npm run lint` | فحص الكود |
| `npm run preview` | معاينة البناء |

---

## 📁 هيكل المشروع

```
repair-shop-system/
├── electron/                 # كود Electron الرئيسي
│   ├── database/            # نماذج قاعدة البيانات
│   │   ├── customers.ts     # العملاء
│   │   ├── repairs.ts       # الإصلاحات (عبر handlers)
│   │   ├── parts.ts         # قطع الغيار
│   │   ├── suppliers.ts     # الموردين
│   │   ├── inventory.ts     # المخزون
│   │   └── notifications.ts # الإشعارات
│   ├── handlers/            # معالجات IPC
│   │   ├── repairs.ts       # معالج الإصلاحات
│   │   ├── customers.ts     # معالج العملاء
│   │   └── parts.ts         # معالج القطع
│   ├── license/             # نظام الترخيص
│   ├── middleware/          # الوسيطات (Auth, RBAC)
│   └── validation/          # التحقق من البيانات
├── src/                     # كود React
│   ├── components/          # المكونات
│   │   ├── repairs/         # مكونات الإصلاحات
│   │   ├── customers/       # مكونات العملاء
│   │   └── parts/           # مكونات القطع
│   ├── pages/               # الصفحات
│   ├── stores/              # إدارة الحالة
│   └── providers/           # React Providers
└── public/                  # الملفات العامة
```

---

## 🗄️ قاعدة البيانات

### الجداول الرئيسية

| الجدول | الوصف |
|--------|-------|
| `customers` | العملاء |
| `customer_transactions` | معاملات العملاء |
| `repairs` | تذاكر الإصلاح |
| `repair_parts` | قطع الغيار المستخدمة |
| `repair_status_history` | سجل تغيير الحالات |
| `products` | قطع الغيار (المخزون) |
| `stock_levels` | مستويات المخزون |

### حالات الإصلاح

| الحالة | الوصف |
|--------|-------|
| `RECEIVED` | تم الاستلام |
| `DIAGNOSED` | تم الفحص |
| `WAITING_PARTS` | في انتظار القطع |
| `IN_PROGRESS` | جاري العمل |
| `COMPLETED` | مكتمل |
| `DELIVERED` | تم التسليم |
| `CANCELLED` | ملغي |

---

## 🔒 الأمان والترخيص

- **تشفير RSA-2048** للتوقيع الرقمي
- **تشفير AES-256-GCM** لقاعدة البيانات
- **Keytar** للتخزين الآمن
- **Device Fingerprint** لربط الترخيص
- **Bytenode** لحماية الكود المصدري

---

## 📄 الرخصة

هذا البرنامج ملكية خاصة لشركة **Mayo Tech**. جميع الحقوق محفوظة.

---

## 📞 الدعم الفني

- 📧 البريد الإلكتروني: support@mayo-tech.com
- 🌐 الموقع: www.mayo-tech.com

</div>

---

<div align="center">

**صنع بـ ❤️ بواسطة Mayo Tech**

</div>
