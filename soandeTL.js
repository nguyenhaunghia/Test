const $ = s => document.querySelector(s);

// --- LOGIC VALIDATION (ĐỦ 4 TRƯỜNG MỚI SÁNG NÚT) ---
const requiredFields = ['#monHoc', '#khoi', '#chuDe', '#ghiChu'];
const btnSave = $('#btnSave');

function checkValidity() {
  const allFilled = requiredFields.every(selector => {
    const el = $(selector);
    return el && el.value.trim() !== "";
  });

  if (allFilled) {
    // Active Button (Đã update màu Aqua Dubai Pastel)
    if (btnSave) {
        btnSave.disabled = false;
        btnSave.className = "px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00b5e2] to-[#004c6d] hover:scale-105 shadow-lg shadow-[#00b5e2]/40 text-sm font-bold text-white transition transform flex items-center gap-2 cursor-pointer opacity-100";
    }
  } else {
    // Disable Button
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.className = "px-6 py-2.5 rounded-xl bg-slate-300 text-slate-500 font-bold text-sm cursor-not-allowed transition-all duration-300 flex items-center gap-2 opacity-70 shadow-none";
    }
  }
}

// Gắn sự kiện lắng nghe
requiredFields.forEach(selector => {
  const el = $(selector);
  if(el) {
    el.addEventListener('input', checkValidity);
    el.addEventListener('change', checkValidity);
  }
});

// =========================================================================
// 1. TẢI DỮ LIỆU KHI MỞ TRANG (ĐÃ XÓA CÁC HÀM TRÙNG LẶP & GỌI SCRIPT CHUNG)
// =========================================================================
window.onload = async function() {
  // Ưu tiên dùng loadingOverlay của file này, nếu không có thì lấy của hệ thống
  const loader = $('#loadingOverlay') || document.getElementById('loading');
  if(loader) loader.style.display = 'flex';
  
  try {
    const res = await callAPI('getFormInitData', {});
    const data = res.data ? res.data : res;

    if (data && data.success) {
      populateSelect('#monHoc', data.subjects, 'Chọn môn học...');
      populateSelect('#khoi', data.blocks, 'Chọn khối lớp...');
    } else {
      throw new Error("Không lấy được dữ liệu từ máy chủ");
    }
  } catch (error) {
    console.error("Lỗi khởi tạo:", error);
    showToast("Lỗi tải danh mục!", "error"); // GỌI HÀM DÙNG CHUNG TỪ SCRIPT.JS
    const elMon = $('#monHoc'); if(elMon) elMon.innerHTML = '<option disabled>Lỗi kết nối</option>';
    const elKhoi = $('#khoi'); if(elKhoi) elKhoi.innerHTML = '<option disabled>Lỗi kết nối</option>';
  } finally {
    if(loader) loader.style.display = 'none';
  }
};

// HÀM ĐỔ DỮ LIỆU VÀO LISTBOX (Đã xóa bỏ bản duplicate bị thừa)
function populateSelect(selector, list, placeholder) {
  const el = $(selector);
  if (!el) return;
  
  el.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
  
  // Xử lý an toàn tránh lỗi dữ liệu rỗng
  if (list && Array.isArray(list)) {
      list.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id || item.value || item;    
        opt.textContent = item.name || item.text || item; 
        el.appendChild(opt);
      });
  }
  
  checkValidity();
}

// =========================================================================
// 2. XỬ LÝ LƯU DỮ LIỆU (DÙNG callAPI)
// =========================================================================
async function handleSave(e) {
  if (e) e.preventDefault();
  
  const mon = $('#monHoc').value;
  const khoi = $('#khoi').value;
  const chuDe = $('#chuDe').value.trim();
  const ghiChu = $('#ghiChu').value.trim();
  const hieuLucEl = $('#hieuLuc');

  if(!mon || !khoi || !chuDe) {
    showToast("Vui lòng điền đầy đủ Môn, Khối và Chủ đề!", "warning");
    return;
  }

  const loader = $('#loadingOverlay') || document.getElementById('loading');
  if(loader) loader.style.display = 'flex';
  
  // KHÓA NÚT LẠI ĐỂ CHỐNG SPAM CLICK KHI ĐANG LƯU
  if(btnSave) btnSave.disabled = true; 

  const payload = {
    mon: mon,
    khoi: khoi,
    chuDe: chuDe,
    ghiChu: ghiChu,
    active: (hieuLucEl && hieuLucEl.checked) ? 'Yes' : 'No',
    loaiDe: 'TL' // THÊM BIẾN NÀY ĐỂ BACKEND NHẬN DIỆN LÀ ĐỀ TỰ LUẬN
  };

  try {
    const res = await callAPI('luuDeMoi', payload);
    const data = res.data ? res.data : res;

    if(data && data.success) {
      showToast(`Đã tạo đề Tự luận: ${data.newID || 'Thành công'}`, "success");
      // Reset form một phần (giữ nguyên Môn, Khối để nhập tiếp bài khác cho lẹ)
      $('#chuDe').value = '';
      $('#ghiChu').value = '';
    } else {
      showToast(data.message || data.error || "Lỗi lưu dữ liệu trên Server", "error");
    }
  } catch (err) {
    console.error("Lỗi khi lưu:", err);
    showToast("Lỗi hệ thống: " + err.message, "error");
  } finally {
    if(loader) loader.style.display = 'none';
    checkValidity(); // Kiểm tra lại để mở khóa nút nếu form vẫn còn hợp lệ
  }
}