let questions = [];

// ==================== CẤU HÌNH HỆ THỐNG ====================
const API_URL = "https://script.google.com/macros/s/AKfycbx3MaiI5dyOug2-gmd2xg7rzqEiP_Ye3MbjZgQ9laHc7_0Arnu-WfNsqzFH1BC3tTeG/exec";
let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

// ==================== GIAO TIẾP API & ĐIỀU HƯỚNG ====================

async function callAPI(action, payload = {}, silent = false) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, data: payload })
    });
    return await response.json();
  } catch (error) {
    console.error("API Error (" + action + "):", error);
    if (!silent) showToast('Lỗi mạng hoặc Server quá tải!', 'error');
    throw error;
  }
}

function chuyenTrang(fileCode) {
  const mapRoute = {
    'login': 'login.html',
    'loanch': 'soanch.html',
    'soandeTL': 'soandeTL.html',
    'soandeTN': 'soandeTN.html',
    'hsinh': 'hsinh.html',
    'gbai': 'gbai.html',
    'thkq': 'thkq.html',
    'lbai': 'lbai.html',
    'otap': 'otap.html',
    'tke': 'tke.html',
    'index': 'index.html',
    'new': 'register.html',
    'gsat': 'gsat.html'
  };
  const targetHtml = mapRoute[fileCode] || fileCode + '.html';
  window.location.href = targetHtml;
}

// ==================== XÁC THỰC & THÔNG BÁO ====================
function requireLogin() {
  if (!currentUser) {
    showToast('Vui lòng đăng nhập!', 'warning');
    setTimeout(() => chuyenTrang('login'), 1500);
    return false;
  }
  return true;
}

// ==================== HÀM ĐĂNG XUẤT CHUẨN ====================
async function dangXuat() {
  const confirmResult = await showConfirm('Đăng xuất', 'Bạn có chắc muốn rời khỏi hệ thống?', 'danger');
  if (confirmResult) {
    
    // --- GHI LOG ĐĂNG XUẤT TRƯỚC KHI XÓA DATA ---
    if (currentUser && currentUser.UserID) {
       try {
           const deviceInfo = navigator.userAgent.substring(0, 150); 
           callAPI('ghiLogHeThong', {
               PC_Name: deviceInfo,
               UserID: currentUser.UserID,
               Event: 'LOGOUT', 
               Note: 'Đăng xuất an toàn'
           }, true); 
       } catch(e) {
           console.error("Lỗi ghi log đăng xuất:", e);
       }
    }
    // --------------------------------------------

    sessionStorage.removeItem('currentUser');
    currentUser = null;
    showToast('Đã đăng xuất an toàn', 'info');
    
    setTimeout(() => chuyenTrang('login'), 800);
  }
}

// =========================================================================
// HÀM TOAST DÙNG CHUNG TỐI ƯU HÓA (Ép cứng góc phải dưới)
// =========================================================================
function showToast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  
  // Nếu chưa có container, tự động tạo để không bị lỗi
  if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
  }
  
  // ÉP CỨNG TỌA ĐỘ CSS VÀO CONTAINER (Đảm bảo đồng nhất toàn hệ thống)
  container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 10px; pointer-events: none; align-items: flex-end;';

  const t = document.createElement('div');
  t.style.pointerEvents = 'auto'; // Để có thể click vào nút close nếu cần
  t.className = `p-4 rounded-xl shadow-2xl border-l-4 text-sm font-bold flex items-center gap-3 bg-white text-gray-800 transition-all duration-300`;
  
  // Phối màu chuẩn
  if (type === 'success') t.style.borderLeftColor = '#10b981';
  else if (type === 'error' || type === 'danger') t.style.borderLeftColor = '#ef4444';
  else if (type === 'warning') t.style.borderLeftColor = '#f59e0b';
  else t.style.borderLeftColor = '#0ea5e9'; // Info mặc định
  
  const iconClass = type === 'success' ? 'fa-check-circle text-[#10b981]' : type === 'error' ? 'fa-times-circle text-[#ef4444]' : type === 'warning' ? 'fa-exclamation-triangle text-[#f59e0b]' : 'fa-info-circle text-[#0ea5e9]';
  const titleText = type === 'success' ? 'Thành công' : type === 'error' ? 'Lỗi' : type === 'warning' ? 'Cảnh báo' : 'Thông báo';
  
  t.innerHTML = `
      <i class="text-2xl fas ${iconClass}"></i>
      <div style="display:flex; flex-direction:column; margin-right: 12px;">
          <span style="font-weight:800; font-size:0.9rem; color:#1e293b;">${titleText}</span>
          <span style="font-weight:600; color:#64748b;">${msg}</span>
      </div>
      <button onclick="this.parentElement.remove()" style="background:none; border:none; cursor:pointer; color:#94a3b8; font-size:1.2rem; margin-left:auto;">&times;</button>
  `;
  
  container.appendChild(t);
  
  // Hiệu ứng tự hủy mượt mà
  setTimeout(() => { 
      if (t && t.parentElement) {
          t.style.opacity = '0'; 
          t.style.transform = 'translateX(50px)';
          setTimeout(() => t.remove(), 300); 
      }
  }, 4000);
}

