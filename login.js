// ==================== CẤU HÌNH GOOGLE LOGIN ====================
// Thay bằng Client ID thật của bạn từ Google Cloud Console
const GOOGLE_CLIENT_ID = "926273963500-hcvblj5s6m713enngp3k9gk7otp1l6tq.apps.googleusercontent.com";

// ==================== LOGIC ĐĂNG NHẬP & BẢO MẬT ====================
function handleEnter(e, action) {
  if (e.key === 'Enter') {
    if (action === 'login') dangNhap();
    else if (action === 'changePass') confirmChangePass();
    else {
      const nextInput = document.getElementById(action);
      if (nextInput) nextInput.focus();
    }
  }
}

// --- 1. ĐĂNG NHẬP THỦ CÔNG (UserID/Mật khẩu) ---
async function dangNhap() {
  const tkInput = document.getElementById('taiKhoan');
  const mkInput = document.getElementById('matKhau');
  
  if (!tkInput || !mkInput) {
      console.error("LỖI: Không tìm thấy ô nhập liệu trong HTML. Kiểm tra lại ID!");
      return;
  }

  tkInput.classList.remove('shake-element');
  mkInput.classList.remove('shake-element');

  let tk = tkInput.value.trim();
  const mk = mkInput.value.trim();

  if (tk.includes(' - ')) {
      tk = tk.split(' - ')[0].trim();
  }

  if (!tk) {
    tkInput.classList.add('shake-element');
    showToast('Vui lòng nhập tài khoản!', 'warning');
    tkInput.focus();
    return;
  }
  if (!mk) {
    mkInput.classList.add('shake-element');
    showToast('Vui lòng nhập mật khẩu!', 'warning');
    mkInput.focus();
    return;
  }

  setLoginState(true);

  try {
      const res = await callAPI('dangNhap', { taiKhoan: tk, matKhau: mk });
      
      if (res && res.success && res.data) {
        const user = res.data;
        await handleLoginSuccess(user, 'LOGIN');
      } else {
        setLoginState(false);
        showToast(res.error || 'Tài khoản hoặc mật khẩu không đúng!', 'error');
        mkInput.classList.add('shake-element');
        mkInput.value = '';
        mkInput.focus();
      }
  } catch (err) {
      setLoginState(false);
      showToast('Lỗi mạng hoặc server quá tải!', 'error');
  }
}

// --- 2. KHỞI TẠO VÀ XỬ LÝ ĐĂNG NHẬP GOOGLE ---
function initGoogleSignIn() {
  if (typeof google === 'undefined') {
    setTimeout(initGoogleSignIn, 100);
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: true
  });

  google.accounts.id.renderButton(
    document.getElementById("googleBtn"),
    { theme: "outline", size: "large", width: 340, text: "signin_with", shape: "pill" }
  );
}

async function handleCredentialResponse(response) {
  setLoginState(true);
  try {
    const res = await callAPI('dangNhapGoogle', { credential: response.credential });

    if (res && res.success && res.data) {
      const user = res.data;
      await handleLoginSuccess(user, 'LOGIN_GOOGLE');
    } else {
      setLoginState(false);
      showToast(res.error || 'Email này chưa được đăng ký trong hệ thống!', 'error');
    }
  } catch (err) {
    setLoginState(false);
    showToast('Lỗi xác thực Google!', 'error');
  }
}

