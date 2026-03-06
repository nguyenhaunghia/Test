// --- HÀM TOGGLE MENU CON ---
function toggleSubMenu(element) {
  const parent = element.parentElement;
  const subMenu = parent.querySelector('.submenu-container');
  const arrow = element.querySelector('.rotate-icon');
  if(subMenu) subMenu.classList.toggle('open');
  if(arrow) arrow.classList.toggle('rotate');
}

// --- HÀM TẢI KHUNG CHỨC NĂNG DỰA TRÊN QUYỀN VÀ OBJECT ---
function loadFeatures() {
  const featureGrid = document.getElementById('featureGrid');
  if (!featureGrid) return;
  featureGrid.innerHTML = '';

  // Nhận diện qua Permissions và Object
  const role = (currentUser && currentUser.Permissions) ? currentUser.Permissions.toLowerCase() : '';
  const obj = (currentUser && currentUser.Object) ? currentUser.Object.toLowerCase() : '';
  const isGV = obj.includes('giáo viên') || obj.includes('gv') || role.includes('admin') || role.includes('giáo viên');

  const actionNganHangCH = isGV ? "chuyenTrang('1_SoanCH')" : (currentUser ? "showToast('Tài khoản chưa được phân quyền', 'error')" : "requireLogin()");
  const actionTN = isGV ? "chuyenTrang('2_SoandeTN')" : (currentUser ? "showToast('Tài khoản chưa được phân quyền', 'error')" : "requireLogin()");
  const actionTL = isGV ? "chuyenTrang('2_SoandeTL')" : (currentUser ? "showToast('Tài khoản chưa được phân quyền', 'error')" : "requireLogin()");
  const actionGB = isGV ? "chuyenTrang('4_GBai')" : (currentUser ? "showToast('Tài khoản chưa được phân quyền', 'error')" : "requireLogin()");
  const actionTH = isGV ? "chuyenTrang('4_THKQ')" : (currentUser ? "showToast('Tài khoản chưa được phân quyền', 'error')" : "requireLogin()");
  
  // THÊM MỚI: Liên kết đến trang Giám sát học tập (Gsat.html)
  const actionGS = isGV ? "chuyenTrang('Gsat')" : (currentUser ? "showToast('Tài khoản chưa được phân quyền', 'error')" : "requireLogin()");

  // Cột 1: HỆ THỐNG
  const col1 = document.createElement('div');
  col1.className = 'glass rounded-3xl p-6 shadow-lg border border-white/20';
  col1.innerHTML = `
    <h2 class="text-xl font-bold mb-4 flex items-center"><i class="fas fa-cog mr-3 text-indigo-300"></i>HỆ THỐNG</h2>
    <ul class="space-y-2">
      ${currentUser ? '' : '<li class="menu-item flex items-center cursor-pointer" onclick="chuyenTrang(\'00_Login\')"><i class="fas fa-sign-in-alt mr-3 text-indigo-300"></i>Đăng nhập</li>'}        
      <li class="menu-item flex items-center cursor-pointer" onclick="chuyenTrang('00_New')"><i class="fas fa-user-plus mr-3 text-indigo-300"></i>Đăng ký mới</li>
      <li class="menu-item flex items-center cursor-pointer" onclick="${currentUser ? 'showToast(\'Tính năng đang hoàn thiện\', \'warning\')' : 'chuyenTrang(\'00_Login\')'}"><i class="fas fa-user-cog mr-3 text-indigo-300"></i>Tài khoản</li>
    </ul>
  `;
  featureGrid.appendChild(col1);

  // Cột 2: KHUNG CỦA GIÁO VIÊN (Lấy FullName làm tiêu đề nếu là GV)
  const col2 = document.createElement('div');
  col2.className = 'glass rounded-3xl p-6 shadow-lg border border-white/20';
  const gvTitle = isGV ? (currentUser.FullName || 'GIÁO VIÊN').toUpperCase() : 'GIÁO VIÊN';
  
  col2.innerHTML = `
    <h2 class="text-xl font-bold mb-4 flex items-center"><i class="fas fa-chalkboard-teacher mr-3 text-blue-300"></i>${gvTitle}</h2>
    <ul class="space-y-2">
      <li class="menu-item flex items-center cursor-pointer" onclick="${actionNganHangCH}"><i class="fas fa-database mr-3 text-blue-300"></i>Ngân hàng câu hỏi</li>
      <li>
        <div class="menu-item flex items-center justify-between cursor-pointer" onclick="toggleSubMenu(this)">
          <div class="flex items-center"><i class="fas fa-folder-open mr-3 text-blue-300"></i>Ngân hàng đề</div>
          <i class="fas fa-chevron-right text-xs rotate-icon opacity-70"></i>
        </div>
        <div class="submenu-container space-y-2">
           <div class="menu-item submenu-item flex items-center cursor-pointer" onclick="${actionTN}"><i class="fas fa-list-check mr-3 text-blue-200 text-sm"></i><span class="text-sm">Trắc nghiệm</span></div>
           <div class="menu-item submenu-item flex items-center cursor-pointer" onclick="${actionTL}"><i class="fas fa-pen-nib mr-3 text-blue-200 text-sm"></i><span class="text-sm">Tự luận</span></div>
        </div>
      </li>
      <li>
        <div class="menu-item flex items-center justify-between cursor-pointer" onclick="toggleSubMenu(this)">
          <div class="flex items-center"><i class="fas fa-paper-plane mr-3 text-blue-300"></i>Nhiệm vụ học tập</div>
          <i class="fas fa-chevron-right text-xs rotate-icon opacity-70"></i>
        </div>
        <div class="submenu-container space-y-2">
           <div class="menu-item submenu-item flex items-center cursor-pointer" onclick="${actionGB}"><i class="fas fa-tasks mr-3 text-blue-200 text-sm"></i><span class="text-sm">Giao nhiệm vụ</span></div>
           <div class="menu-item submenu-item flex items-center cursor-pointer" onclick="${actionGS}"><i class="fas fa-eye mr-3 text-blue-200 text-sm"></i><span class="text-sm">Giám sát học tập</span></div>
           <div class="menu-item submenu-item flex items-center cursor-pointer" onclick="${actionTH}"><i class="fas fa-chart-line mr-3 text-blue-200 text-sm"></i><span class="text-sm">Tổng hợp thống kê</span></div>
        </div>
      </li>
    </ul>
  `;
  featureGrid.appendChild(col2);

  // Cột 3: HỌC SINH (Hiển thị Trang - Tên học sinh)
  const col3 = document.createElement('div');
  col3.className = 'glass rounded-3xl p-6 shadow-lg border border-white/20';
  
  const studentMenu = currentUser ? `Trang - ${currentUser.FullName}` : 'Trang cá nhân';
  
  col3.innerHTML = `
    <h2 class="text-xl font-bold mb-4 flex items-center"><i class="fas fa-user-graduate mr-3 text-emerald-300"></i>HỌC SINH</h2>
    <ul class="space-y-2">
      <li class="menu-item flex items-center cursor-pointer" onclick="${currentUser ? 'chuyenTrang(\'3_HSinh\')' : 'requireLogin()'}"><i class="fas fa-user mr-3 text-emerald-300"></i>${studentMenu}</li>
      <li class="menu-item flex items-center cursor-pointer" onclick="chuyenTrang('6_OTap')"><i class="fas fa-brain mr-3 text-emerald-300"></i>Tự ôn luyện</li>
      <li class="menu-item flex items-center cursor-pointer" onclick="chuyenTrang('7_XHang')"><i class="fas fa-award mr-3 text-emerald-300"></i>Xếp hạng</li>
      <li class="menu-item flex items-center cursor-pointer" onclick="chuyenTrang('8_TKe')"><i class="fas fa-chart-line mr-3 text-emerald-300"></i>Thống kê</li>
    </ul>
  `;
  featureGrid.appendChild(col3);
}

