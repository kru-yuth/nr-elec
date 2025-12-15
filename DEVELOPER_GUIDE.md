# คู่มือนักพัฒนา (Developer Guide) - NR Electricity Stats

เอกสารนี้รวบรวมข้อมูลทางเทคนิคสำหรับนักพัฒนาที่ต้องการดูแลรักษาหรือต่อยอดระบบ "NR Electricity Stats"

## 1. ภาพรวมโครงการ (Project Overview)
**NR Electricity Stats** เป็นเว็บแอปพลิเคชันสำหรับติดตามและบันทึกการใช้ไฟฟ้าภายในหน่วยงาน แสดงผลในรูปแบบ Dashboard ที่เข้าใจง่าย พร้อมระบบจัดการผู้ใช้งานและการนำเข้าข้อมูล

## 2. เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend Framework:** React 18 (Vite)
- **Language:** JavaScript
- **Styling:** Tailwind CSS
- **Database & Auth:** Firebase (Firestore, Authentication)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Routing:** React Router DOM
- **Notifications:** React Hot Toast

## 3. การติดตั้งและเริ่มต้นพัฒนา (Inistallation)

### สิ่งที่ต้องมีคำ (Prerequisites)
- [Node.js](https://nodejs.org/) (v16 ขึ้นไป)
- บัญชี Firebase Project

### ขั้นตอนการติดตั้ง
1. **Clone Repository**
   ```bash
   git clone <repository_url>
   cd nr-elec
   ```

2. **ติดตั้ง Dependencies**
   ```bash
   npm install
   ```

3. **ตั้งค่า Firebase**
   - สร้างไฟล์ `.env` ที่ root ของโปรเจกต์ (ดูตัวอย่างข้างล่าง) หรือแก้ไขไฟล์ `src/firebase.js` โดยตรง (ไม่แนะนำสำหรับ Production)
   - นำค่า Config จาก Firebase Console -> Project Settings -> General -> Your apps มาใส่

3.1. **ตั้งค่า Environment Variables**
   สร้างไฟล์ `.env` ที่ root folder และใส่ค่า Config ของ Firebase ดังนี้:
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_DATABASE_URL=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_MEASUREMENT_ID=...
   ```

4. **รันโปรเจกต์ (Development Mode)**
   ```bash
   npm run dev
   ```
   เว็บจะรันอยู่ที่ `http://localhost:5173`

## 4. โครงสร้างโปรเจกต์ (Folder Structure)

```
src/
├── components/         # คอมโพเนนต์ที่ใช้ร่วมกัน (เช่น Layout, ProtectedRoute)
├── contexts/          # Context API (AuthContext.jsx สำหรับจัดการ Login)
├── pages/             # หน้าหลักของเว็บ
│   ├── Dashboard.jsx      # หน้าแสดงผลกราฟและสถิติ (สาธารณะ)
│   ├── DataEntry.jsx      # หน้าบันทึก/แก้ไขข้อมูล (ต้องล็อกอิน)
│   ├── Login.jsx          # หน้าเข้าสู่ระบบ
│   ├── UserManagement.jsx # หน้าจัดการ User (Admin)
│   └── BulkImport.jsx     # หน้านำเข้า CSV (Admin)
├── services/          # ไฟล์ติดต่อ Database
│   ├── electricityService.js # CRUD ข้อมูลไฟฟ้า
│   └── userService.js        # CRUD ข้อมูลผู้ใช้
├── App.jsx            # ตั้งค่า Routing
├── main.jsx           # Entry Point
└── firebase.js        # Firebase Configuration
```

## 5. ฟีเจอร์หลักและการทำงาน (Key Features)

### 5.1 ระบบ Authentication (`AuthContext.jsx`)
- ใช้ **Google Sign-In** ผ่าน Firebase Authentication
- **Domain Restriction:** จำกัดเฉพาะอีเมลที่ลงท้ายด้วย `@nr.ac.th`
- **Whitelist System:** ตรวจสอบสิทธิ์ว่าผู้ใช้มีชื่ออยู่ใน Collection `users` ของ Firestore หรือไม่
- **Roles:** รองรับ `admin` (จัดการทุกอย่าง) และ `user` (บันทึกข้อมูลได้)

### 5.2 แดชบอร์ด (`Dashboard.jsx`)
- เข้าถึงได้ **Public** (ไม่ต้องล็อกอิน)
- แสดงกราฟ:
  - ประวัติรายเดือน (Stacked Bar Chart แยกตามมิเตอร์)
  - เปรียบเทียบรายปี
  - แนวโน้มตามฤดูกาล (Year-over-Year)
  - เปรียบเทียบรายเดือนแบบละเอียด
- **Carbon Footprint:** คำนวณจาก `ค่าไฟ (บาท) / ค่า Ft เฉลี่ย * Factor 0.4999` (Logic อย่างง่ายในเวอร์ชันปัจจุบันคือ `หน่วยไฟฟ้า * 0.4999`)

### 5.3 การบันทึกข้อมูล (`DataEntry.jsx`)
- ตรวจสอบข้อมูลซ้ำอัตโนมัติ (User + Month + Year)
- **Edit Mode:** หากเลือกเดือน/ปี ที่มีข้อมูลอยู่แล้ว จะเปลี่ยนสถานะเป็น "แก้ไข" โดยอัตโนมัติ

### 5.4 การนำเข้า CSV (`BulkImport.jsx`)
- รองรับไฟล์ CSV ที่มี Header: `user_number`, `month`, `year`, `electricity_usage`, `total_with_vat`
- ตรวจสอบความถูกต้องของข้อมูลเบื้องต้นก่อนนำเข้า

## 6. การ Deploy (Build & Deploy)

### Firebase Hosting
1. สร้าง Production Build:
   ```bash
   npm run build
   ```
2. ติดตั้ง Firebase CLI (ถ้ายังไม่มี):
   ```bash
   npm install -g firebase-tools
   ```
3. Login และ Deploy:
   ```bash
   firebase login
   firebase init hosting (เลือก existing project และโฟลเดอร์ dist)
   firebase deploy
   ```

### กฎความปลอดภัย (Firestore Rules)
ตัองตั้งค่าใน Firebase Console -> Firestore Database -> Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ข้อมูลไฟฟ้าอ่านได้ทุกคน (Public Dashboard) แต่เขียนได้เฉพาะ User
    match /electricity_records/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // ข้อมูล User อ่าน/เขียนได้เฉพาะคนที่มีสิทธิ์ (ตาม Logic App)
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 7. ปัญหาที่พบบ่อย (Troubleshooting)
- **Login ไม่ได้:** ตรวจสอบว่าอีเมลอยู่ใน Collection `users` ใน Firestore หรือยัง และต้องเป็น `@nr.ac.th`
- **Dashboard ไม่ขึ้นข้อมูล:** ตรวจสอบ Firestore Rules ว่าเปิด `read: if true` สำหรับ `electricity_records` หรือยัง
- **กราฟไม่แสดงภาษาไทย:** ตรวจสอบ Encoding ของไฟล์และ Browser แต่โดยปกติ Tailwind + React รองรับ UTF-8 อยู่แล้ว

---
*เอกสารฉบับนี้จัดทำเมื่อ: 11 ธันวาคม 2025*
