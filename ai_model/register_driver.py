import cv2
import face_recognition
import json
import base64
import requests
import sys
import os

SERVER_URL = os.environ.get("SERVER_URL", "http://localhost:3000").rstrip("/")
if not SERVER_URL.endswith("/api/v1"):
    SERVER_URL += "/api/v1"
DEVICE_HEADERS = {"x-device-key": os.environ.get("DEVICE_API_KEY", "")}

def extract_face_embedding(image_path):
    image = face_recognition.load_image_file(image_path)
    encodings = face_recognition.face_encodings(image)
    if len(encodings) == 0:
        raise ValueError("Không tìm thấy khuôn mặt nào trong ảnh!")
    # Lấy vector embedding 128 số float
    return encodings[0].tolist()

def register_driver(driver_code, full_name, image_path, phone="", license_number=""):
    print(f"⏳ Đang xử lý ảnh: {image_path}...")
    embedding = extract_face_embedding(image_path)
    
    # Đọc ảnh chuyển thành base64 để lưu avatar_url (hoặc truyền url)
    with open(image_path, "rb") as f:
        avatar_b64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("utf-8")
        
    payload = {
        "driver_code": driver_code,
        "full_name": full_name,
        "phone": phone,
        "license_number": license_number,
        "avatar_url": avatar_b64,
        "face_embedding": json.dumps(embedding)
    }

    url = f"{SERVER_URL}/drivers"
    print(f"📡 Đang gửi API đăng ký lên: {url}...")
    res = requests.post(url, json=payload, timeout=10, headers=DEVICE_HEADERS)
    if res.status_code in [200, 201]:
        print("🎉 Đăng ký tài xế thành công vào MySQL iotdb!")
        print(json.dumps(res.json(), indent=2, ensure_ascii=False))
    else:
        print(f"❌ Lỗi ({res.status_code}):", res.text)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Sử dụng: python register_driver.py <mã_tx> <họ_tên> <đường_dẫn_ảnh> [sdt] [gplx]")
        print("Ví dụ: python register_driver.py TX001 'Nguyễn Văn A' ./avatar.jpg 0912345678 B2-12345")
    else:
        code = sys.argv[1]
        name = sys.argv[2]
        img = sys.argv[3]
        phone = sys.argv[4] if len(sys.argv) > 4 else ""
        license_num = sys.argv[5] if len(sys.argv) > 5 else ""
        register_driver(code, name, img, phone, license_num)