// Giữ lại hàm closeToast cũ (nếu có trang nào đó gọi trực tiếp) để bảo toàn
function closeToast(btn) {
  const toast = btn.closest('div'); // Đã đổi cấu trúc nên lấy div gần nhất
  if (toast) { toast.style.opacity = '0'; setTimeout(() => { if(toast.parentElement) toast.remove(); }, 300); }
}

function showConfirm(title, message, type = 'question') {
  return new Promise((resolve) => {
    const modal = document.getElementById('customModal');
    if (!modal) { resolve(confirm(message)); return; }
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalMessage').innerText = message;
    
    const btnConfirm = document.getElementById('btnConfirm');
    if (type === 'danger') {
      btnConfirm.className = 'flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-2xl transition-all font-bold shadow-lg shadow-red-500/30 text-white';
    } else {
      btnConfirm.className = 'flex-1 px-6 py-3 bg-[#00b5e2] hover:bg-[#004c6d] rounded-2xl transition-all font-bold shadow-lg shadow-[#00b5e2]/30 text-white'; /* Update nút confirm sang màu Aqua */
    }

    modal.classList.remove('hidden');
    setTimeout(() => { document.getElementById('modalContent').classList.replace('scale-90', 'scale-100'); document.getElementById('modalContent').classList.replace('opacity-0', 'opacity-100'); }, 100);

    const close = (result) => {
      document.getElementById('modalContent').classList.replace('scale-100', 'scale-90');
      document.getElementById('modalContent').classList.replace('opacity-100', 'opacity-0');
      setTimeout(() => { modal.classList.add('hidden'); resolve(result); }, 300); // Giảm delay cho nhạy
    };
    btnConfirm.onclick = () => close(true);
    document.getElementById('btnCancel').onclick = () => close(false);
  });
}

// ==================== HEADER ĐỘNG (Dùng cho trang index) ====================