function loadFeaturesCu() {
  const featureGrid = document.getElementById('featureGrid');
  if (!featureGrid) return;
  featureGrid.innerHTML = '';

  // Nhận diện quyền bằng dữ liệu chuẩn mới (Permissions)
  const role = (currentUser && currentUser.Permissions) ? currentUser.Permissions.toLowerCase() : '';
  const isGV = role.includes('giáo viên') || role.includes('gv') || role.includes('admin');

  // Action Strings (Gọi hàm showToast dùng chung bên script.js)
  const actionNganHangCH = isGV ? "chuyenTrang('1_SoanCH')" : (currentUser ? "showToast('Tài khoản chưa được phân quyền', 'error')" : "requireLogin()");
  const actionTN = isGV ? "chuyenTrang('2_SoandeTN')" : (currentUser ? "showToast('Tài khoản chưa được phân quyền', 'error')" : "requireLogin()");
  const actionTL = isGV ? "chuyenTrang('2_SoandeTL')" : (currentUser ? "showToast('Tài khoản chưa được phân quyền', 'error')" : "requireLogin()");
  const actionGB = isGV ? "chuyenTrang('4_GBai')" : (currentUser ? "showToast('Tài khoản chưa được phân quyền', 'error')" : "requireLogin()");
  const actionTH = isGV ? "chuyenTrang('4_THKQ')" : (currentUser ? "showToast('Tài khoản chưa được phân quyền', 'error')" : "requireLogin()");
  const actionGS = isGV ? "chuyenTrang('Gsat')" : (currentUser ? "showToast('Tài khoản chưa được phân quyền', 'error')" : "requireLogin()");

  // Cột 1: HỆ THỐNG
  const col1 = document.createElement('div');
  col1.className = 'glass rounded-3xl p-6 shadow-lg border border-white/20';
  col1.innerHTML = `
    <h2 class="text-xl font-bold mb-4 flex items-center"><i class="fas fa-cog mr-3 text-indigo-300"></i>HỆ THỐNG</h2>
    <ul class="space-y-2">
      ${currentUser ? '' : '<li class="menu-item flex items-center cursor-pointer" onclick="chuyenTrang(\'00_Login\')"><i class="fas fa-sign-in-alt mr-3 text-indigo-300"></i>Đăng nhập</li>'}        
      <li class="menu-item flex items-center cursor-pointer" onclick="chuyenTrang('00_New')"><i class="fas fa-user-plus mr-3 text-indigo-300"></i>Đăng ký mới</li>
      <li class="menu-item flex items-center cursor-pointer" onclick="${currentUser ? 'showToast(\'Tính năng đang hoàn thiện\', \'warning\')' : 'chuyenTrang(\'00_Login\')'}"><i class="fas fa-user-cog mr-3 text-indigo-300"></i>Tài khoản</li>
    </ul>
  `;
  featureGrid.appendChild(col1);

  // Cột 2: GIÁO VIÊN
  const col2 = document.createElement('div');
  col2.className = 'glass rounded-3xl p-6 shadow-lg border border-white/20';
  const gvTitle = isGV ? `GIÁO VIÊN: ${(currentUser.FullName || '').toUpperCase()}` : 'GIÁO VIÊN';
  col2.innerHTML = `
    <h2 class="text-xl font-bold mb-4 flex items-center"><i class="fas fa-chalkboard-teacher mr-3 text-blue-300"></i>${gvTitle}</h2>
    <ul class="space-y-2">
      <li class="menu-item flex items-center cursor-pointer" onclick="${actionNganHangCH}"><i class="fas fa-database mr-3 text-blue-300"></i>Ngân hàng câu hỏi</li>
      <li>
        <div class="menu-item flex items-center justify-between cursor-pointer" onclick="toggleSubMenu(this)">
          <div class="flex items-center"><i class="fas fa-folder-open mr-3 text-blue-300"></i>Ngân hàng đề</div>
          <i class="fas fa-chevron-right text-xs rotate-icon opacity-70"></i>
        </div>
        <div class="submenu-container space-y-2">
           <div class="menu-item submenu-item flex items-center cursor-pointer" onclick="${actionTN}"><i class="fas fa-list-check mr-3 text-blue-200 text-sm"></i><span class="text-sm">Trắc nghiệm</span></div>
           <div class="menu-item submenu-item flex items-center cursor-pointer" onclick="${actionTL}"><i class="fas fa-pen-nib mr-3 text-blue-200 text-sm"></i><span class="text-sm">Tự luận</span></div>
        </div>
      </li>
      <li>
        <div class="menu-item flex items-center justify-between cursor-pointer" onclick="toggleSubMenu(this)">
          <div class="flex items-center"><i class="fas fa-paper-plane mr-3 text-blue-300"></i>Nhiệm vụ học tập</div>
          <i class="fas fa-chevron-right text-xs rotate-icon opacity-70"></i>
        </div>
        <div class="submenu-container space-y-2">
           <div class="menu-item submenu-item flex items-center cursor-pointer" onclick="${actionGB}"><i class="fas fa-tasks mr-3 text-blue-200 text-sm"></i><span class="text-sm">Giao nhiệm vụ</span></div>
           <div class="menu-item submenu-item flex items-center cursor-pointer" onclick="${actionGS}"><i class="fas fa-eye mr-3 text-blue-200 text-sm"></i><span class="text-sm">Giám sát học tập</span></div>
           <div class="menu-item submenu-item flex items-center cursor-pointer" onclick="${actionTH}"><i class="fas fa-chart-line mr-3 text-blue-200 text-sm"></i><span class="text-sm">Tổng hợp thống kê</span></div>
        </div>
      </li>
    </ul>
  `;
  featureGrid.appendChild(col2);

  // Cột 3: HỌC SINH
  const col3 = document.createElement('div');
  col3.className = 'glass rounded-3xl p-6 shadow-lg border border-white/20';
  col3.innerHTML = `
    <h2 class="text-xl font-bold mb-4 flex items-center"><i class="fas fa-user-graduate mr-3 text-emerald-300"></i>HỌC SINH</h2>
    <ul class="space-y-2">
      <li class="menu-item flex items-center cursor-pointer" onclick="${currentUser ? 'chuyenTrang(\'3_HSinh\')' : 'requireLogin()'}"><i class="fas fa-user mr-3 text-emerald-300"></i>${currentUser ? 'Trang - ' + currentUser.FullName : 'Trang cá nhân'}</li>
      <li class="menu-item flex items-center cursor-pointer" onclick="chuyenTrang('6_OTap')"><i class="fas fa-brain mr-3 text-emerald-300"></i>Tự ôn luyện</li>
      <li class="menu-item flex items-center cursor-pointer" onclick="chuyenTrang('7_XHang')"><i class="fas fa-award mr-3 text-emerald-300"></i>Xếp hạng</li>
      <li class="menu-item flex items-center cursor-pointer" onclick="chuyenTrang('8_TKe')"><i class="fas fa-chart-line mr-3 text-emerald-300"></i>Thống kê</li>
    </ul>
  `;
  featureGrid.appendChild(col3);
}

// --- KHỞI CHẠY (Bảo hiểm chống treo spin) ---
window.onload = () => {
  // Chạy giao diện
  try { loadFeatures(); } catch (e) { console.error(e); }
  
  // Ép tắt loading an toàn
  setTimeout(() => { 
    const loader = document.getElementById('loading');
    if(loader) loader.style.display = 'none'; 
  }, 600);
};