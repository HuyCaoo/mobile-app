// constants/api.js
import { API_BASE_URL } from "./config"; // 👉 import từ config.js

export const fetchData = async (endpoint) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log("🌍 Fetching:", url);

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error("❌ Lỗi khi fetch:", err);
    throw err;
  }
};

// 👉 thêm hàm postData
export const postData = async (endpoint, body = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log("📤 Posting:", url, body);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error("❌ Lỗi khi post:", err);
    throw err;
  }
};