function updateHeaderUI() {
  if (!currentUser) return;
  // Sửa chỗ này: Cấp phép tìm cả 2 loại ID để bảo toàn tính tương thích với mọi trang
  const nameEl = document.getElementById('header-full-name') || document.getElementById('dispTen');
  const idEl = document.getElementById('header-user-id') || document.getElementById('dispID');
  const permEl = document.getElementById('header-perm');
  const objectEl = document.getElementById('header-object'); 
  const avatarEl = document.getElementById('header-avatar') || document.getElementById('userAvatar');

  if (nameEl) nameEl.innerText = currentUser.FullName || "Người dùng";
  if (idEl) idEl.innerText = `ID: ${currentUser.UserID || '----'}`;
  if (avatarEl) avatarEl.src = currentUser.Avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.UserID)}`;
  
  if (objectEl) {
    objectEl.innerText = currentUser.Object || 'Học sinh';
  }

  if (permEl) {
    const role = currentUser.Permissions || 'User';
    permEl.innerText = role;
    
    const isTeacher = role.toLowerCase().includes('gv') || (currentUser.Object && currentUser.Object.toLowerCase().includes('giáo viên'));
    permEl.className = "role-badge " + (role.toLowerCase().includes('admin') ? 'admin-role' : isTeacher ? 'teacher-role' : 'guest');
  }
}

document.addEventListener('DOMContentLoaded', updateHeaderUI);

// ==================== HEADER DÙNG CHUNG CHO MỌI TRANG ====================
function renderGlobalHeaderCU() {
  const headerContainer = document.getElementById('global-header');
  if (!headerContainer) return;

  // SỬA LỖI TẠI ĐÂY: Gán mặc định {} thay vì null để đảm bảo không bị đứt gãy quá trình tạo DOM
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {}; 

  const name = currentUser.FullName || currentUser.hoten || 'Khách';
  const objectType = currentUser.Object || 'Học sinh';
  const userId = currentUser.UserID || '----';
  const avatarUrl = currentUser.Avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Guest`;
  const permissions = currentUser.Permissions || currentUser.loai || 'Chưa phân quyền';
  
  let roleColorClass = "text-[#10b981]"; 
  const permLower = permissions.toLowerCase();
  if (permLower.includes('admin') || permLower.includes('quản trị')) { 
      roleColorClass = "text-[#f59e0b] font-bold"; 
  } else if (permLower.includes('giáo viên') || permLower.includes('gv')) { 
      roleColorClass = "text-[#00b5e2] font-semibold"; 
  }

  // Vẽ giao diện Header chứa CỨNG các ID (#timer, #progress, #dispMaDe...)
  headerContainer.innerHTML = `
  <header class="main-header sticky top-0 z-[1000] w-full relative bg-white/85 backdrop-blur-md border-b border-[#00b5e2]/10 shadow-[0_4px_20px_rgba(0,76,109,0.03)]">
    <div class="header-inner mx-auto px-4 md:px-6 flex items-center justify-between w-full h-[72px]">
      
      <div class="flex items-center gap-3 cursor-pointer group" onclick="chuyenTrang('index')">
        <div class="bg-[#00b5e2] rounded-xl p-2 shadow-lg group-hover:scale-105 transition-transform">
          <i class="fas fa-graduation-cap text-white text-xl"></i>
        </div>
        <div class="flex flex-col leading-none hidden sm:flex">
          <span class="text-[#004c6d] font-black text-lg uppercase">Smart<span class="text-[#00b5e2]">School</span></span>
          <span class="text-[10px] text-slate-400 font-bold mt-1">
            <span id="dispMaDe" class="text-[#f59e0b]">VER 2.0</span> • <span id="dispMon">2026</span>
          </span>
        </div>
      </div>

      <div id="userHeader" class="flex items-center gap-4">
        
        <div class="timer" id="timer" style="display: none; justify-content: center; align-items: center; background: #fff; color: #fb7185; padding: 6px 16px; border-radius: 50px; font-size: 1.05rem; font-weight: 800; box-shadow: 0 4px 12px rgba(251,113,133,0.15); border: 1px solid #ffe4e6; min-width: 100px; gap: 8px;">
          <i class="far fa-clock text-lg"></i> <span id="timeDisplay">00:00</span>
        </div>

        <div class="user-profile-card flex items-center pl-4 pr-1.5 py-1.5 rounded-2xl border border-[#e0f2fe] bg-white shadow-sm hover:shadow-md transition-all cursor-pointer">
          <div class="text-right mr-3 hidden sm:block">
            <div id="dispTen" class="text-sm font-bold text-slate-800 leading-tight">${name}</div>
            <div class="flex items-center justify-end gap-2 mt-0.5">
              <span id="header-object" class="text-[10px] font-bold text-[#00b5e2]">${objectType}</span>
              <span id="header-perm" class="role-badge ${permLower.includes('admin') ? 'admin-role' : (permLower.includes('giáo viên') || permLower.includes('gv')) ? 'teacher-role' : 'guest'}">${permissions}</span>
              <span id="dispID" class="text-[10px] text-slate-400 font-mono">ID: ${userId}</span>
            </div>
          </div>
          <div class="relative avatar-wrapper">
            <img id="userAvatar" src="${avatarUrl}" class="user-avatar" alt="Avatar">
            <div class="status-dot online"></div>
          </div>
          <button onclick="dangXuat()" class="logout-mini-btn ml-2" title="Đăng xuất">
            <i class="fas fa-power-off"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="absolute bottom-0 left-0 w-full h-[4px] bg-transparent">
      <div id="progress" class="h-full w-0 bg-gradient-to-r from-[#00b5e2] to-[#0ea5e9] transition-all duration-500 rounded-r-full"></div>
    </div>
  </header>
  `;
}

