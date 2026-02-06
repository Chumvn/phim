# CHUM Movies 🎬

Trang web xem phim online miễn phí với giao diện hiện đại, được xây dựng bằng HTML, CSS và JavaScript thuần.

![CHUM Movies](https://img.shields.io/badge/CHUM-Movies-8b5cf6?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## ✨ Tính năng

- 🎥 **Hero Slider** - Banner slideshow với các phim hot
- 🔍 **Tìm kiếm phim** - Tìm kiếm theo tên phim
- 🏷️ **Lọc phim** - Lọc theo thể loại, quốc gia, năm phát hành
- 📱 **Responsive Design** - Giao diện tương thích mọi thiết bị
- 🌙 **Dark/Light Theme** - Chuyển đổi chế độ sáng/tối
- ❤️ **Favorites** - Lưu phim yêu thích
- 🎬 **Video Player** - Trình phát video tích hợp với HLS support

## 🚀 Demo

Truy cập: [https://chumvn.github.io/phim](https://chumvn.github.io/phim)

## 📦 Cài đặt

### Deploy lên GitHub Pages

1. **Fork repository này** hoặc tạo repo mới

2. **Clone repo về máy:**
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

3. **Copy files vào repo:**
   - `index.html`
   - `styles.css`
   - `app.js`

4. **Push lên GitHub:**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

5. **Bật GitHub Pages:**
   - Vào Settings > Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save

6. **Truy cập website:**
   - URL: `https://YOUR_USERNAME.github.io/YOUR_REPO`

## 🛠️ Công nghệ

- **HTML5** - Cấu trúc trang
- **CSS3** - Styling với CSS Variables, Flexbox, Grid
- **JavaScript (ES6+)** - Logic ứng dụng
- **HLS.js** - Phát video HLS
- **phim.nguonc.com API** - Dữ liệu phim

## 📁 Cấu trúc

```
chum-movies/
├── index.html      # Trang HTML chính
├── styles.css      # CSS styles
├── app.js          # JavaScript logic
└── README.md       # Documentation
```

## 🎨 Tùy chỉnh

### Đổi màu chủ đạo

Chỉnh sửa CSS variables trong `styles.css`:

```css
:root {
    --accent: #8b5cf6;           /* Màu chính */
    --accent-gradient: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #ec4899 100%);
}
```

### Đổi API

Chỉnh sửa `API_BASE` trong `app.js`:

```javascript
const API_BASE = 'https://your-api-url.com/api';
```

## 📝 License

MIT License - Xem file [LICENSE](LICENSE)

## 👨‍💻 Tác giả

**CHUM** - [GitHub](https://github.com/Chumvn)

---

⭐ Nếu thấy hữu ích, hãy star repo nhé!
