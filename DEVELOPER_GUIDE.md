# คู่มือนักพัฒนา (Developer Guide) - NR Electricity Stats

เอกสารนี้รวบรวมข้อมูลทางเทคนิคสำหรับนักพัฒนาที่ต้องการดูแลรักษาหรือต่อยอดระบบ "NR Electricity Stats"

## 1. ภาพรวมโครงการ (Project Overview)
**NR Electricity Stats** เป็นเว็บแอปพลิเคชันสำหรับติดตามและบันทึกการใช้ไฟฟ้าภายในหน่วยงาน แสดงผลในรูปแบบ Dashboard ที่เข้าใจง่าย พร้อมระบบจัดการผู้ใช้งานและการนำเข้าข้อมูล

## 2. เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend Framework:** React 19 (Vite)
- **Language:** JavaScript
- **Styling:** Tailwind CSS (v4)
- **Database & Auth:** Firebase (Firestore, Authentication)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Routing:** React Router DOM (v7)
- **Notifications:** React Hot Toast

## 3. การติดตั้งและเริ่มต้นพัฒนา (Installation)

### สิ่งที่ต้องมี (Prerequisites)
- [Node.js](https://nodejs.org/) (v18 ขึ้นไป)
- บัญชี Firebase Project (nr-nexus)
- Firebase CLI (`npm install -g firebase-tools`)

### ขั้นตอนการติดตั้ง
1. **Clone Repository**
   ```bash
   git clone <repository_url>
   cd nr-electricity-stats
   ```

2. **ติดตั้ง Dependencies**
   ```bash
   npm install
   ```

3. **ตั้งค่า Firebase**
   - สร้างไฟล์ `.env` ที่ root ของโปรเจกต์ นำค่า Config จาก Firebase Console มาใส่

3.1. **ตั้งค่า Environment Variables (.env)**
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_DATABASE_URL=...
   VITE_FIREBASE_PROJECT_ID=nr-nexus
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_MEASUREMENT_ID=...
   ```

4. **รันโปรเจกต์ (Development Mode)**
   ```bash
   npm run dev
   ```

## 4. โครงสร้างระบบผู้ใช้ (Unified User System)

ระบบมีการปรับปรุงโครงสร้างผู้ใช้ให้เป็นแบบรวมศูนย์ (Unified) เพื่อความยืดหยุ่นในการจัดการสิทธิ์

### 4.1 โครงสร้างข้อมูล (Data Schema)
คอลเลกชัน `users` จะใช้โครงสร้างดังนี้:
- `email`: (String) อีเมลของผู้ใช้ (ต้องเป็น @nr.ac.th)
- `uid`: (String) ID จาก Firebase Auth (จะถูกเติมเมื่อ Login ครั้งแรก)
- `roles`: (Array of Strings) รายการสิทธิ์ เช่น `['user']` หรือ `['admin', 'user']`
- *หมายเหตุ: ระบบจะทำการลบฟิลด์เก่า (role, Role) ออกโดยอัตโนมัติเมื่อมีการอัปเดตข้อมูล*

### 4.2 ระบบ Data Normalization
ฟังก์ชัน `normalizeRoles` ใน `userService.js` จะทำหน้าที่แปลงข้อมูลเก่าให้เป็นรูปแบบใหม่เสมอ:
- เปลี่ยนค่าจาก `role` (String) -> `roles` (Array)
- แปลงเป็นตัวพิมพ์เล็ก (lowercase)
- ลบค่าซ้ำและค่าว่างออก

### 4.3 ขั้นตอนการ Login และ UID Linking
1. ผู้ใช้ Login ผ่าน Google (จำกัดโดเมน @nr.ac.th)
2. ระบบตรวจสอบใน `users` collection โดยค้นหาจาก `uid` ก่อน
3. หากไม่พบ `uid` ระบบจะค้นหาจาก `email` (Whitelist)
4. หากพบ `email` แต่ยังไม่มี `uid` ระบบจะทำการ **Link UID** โดยการสร้าง/อัปเดตเอกสารใหม่โดยใช้ UID เป็น ID ของเอกสาร และลบฟิลด์สิทธิ์แบบเก่าออก (Clean-up)

## 5. การจัดการสิทธิ์ (Permissions & Roles)

### 5.1 ระดับสิทธิ์ (Roles)
- **admin:** เข้าถึงหน้าจัดการผู้ใช้ (`/users`) และการนำเข้าข้อมูล (`/import`) ได้
- **user:** เข้าถึงหน้าบันทึกข้อมูล (`/entry`) ได้
- **Public (ไม่ล็อกอิน):** เข้าถึงหน้า Dashboard (`/`) ได้

### 5.2 การตรวจสอบสิทธิ์ใน UI
ใช้ `useAuth` hook เพื่อเข้าถึงค่าสิทธิ์:
```javascript
const { roles, role, userRole } = useAuth();
// roles: ['admin', 'user'] (Array)
// role/userRole: 'admin' (String - สำหรับ Backward Compatibility)
```

## 6. กฎความปลอดภัย (Firestore Rules)

กฎล่าสุดที่ Deploy บนโปรเจกต์ `nr-nexus`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 1. Electricity Records: อ่านได้สาธารณะ (Dashboard)
    match /electricity_records/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // 2. Users: อ่านได้เฉพาะตัวเองหรือ Admin
    match /users/{userId} {
      allow read: if request.auth != null && (
        request.auth.uid == userId || 
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
         'admin' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles)
      );
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
        'admin' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles;
    }
  }
}
```

## 7. แดชบอร์ดและกราฟ (Dashboard & Charts)

### 7.1 การจัดการขนาดกราฟ
เพื่อป้องกัน Warning เรื่อง Chart Size ใน Console ทุกกราฟ (Recharts) จะต้องถูกหุ้มด้วย Container ที่ระบุ `height` และ `width` ที่แน่นอน เช่น:
```jsx
<div style={{ width: '100%', height: 400, minHeight: 300 }}>
    <ResponsiveContainer>
        <BarChart data={...}>...</BarChart>
    </ResponsiveContainer>
</div>
```

### 7.2 การเข้าถึงข้อมูล
หน้า Dashboard จะทำการดึงข้อมูลจาก `electricityService.getRecords()` โดยตรง ซึ่งรองรับการเข้าถึงแบบ Public ตามกฎ Firestore Rules ใหม่

## 8. การ Deploy
เนื่องจากมีการใช้งานร่วมกับโปรเจกต์อื่นใน `nr-nexus` **ห้ามสั่ง Deploy Rules ทั้งหมดจากโปรเจกต์นี้เด็ดขาด** หากยังไม่ได้รวมกฎจากโปรเจกต์อื่นๆ เข้ามา

คำสั่ง Deploy เฉพาะ Rules:
```bash
firebase deploy --only firestore:rules --project nr-nexus
```

---
*เอกสารฉบับนี้อัปเดตล่าสุดเมื่อ: 19 มีนาคม 2026 (Refactored to Unified User System)*
