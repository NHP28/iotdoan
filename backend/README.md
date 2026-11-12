# Driver Attendance & IoT Monitoring Backend (NestJS + MySQL `iotdb`)

Hệ thống Backend API xây dựng theo kiến trúc NestJS + Fastify + Drizzle ORM chuẩn từ repository `PORN_BE`, phục vụ cho:
1. Đăng ký & quản lý tài xế (Lưu thông tin, hình ảnh, face embedding vectors).
2. Điểm danh tài xế qua nhận diện khuôn mặt.
3. Thu thập dữ liệu giám sát trực tiếp từ thiết bị IoT (Raspberry Pi & mô hình DMS - phát hiện ngủ gật, ngáp, mất tập trung).

---

## 🛠 Cấu trúc thư mục

```
backend/
├── src/
│   ├── common/
│   │   ├── filters/           # Global Exception Filter
│   │   └── interceptors/      # Response format transformer
│   ├── drizzle/
│   │   ├── schemas/           # Khai báo schema Drizzle ORM
│   │   │   ├── drivers.schema.ts
│   │   │   ├── attendances.schema.ts
│   │   │   └── telemetry.schema.ts
│   │   ├── drizzle.module.ts
│   │   ├── drizzle.service.ts # Quản lý MySQL Connection Pool
│   │   └── schema.ts          # Root schema exports
│   ├── modules/
│   │   ├── drivers/           # API đăng ký & CRUD tài xế
│   │   ├── attendance/        # API điểm danh (check-in AI)
│   │   └── telemetry/         # API nhận telemetry từ Raspberry Pi
│   ├── app.module.ts
│   └── main.ts                # Bootstrap Fastify, CORS, Swagger Docs
├── scripts/
│   └── init-db.js             # Script tự động tạo DB iotdb và các bảng
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Cài đặt Dependencies
```bash
cd G:\IOTDOAN\backend
npm install
```

### 2. Cấu hình Database
Kiểm tra file `.env`:
```env
PORT=3000
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DB=iotdb
```

### 3. Tự động khởi tạo Database `iotdb` và các bảng
```bash
npm run db:init
```

### 4. Chạy Backend ở chế độ Development
```bash
npm run dev
```

Server sẽ lắng nghe tại: `http://localhost:3000`  
Giao diện tài liệu Swagger tương tác: `http://localhost:3000/api/docs`

---

## 📡 Danh sách các API chính

### 1. Module Tài xế (`/drivers`)
- `GET /drivers`: Lấy toàn bộ danh sách tài xế.
- `GET /drivers/:id`: Lấy chi tiết tài xế.
- `POST /drivers`: Đăng ký tài xế mới:
  ```json
  {
    "driver_code": "TX001",
    "full_name": "Nguyễn Văn A",
    "phone": "0912345678",
    "license_number": "B2-998877",
    "avatar_url": "https://...",
    "face_embedding": "[0.12, -0.45, ...]"
  }
  ```
- `PUT /drivers/:id`: Cập nhật thông tin tài xế.
- `DELETE /drivers/:id`: Xóa tài xế.

### 2. Module Điểm danh (`/attendance`)
- `GET /attendance`: Lịch sử điểm danh toàn bộ.
- `GET /attendance/driver/:driverId`: Lịch sử điểm danh theo tài xế.
- `POST /attendance/check-in`: Điểm danh từ camera nhận diện khuôn mặt:
  ```json
  {
    "driver_id": 1,
    "check_type": "CHECK_IN",
    "confidence_score": 98.7,
    "image_url": "https://...",
    "device_id": "raspi_camera_01",
    "notes": "Check in thành công"
  }
  ```

### 3. Module Giám sát IoT (`/telemetry`)
- `GET /telemetry`: Lấy các bản tin trạng thái mới nhất từ xe/Raspberry Pi.
- `GET /telemetry/device/:deviceId`: Lấy bản tin theo mã thiết bị Pi.
- `POST /telemetry`: Raspberry Pi đẩy log định kỳ hoặc khi có cảnh báo:
  ```json
  {
    "device_id": "raspi-dms-01",
    "driver_id": 1,
    "drowsiness_detected": true,
    "distraction_detected": false,
    "yawn_detected": true,
    "eye_aspect_ratio": 0.18,
    "head_pose": "downward",
    "speed": 62.5,
    "latitude": 10.762622,
    "longitude": 106.660172,
    "alert_level": "WARNING"
  }
  ```