// ==================== HEADER DÙNG CHUNG CHO MỌI TRANG ====================
function renderGlobalHeader() {
  const headerContainer = document.getElementById('global-header');
  if (!headerContainer) return;

  // 1. KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP
  const currentUserStr = sessionStorage.getItem('currentUser');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const isLoggedIn = currentUser && currentUser.UserID; // Đảm bảo UserID tồn tại mới tính là đã login

  // 2. NHẬN DIỆN TIÊU ĐỀ TRANG DỰA TRÊN URL TỰ ĐỘNG
  const currentUrl = window.location.href.toLowerCase();
  let pageTitle = "";
  
  if (currentUrl.includes('hsinh')) pageTitle = "NHIỆM VỤ HỌC TẬP";
  else if (currentUrl.includes('soanch') || currentUrl.includes('loanch')) pageTitle = "NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM";
  else if (currentUrl.includes('soandetn')) pageTitle = "NGÂN HÀNG ĐỀ TRẮC NGHIỆM";
  else if (currentUrl.includes('soandetl')) pageTitle = "NGÂN HÀNG ĐỀ TỰ LUẬN";
  else if (currentUrl.includes('gbai')) pageTitle = "GIAO NHIỆM VỤ";
  else if (currentUrl.includes('thkq')) pageTitle = "TỔNG HỢP THỐNG KÊ";
  else if (currentUrl.includes('gsat')) pageTitle = "GIÁM SÁT HỌC TẬP";
  else if (currentUrl.includes('lbai')) pageTitle = "LÀM BÀI TRỰC TUYẾN";
  else if (currentUrl.includes('ontap') || currentUrl.includes('otap')) pageTitle = "ÔN TẬP TỰ LUYỆN";
  else if (currentUrl.includes('xhang')) pageTitle = "BẢNG XẾP HẠNG";
  else if (currentUrl.includes('tke')) pageTitle = "THỐNG KÊ KẾT QUẢ";
  else if (currentUrl.includes('index')) pageTitle = "HỆ THỐNG SMART SCHOOL";
  else if (currentUrl.includes('login')) pageTitle = "ĐĂNG NHẬP HỆ THỐNG";
  else if (currentUrl.includes('new') || currentUrl.includes('register')) pageTitle = "ĐĂNG KÝ TÀI KHOẢN MỚI";

  // 3. XÂY DỰNG KHỐI BÊN PHẢI (USER INFO HOẶC NÚT ĐĂNG NHẬP)
  
  // Nút Timer (Luôn giữ lại để các trang thi gọi hiển thị)
  const timerHTML = `
    <div class="timer" id="timer" style="display: none; justify-content: center; align-items: center; background: #fff; color: #fb7185; padding: 6px 16px; border-radius: 50px; font-size: 1.05rem; font-weight: 800; box-shadow: 0 4px 12px rgba(251,113,133,0.15); border: 1px solid #ffe4e6; min-width: 100px; gap: 8px;">
      <i class="far fa-clock text-lg"></i> <span id="timeDisplay">00:00</span>
    </div>
  `;

  let rightHeaderHTML = '';
  
  if (isLoggedIn) {
    // ---> CÓ ĐĂNG NHẬP: Hiển thị Profile
    const name = currentUser.FullName || currentUser.hoten || 'Khách';
    const objectType = currentUser.Object || 'Học sinh';
    const userId = currentUser.UserID || '----';
    const avatarUrl = currentUser.Avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userId)}`;
    const permissions = currentUser.Permissions || currentUser.loai || 'Chưa phân quyền';
    
    let roleColorClass = "guest"; 
    const permLower = permissions.toLowerCase();
    if (permLower.includes('admin') || permLower.includes('quản trị')) { 
        roleColorClass = "admin-role"; 
    } else if (permLower.includes('giáo viên') || permLower.includes('gv')) { 
        roleColorClass = "teacher-role"; 
    } else {
        roleColorClass = "text-[#10b981] bg-[#d1fae5] px-2 py-0.5 rounded"; // Màu xanh cho học sinh
    }

    rightHeaderHTML = `
      <div id="userHeader" class="flex items-center gap-4">
        ${timerHTML}
        <div class="user-profile-card flex items-center pl-4 pr-1.5 py-1.5 rounded-2xl border border-[#e0f2fe] bg-white shadow-sm hover:shadow-md transition-all cursor-pointer">
          <div class="text-right mr-3 hidden sm:block">
            <div id="dispTen" class="text-sm font-bold text-slate-800 leading-tight">${name}</div>
            <div class="flex items-center justify-end gap-2 mt-0.5">
              <span id="header-object" class="text-[10px] font-bold text-[#00b5e2]">${objectType}</span>
              <span id="header-perm" class="role-badge ${roleColorClass}">${permissions}</span>
              <span id="dispID" class="text-[10px] text-slate-400 font-mono">ID: ${userId}</span>
            </div>
          </div>
          <div class="relative avatar-wrapper">
            <img id="userAvatar" src="${avatarUrl}" class="user-avatar" alt="Avatar">
            <div class="status-dot online"></div>
          </div>
          <button onclick="dangXuat()" class="logout-mini-btn ml-2" title="Đăng xuất">
            <i class="fas fa-power-off"></i>
          </button>
        </div>
      </div>
    `;
  } else {
    // ---> CHƯA ĐĂNG NHẬP: Hiển thị Nút Login
    rightHeaderHTML = `
      <div class="flex items-center gap-4">
         ${timerHTML}
         <button onclick="chuyenTrang('login')" class="px-5 py-2.5 bg-gradient-to-r from-[#00b5e2] to-[#004c6d] text-white text-sm font-bold rounded-xl shadow-[0_4px_12px_rgba(0,181,226,0.3)] hover:scale-105 hover:shadow-[0_6px_15px_rgba(0,181,226,0.4)] transition-all flex items-center gap-2">
            <i class="fas fa-sign-in-alt"></i> Đăng nhập
         </button>
      </div>
    `;
  }

  // 4. RÁP TOÀN BỘ VÀO HEADER CHÍNH
  headerContainer.innerHTML = `
  <header class="main-header sticky top-0 z-[1000] w-full relative bg-white/85 backdrop-blur-md border-b border-[#00b5e2]/10 shadow-[0_4px_20px_rgba(0,76,109,0.03)]">
    <div class="header-inner mx-auto px-4 md:px-6 flex items-center justify-between w-full h-[72px] relative">
      
      <div class="flex items-center gap-3 cursor-pointer group z-10" onclick="chuyenTrang('index')">
        <div class="bg-[#00b5e2] rounded-xl p-2 shadow-lg group-hover:scale-105 transition-transform">
          <i class="fas fa-graduation-cap text-white text-xl"></i>
        </div>
        <div class="flex flex-col leading-none hidden sm:flex">
          <span class="text-[#004c6d] font-black text-lg uppercase">Smart<span class="text-[#00b5e2]">School</span></span>
          <span class="text-[10px] text-slate-400 font-bold mt-1">
            <span id="dispMaDe" class="text-[#f59e0b]">VER 2.0</span> • <span id="dispMon">2026</span>
          </span>
        </div>
      </div>

      <div class="absolute left-1/2 transform -translate-x-1/2 hidden md:flex flex-col items-center justify-center z-0 w-2/5">
         <h2 class="text-[#004c6d] font-black text-[1.1rem] lg:text-[1.25rem] tracking-wide truncate w-full text-center" title="${pageTitle}">
            ${pageTitle}
         </h2>
      </div>

      <div class="z-10 flex items-center">
         ${rightHeaderHTML}
      </div>

    </div>

    <div class="absolute bottom-0 left-0 w-full h-[4px] bg-transparent">
      <div id="progress" class="h-full w-0 bg-gradient-to-r from-[#00b5e2] to-[#0ea5e9] transition-all duration-500 rounded-r-full"></div>
    </div>
  </header>
  `;
}


// BẮT BUỘC GỌI NGAY lập tức để vẽ sẵn DOM
renderGlobalHeader();
if (typeof updateHeaderUI === "function") updateHeaderUI();

// Gọi hàm ngay khi load xong DOM cho các trang dùng chung
document.addEventListener('DOMContentLoaded', renderGlobalHeader);

// ===================================================================
// HÀM DÙNG CHUNG: TẠO THẺ CÂU HỎI (ĐÃ ĐƯỢC XÓA CSS RA THÊM VÀO STYLE.CSS)
// ===================================================================
function buildSharedQuestionCard(rawData, options = {}) {
  const card = document.createElement('div');
  card.className = 'preview-card'; 
  const d = rawData.data || rawData; 

  const getFriendlyName = (id, selectName) => {
    if (!id) return '';
    if (typeof fullDataTree !== 'undefined' && fullDataTree) {
        const listMap = { 'SubjectID': 'monList', 'BlockID': 'khoiList', 'TypeID': 'loaiList', 'LevelID': 'mucdoList', 'TopicID': 'chudeList' };
        const list = fullDataTree[listMap[selectName]];
        if (list) {
            const item = list.find(x => x.id === id);
            if (item) return item.name;
        }
    }
    const sel = document.querySelector(`select[name="${selectName}"]`);
    if (sel) {
        const opt = Array.from(sel.options).find(o => o.value === id);
        if (opt && opt.text !== 'Tất cả') return opt.text;
    }
    return id; 
  };

  const mon = getFriendlyName(d.SubjectID || d.mon, 'SubjectID');
  const khoi = getFriendlyName(d.BlockID || d.khoi, 'BlockID');
  const loai = getFriendlyName(d.TypeID || d.loai, 'TypeID');
  const mucdo = getFriendlyName(d.LevelID || d.mucdo, 'LevelID');
  const chude = getFriendlyName(d.TopicID || d.chude, 'TopicID');

  const line1Arr = [mon, khoi, loai, mucdo].filter(item => item && String(item).trim() !== '');
  const line1Text = line1Arr.join(' - ');

  let metaTags = '<div class="meta-header">';
  if (line1Text) metaTags += `<div class="meta-line-1">${line1Text}</div>`;
  if (chude) metaTags += `<div class="meta-line-2">${chude}</div>`;
  metaTags += '</div>';

  let iconHtml = '';
  if (options.showToggleIcon) {
    iconHtml = `<i class="fas fa-${options.isSelected ? 'minus-circle' : 'plus-circle'} select-icon ${options.isSelected ? 'remove-icon' : 'add-icon'}" onclick="event.stopPropagation(); ${options.onToggleAction}"></i>`;
  }
  const orderHtml = options.order ? `<div class="card-number">${options.order}</div>` : '';
  const actionsHtml = (orderHtml || iconHtml) ? `<div class="card-actions-box">${orderHtml} ${iconHtml}</div>` : '';

  const caudan = d.QuestionLabel || d.caudan || d['Câu dẫn'] || '';
  const dapanA = d.A || d.dapanA || '';
  const dapanB = d.B || d.dapanB || '';
  const dapanC = d.C || d.dapanC || '';
  const dapanD = d.D || d.dapanD || '';
  const ghichu = d.Note || d.ghichu || d.Keywords || '';
  const hinhanh = d.Image || d.hinhanh || '';

  const imgId = hinhanh ? String(hinhanh).trim() : '';
  const img = imgId ? `<img src="https://drive.google.com/thumbnail?id=${imgId}&sz=w1000" class="preview-image" loading="lazy" onclick="event.stopPropagation(); if(typeof openImageModal==='function') openImageModal('https://drive.google.com/uc?id=${imgId}')">` : '';
  
  let optionsHtml = '<div class="options">';
  if (dapanA) optionsHtml += `<div><strong>A.</strong> ${dapanA}</div>`;
  if (dapanB) optionsHtml += `<div><strong>B.</strong> ${dapanB}</div>`;
  if (dapanC) optionsHtml += `<div><strong>C.</strong> ${dapanC}</div>`;
  if (dapanD) optionsHtml += `<div><strong>D.</strong> ${dapanD}</div>`;
  optionsHtml += '</div>';

  let extra = ghichu ? `<div class="extra-info"><strong>Ghi chú:</strong> ${ghichu}</div>` : '';

  card.innerHTML = `
    ${actionsHtml}
    ${metaTags}
    <div class="question-text">${caudan || '<em style="color:#9aa0a6;">(Chưa nhập câu dẫn)</em>'}</div>
    ${img}
    ${optionsHtml}
    ${extra}
  `;

  if (imgId) {
    const imgEl = card.querySelector('.preview-image');
    if (imgEl) {
      imgEl.onload = () => { 
        card.classList.add('split-layout'); 
        const splitContent = document.createElement('div'); splitContent.className = 'split-content'; 
        const mainCol = document.createElement('div'); mainCol.className = 'card-main'; 
        
        const opts = card.querySelector('.options');
        if (opts) mainCol.appendChild(opts); 
        
        splitContent.appendChild(mainCol); 
        splitContent.appendChild(imgEl); 
        
        const qt = card.querySelector('.question-text');
        if (qt && qt.nextSibling) qt.parentNode.insertBefore(splitContent, qt.nextSibling);
      }; 
      imgEl.onerror = () => { imgEl.style.display = 'none'; }; 
    }
  }

  return card;
}



// ===================================================================
// BỘ CÔNG CỤ QUIZ ENGINE DÙNG CHUNG CHO CÁC TRANG LÀM BÀI (LBAI / OTAP)
// ===================================================================

function formatTimeShared(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function renderLaTeXShared() {
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(document.body, {
      delimiters: [ {left:'$$',right:'$$',display:true}, {left:'$',right:'$',display:false}, {left:'\\(',right:'\\)',display:false}, {left:'\\[',right:'\\]',display:true} ],
      throwOnError: false
    });
  }
}

function applyLayoutBasedOnImageShared(questionDiv, hasImage, imgElement) {
  if (!hasImage) return;
  imgElement.onload = () => {
    const aspectRatio = imgElement.naturalHeight / imgElement.naturalWidth;
    if (aspectRatio > 0.7) {
      questionDiv.classList.add('split-layout');
      const header = questionDiv.querySelector('.question-header');
      const imageWrapper = questionDiv.querySelector('.question-image-wrapper');
      const answerContainer = questionDiv.querySelector('.answer-container');
      const mainCol = document.createElement('div');
      mainCol.className = 'question-main';
      mainCol.appendChild(header);
      if (answerContainer) mainCol.appendChild(answerContainer);
      questionDiv.innerHTML = '';
      questionDiv.appendChild(mainCol);
      questionDiv.appendChild(imageWrapper);
    }
  };
  imgElement.onerror = () => { if (imgElement.parentElement) imgElement.parentElement.style.display = 'none'; };
}

function getSelectedAnswersShared(containerId, index) {
  const questionDiv = document.getElementById(containerId).querySelectorAll('.question')[index];
  if(!questionDiv) return {};
  const inputs = questionDiv.querySelectorAll('input:checked');
  const selected = {};
  inputs.forEach(input => {
    const value = input.value;
    if (value.includes('|')) {
      const [idx, choice] = value.split('|');
      selected[idx] = choice;
    } else {
      if (!selected.normal) selected.normal = [];
      selected.normal.push(value);
    }
  });
  return selected;
}

function isQuestionAnsweredShared(q, containerId, index) {
  const selected = getSelectedAnswersShared(containerId, index);
  if (q.loaiCauHoi.includes('đúng - sai')) { return Object.keys(selected).length === q.options.length; } 
  else { return (selected.normal || []).length > 0; }
}

// Hàm vẽ Giao diện làm bài
function renderQuizShared(questions, containerId, onProgressCallbackName) {
  const c = document.getElementById(containerId);
  if(!c) return;
  c.innerHTML = '';
  
  questions.forEach((q, i) => {
    const d = document.createElement('div');
    d.className = 'question';

    const hasImage = !!q.hinhanh;
    let imageHTML = hasImage ? `<div class="question-image-wrapper"><img src="https://drive.google.com/thumbnail?id=${q.hinhanh}&sz=1000" class="question-image" loading="lazy"></div>` : '';
    const isTrueFalse = q.loaiCauHoi.includes('đúng - sai');
    const isSingle = !isTrueFalse && q.loaiCauHoi === '01 câu đúng';

    let contentHTML = `<div class="question-header"><div class="question-number">${i+1}</div><div class="question-text">${q.question}</div></div>${imageHTML}<div class="answer-container">`;

    if (isTrueFalse) {
      const groupName = `tf-group-${containerId}-${i}`;
      q.options.forEach((opt, optIdx) => {
        contentHTML += `<div class="answer-item"><div class="answer-options tf-options"><label class="answer-label"><input type="radio" name="${groupName}-${optIdx}" value="${optIdx}|Đúng" onchange="${onProgressCallbackName}()">Đúng</label><label class="answer-label"><input type="radio" name="${groupName}-${optIdx}" value="${optIdx}|Sai" onchange="${onProgressCallbackName}()">Sai</label></div><div class="answer-content">${opt}</div></div>`;
      });
    } else {
      const nameAttr = isSingle ? `name="q_${containerId}_${i}"` : '';
      const inputType = isSingle ? 'radio' : 'checkbox';
      q.options.forEach((opt) => {
        contentHTML += `<div class="answer-item" onclick="this.querySelector('input').click()"><div class="answer-options"><label class="answer-label"><input type="${inputType}" ${nameAttr} value="${opt}" onchange="${onProgressCallbackName}()"></label></div><div class="answer-content">${opt}</div></div>`;
      });
    }

    contentHTML += `</div>`;
    d.innerHTML = contentHTML;

    if (hasImage) applyLayoutBasedOnImageShared(d, hasImage, d.querySelector('.question-image'));

    const items = d.querySelectorAll('.answer-item');
    items.forEach(item => {
      const inputs = item.querySelectorAll('input');
      inputs.forEach(input => {
        input.addEventListener('change', () => {
          if (isTrueFalse) { item.classList.toggle('selected', Array.from(item.querySelectorAll('input')).some(r => r.checked)); } 
          else if (isSingle) { items.forEach(sib => sib.classList.remove('selected')); if (input.checked) item.classList.add('selected'); } 
          else { item.classList.toggle('selected', input.checked); }
        });
      });
    });
    c.appendChild(d);
  });
  renderLaTeXShared();
}

// ==================== HÀM CHẤM ĐIỂM VÀ HIỂN THỊ KẾT QUẢ DÙNG CHUNG ====================
function calculateAndRenderResultsShared(questions, containerId, msgContainerId, userInfoInfoStr) {
  let score = 0; let totalContents = 0;
  const answers = []; const chiTietDapAn = [];

  questions.forEach((q, i) => {
    const selected = getSelectedAnswersShared(containerId, i);
    let correctCountThisQuestion = 0; let questionTotal = 0;
    const isTrueFalse = q.loaiCauHoi.trim().toLowerCase().includes('đúng - sai');

    if (isTrueFalse) {
      q.options.forEach((opt, optIdx) => {
        const isCorrectAnswer = q.answer.includes(opt);
        const userChoice = selected[optIdx] || null;
        if (userChoice === (isCorrectAnswer ? 'Đúng' : 'Sai')) correctCountThisQuestion++;
      });
      questionTotal = q.options.length;
    } else {
      const correctAnswers = Array.isArray(q.answer) ? q.answer : [q.answer];
      const userSelected = (selected.normal || []);
      const numCorrectChosen = correctAnswers.filter(ans => userSelected.includes(ans)).length;
      const numWrongChosen = userSelected.filter(ans => !correctAnswers.includes(ans)).length;
      correctCountThisQuestion = (numCorrectChosen === correctAnswers.length && numWrongChosen === 0) ? correctAnswers.length : Math.max(0, numCorrectChosen - numWrongChosen);
      questionTotal = correctAnswers.length;
    }

    score += correctCountThisQuestion; totalContents += questionTotal;
    answers.push({ question: q.question, selected: selected, correct: q.answer, explanation: q.explanation, hinhanh: q.hinhanh, isTrueFalse: isTrueFalse, point: correctCountThisQuestion, totalThisQ: questionTotal });
    chiTietDapAn.push({ question: q.question, options: q.options, selected: selected, correct: q.answer });
  });

  const percentage = totalContents > 0 ? Math.round((score / totalContents) * 100) : 0;
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  answers.forEach((a, i) => {
    const q = questions[i];
    const div = document.createElement('div');
    div.className = `result-item ${a.point === a.totalThisQ ? 'correct' : 'wrong'}`;

    let imageHTML = a.hinhanh ? `<div class="question-image-wrapper"><img src="https://drive.google.com/thumbnail?id=${a.hinhanh}&sz=1000" class="question-image" loading="lazy" onerror="this.parentElement.style.display='none'"></div>` : '';
    let explanationHTML = a.explanation && a.explanation.trim() !== '' ? `<div style="background:#f1f5f9; padding:12px; border-radius:8px; margin-top:12px; font-size:0.95rem; color:#475569;"><strong><i class="fas fa-lightbulb text-yellow-500"></i> Giải thích:</strong> ${a.explanation}</div>` : '';

    let resultHTML = '';
    if (a.isTrueFalse) {
      resultHTML = '<div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">';
      q.options.forEach((opt, optIdx) => {
        const isCorrect = q.answer.includes(opt);
        const user = a.selected[optIdx] || 'Chưa chọn';
        const correct = isCorrect ? 'Đúng' : 'Sai';
        const isUserCorrect = user === correct;
        resultHTML += `<div style="padding:10px; background:#f8fafc; border-radius:8px; border-left:4px solid ${isUserCorrect ? '#10b981' : '#fb7185'};"><strong style="color:#1e293b;">${opt}</strong><br>Bạn chọn: <span style="font-weight:bold; color:${isUserCorrect ? '#10b981' : '#fb7185'}">${user}</span> | Đáp án: <span style="font-weight:bold; color:#10b981">${correct}</span></div>`;
      });
      resultHTML += '</div>';
    } else {
      const userSelectedContents = (a.selected.normal || []);
      const correctContents = Array.isArray(a.correct) ? a.correct : [a.correct];
      
      const isSingleAnswer = q.TypeID === 'Typ_0001' || q.TypeID === 'Typ_0006' || correctContents.length === 1;

      if (isSingleAnswer) {
        const userAnsStr = userSelectedContents.length > 0 ? userSelectedContents.join(', ') : 'Chưa chọn';
        const correctAnsStr = correctContents.join(', ');
        const userColor = a.point === a.totalThisQ ? '#10b981' : '#fb7185';

        resultHTML = `
          <div style="margin-top: 12px; background: #f8fafc; padding: 12px; border-radius: 8px;">
            <div style="margin-bottom: 6px; font-size: 1.05rem;">
              <span style="font-weight: 700; color: #64748b;">Bạn chọn:</span>
              <span style="color: ${userColor}; font-weight: 700; margin-left: 8px;">${userAnsStr}</span>
            </div>
            <div style="font-size: 1.05rem;">
              <span style="font-weight: 700; color: #10b981;">Đáp án chính xác:</span>
              <span style="color: #10b981; font-weight: 700; margin-left: 8px;">${correctAnsStr}</span>
            </div>
          </div>
        `;
      } else {
        const userAnsLines = userSelectedContents.length > 0 ? userSelectedContents.map(c => `<div>• ${c}</div>`).join('') : '<em>Chưa chọn</em>';
        const correctAnsLines = correctContents.map(c => `<div>• ${c}</div>`).join('');
        resultHTML = `
          <div style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="padding:12px; background:#f8fafc; border-radius:8px;">
              <span style="font-weight:bold; color:#64748b;">Bạn chọn:</span> 
              <div style="color:${a.point === 0 && userSelectedContents.length > 0 ? '#fb7185' : '#004c6d'}; font-weight:600; margin-top:4px;">${userAnsLines}</div>
            </div>
            <div style="padding:12px; background:#f0fdf4; border-radius:8px;">
              <span style="font-weight:bold; color:#10b981;">Đáp án chính xác:</span> 
              <div style="color:#059669; font-weight:600; margin-top:4px;">${correctAnsLines}</div>
            </div>
          </div>`;
      }
    }

    div.innerHTML = `<div style="font-size:1.1rem; font-weight:700; color:#004c6d;">${i+1}. ${q.question}</div>${imageHTML}${resultHTML}${explanationHTML}`;
    container.appendChild(div);
  });
  
  if (typeof renderLaTeXShared === 'function') renderLaTeXShared();

  document.getElementById(msgContainerId).innerHTML = `
    <div class="final-result">
      <h2>Chúc mừng <strong>${userInfoInfoStr}</strong>!</h2>
      <div class="score">${score}<small>/${totalContents}</small></div>
      <p>Độ chính xác: <strong style="color:#10b981; font-size:1.2rem;">${percentage}%</strong></p>
      <p style="color:#004c6d;">Bạn đã hoàn thành bài kiểm tra!</p>
    </div>`;
    
  return { score, totalContents, percentage, chiTietDapAn };
}

// ==================== HÀM TRỢ GIÚP XÁO TRỘN MẢNG (DÙNG CHUNG) ====================
function shuffleArrayShared(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}