// ==================== CẤU HÌNH HỆ THỐNG ====================
const API_URL = "https://script.google.com/macros/s/AKfycbxrWXq1zYWet7iW0kxbK4a_Xndg-K4EFw4ul5Rx2bjcAbUFPZJDL73wvIMbw_opH63Y/exec";
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

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
    // Nếu silent = true, nó sẽ tự nuốt lỗi không hiện Toast
    if (!silent) showToast('Lỗi mạng hoặc Server quá tải!', 'error');
    throw error;
  }
}

function chuyenTrang(fileCode) {
  const mapRoute = {
    '00_Login': 'login.html',
    '1_SoanCH': 'soanch.html',
    '2_SoandeTL': 'soandeTL.html',
    '2_SoandeTN': 'soandeTN.html',
    '3_HSinh': 'hsinh.html',
    '4_GBai': 'gbai.html',
    '4_THKQ': 'thkq.html',
    '5_LBai': 'lbai.html',
    '6_OTap': 'otap.html',
    '8_TKe': 'tke.html',
    '00_Index': 'index.html',
    '00_New': 'register.html',
    'gsat': 'gsat.html'
  };
  const targetHtml = mapRoute[fileCode] || fileCode + '.html';
  window.location.href = targetHtml;
}

// ==================== XÁC THỰC & THÔNG BÁO ====================
function requireLogin() {
  if (!currentUser) {
    showToast('Vui lòng đăng nhập!', 'warning');
    setTimeout(() => chuyenTrang('00_Login'), 1500);
    return false;
  }
  return true;
}

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
               Event: 'LOGUOT',
               Note: 'Đăng xuất an toàn'
           }, true); // Bật chế độ silent (chạy ngầm)
       } catch(e) {
           console.error("Lỗi ghi log đăng xuất:", e);
       }
    }
    // --------------------------------------------

    localStorage.removeItem('currentUser');
    currentUser = null;
    showToast('Đã đăng xuất an toàn', 'info');
    setTimeout(() => chuyenTrang('00_Login'), 800);
  }
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const config = { success: { icon: 'fa-check-circle', title: 'Thành công' }, error: { icon: 'fa-times-circle', title: 'Lỗi' }, warning: { icon: 'fa-exclamation-triangle', title: 'Cảnh báo' }, info: { icon: 'fa-info-circle', title: 'Thông báo' } };
  const { icon, title } = config[type] || config.info;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`; 
  toast.innerHTML = `<i class="fas ${icon} text-xl"></i><div class="toast-content"><span class="toast-title">${title}</span><span class="toast-message">${msg}</span></div><button class="toast-close" onclick="closeToast(this)"><i class="fas fa-times"></i></button>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { if(toast && toast.parentElement) closeToast(toast.querySelector('.toast-close')); }, 4000);
}

function closeToast(btn) {
  const toast = btn.closest('.toast');
  if (toast) { toast.classList.remove('show'); setTimeout(() => { if(toast.parentElement) toast.remove(); }, 400); }
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
      btnConfirm.className = 'flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all font-bold shadow-lg shadow-indigo-500/30 text-white';
    }

    modal.classList.remove('hidden');
    setTimeout(() => { document.getElementById('modalContent').classList.replace('scale-90', 'scale-100'); document.getElementById('modalContent').classList.replace('opacity-0', 'opacity-100'); }, 10);

    const close = (result) => {
      document.getElementById('modalContent').classList.replace('scale-100', 'scale-90');
      document.getElementById('modalContent').classList.replace('opacity-100', 'opacity-0');
      setTimeout(() => { modal.classList.add('hidden'); resolve(result); }, 300);
    };
    btnConfirm.onclick = () => close(true);
    document.getElementById('btnCancel').onclick = () => close(false);
  });
}

// ==================== HEADER ĐỘNG ====================

function updateHeaderUI() {
  if (!currentUser) return;
  const nameEl = document.getElementById('header-full-name');
  const idEl = document.getElementById('header-user-id');
  const permEl = document.getElementById('header-perm');
  const objectEl = document.getElementById('header-object'); 
  const avatarEl = document.getElementById('header-avatar');

  if (nameEl) nameEl.innerText = currentUser.FullName || "Người dùng";
  if (idEl) idEl.innerText = `ID: ${currentUser.UserID || '----'}`;
  if (avatarEl) avatarEl.src = currentUser.Avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.UserID)}`;
  
  // Hiển thị Object (Giáo viên / Học sinh)
  if (objectEl) {
    objectEl.innerText = currentUser.Object || 'Học sinh';
  }

  if (permEl) {
    const role = currentUser.Permissions || 'User';
    permEl.innerText = role;
    
    // Đổi màu theo cả Permissions hoặc Object
    const isTeacher = role.toLowerCase().includes('gv') || (currentUser.Object && currentUser.Object.toLowerCase().includes('giáo viên'));
    permEl.className = "role-badge " + (role.toLowerCase().includes('admin') ? 'admin-role' : isTeacher ? 'teacher-role' : 'guest');
  }
}

document.addEventListener('DOMContentLoaded', updateHeaderUI);