// --- 3. HÀM XỬ LÝ KHI ĐĂNG NHẬP THÀNH CÔNG (DÙNG CHUNG) ---
async function handleLoginSuccess(user, eventType) {
  currentUser = user; 
  
  // Ghi log hệ thống kèm thông tin PC (giống logic cũ của bạn)
  try {
      const thongTinMayTinh = await getTenMayTinh();
      callAPI('ghiLogHeThong', {
          PC_Name: thongTinMayTinh,
          UserID: user.UserID,
          Event: eventType,
          Note: eventType === 'LOGIN_GOOGLE' ? 'Đăng nhập Google' : 'Đăng nhập thành công'
      }, true);
  } catch (e) {
      console.error("Lỗi ghi log:", e);
  }
  
  // Kiểm tra đổi mật khẩu (Chỉ áp dụng cho đăng nhập thủ công bằng Pass mặc định)
  if (eventType === 'LOGIN' && user.Password === 'A12345678!') {
    setLoginState(false);
    document.getElementById('changePassModal').classList.add('active');
    showToast('Vui lòng đổi mật khẩu bảo mật', 'warning');
  } else {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    showToast(`Đăng nhập thành công! Chào ${user.FullName || user.hoten}`, 'success');
    setTimeout(() => { chuyenTrang('index'); }, 800);
  }
}

// --- 4. CÁC HÀM CŨ GIỮ NGUYÊN LOGIC ---

async function confirmChangePass() {
  const newPass = document.getElementById('newPass').value.trim();
  const confirmPass = document.getElementById('confirmPass').value.trim();
  const btn = document.getElementById('confirmBtn');

  if (!newPass || !confirmPass) {
    showToast('Vui lòng nhập đầy đủ mật khẩu mới', 'warning');
    return;
  }
  if (newPass !== confirmPass) {
    showToast('Mật khẩu xác nhận không khớp!', 'error');
    return;
  }
  if (newPass.length < 6) {
      showToast('Mật khẩu quá ngắn (tối thiểu 6 ký tự)', 'error');
      return;
  }

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
  btn.disabled = true;

  try {
      const res = await callAPI('doiMatKhau', { UserID: currentUser.UserID, matKhauMoi: newPass });
      
      if (res && res.success) {
        currentUser.Password = newPass;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
         try {
             const thongTinMayTinh = await getTenMayTinh();
             callAPI('ghiLogHeThong', {
                 PC_Name: thongTinMayTinh,
                 UserID: currentUser.UserID,
                 Event: 'CHANGE_PASS',
                 Note: 'Đổi mật khẩu bảo mật lần đầu'
             }, true);
         } catch(e) {}
         
         showToast('Đổi mật khẩu thành công!', 'success');
         document.getElementById('changePassModal').classList.remove('active');
         setTimeout(() => chuyenTrang('index'), 800);
      } else {
         btn.innerHTML = 'Xác nhận thay đổi';
         btn.disabled = false;
         showToast(res.error || 'Lỗi hệ thống khi lưu mật khẩu!', 'error');
      }
  } catch (err) {
      btn.innerHTML = 'Xác nhận thay đổi';
      btn.disabled = false;
  }
}

function setLoginState(isLoading) {
  const btn = document.getElementById('loginBtn');
  const inputs = document.querySelectorAll('.custom-input');
  const loading = document.getElementById('loading');
  
  if (isLoading) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang kiểm tra...';
    inputs.forEach(i => i.disabled = true);
  } else {
    btn.disabled = false;
    btn.innerHTML = 'Đăng nhập';
    inputs.forEach(i => i.disabled = false);
    if(loading) loading.style.display = 'none';
  }
}

function togglePassword(id, icon) {
  const inp = document.getElementById(id);
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    inp.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load danh sách gợi ý UserID
    try {
        const res = await callAPI('getGoiYDangNhap');
        if (res && res.success && res.data) {
            const dl = document.getElementById('taiKhoanList');
            dl.innerHTML = '';
            res.data.forEach(item => {
              const op = document.createElement('option');
              op.value = item;
              dl.appendChild(op);
            });
        }
    } catch (err) { console.error("Lỗi tải gợi ý:", err); }

    // 2. Ẩn loading
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';

    // 3. Khởi tạo nút đăng nhập Google
    initGoogleSignIn();
});

async function getTenMayTinh() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000); 
        const response = await fetch('http://127.0.0.1:9999', { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
            const data = await response.json();
            return `[${data.pc_name}] MAC: ${data.mac}`;
        }
    } catch (error) { return 'PC_Khong_Xac_Dinh'; }
    return 'PC_Khong_Xac_Dinh';
}