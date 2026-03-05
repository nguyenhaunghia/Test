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

  // 1. Lọc thông minh: Tách lấy UserID nếu chuỗi có chứa tên (VD: "HS01 - Nguyễn Văn A" -> "HS01")
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
        currentUser = user; 
        
        if (user.Password === 'A12345678!') {
          setLoginState(false);
          document.getElementById('changePassModal').classList.add('active');
          showToast('Vui lòng đổi mật khẩu bảo mật', 'warning');
        } else {
          localStorage.setItem('currentUser', JSON.stringify(user));
          showToast(`Đăng nhập thành công! Chào ${user.FullName}`, 'success');
          setTimeout(() => {
            chuyenTrang('00_Index'); 
          }, 800);
        }
      } else {
        setLoginState(false);
        showToast(res.error || 'Tài khoản hoặc mật khẩu không đúng!', 'error');
        mkInput.classList.add('shake-element');
        mkInput.value = '';
        mkInput.focus();
      }
  } catch (err) {
      setLoginState(false);
      console.error(err);
      showToast('Lỗi mạng hoặc chưa cấu hình API_URL trong script.js', 'error');
  }
}

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
         localStorage.setItem('currentUser', JSON.stringify(currentUser));
         showToast('Đổi mật khẩu thành công!', 'success');
         document.getElementById('changePassModal').classList.remove('active');
         setTimeout(() => chuyenTrang('00_Index'), 800);
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

// Chạy tải dữ liệu gợi ý khi DOM đã load xong
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await callAPI('getGoiYDangNhap');
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        
        if (res && res.success && res.data) {
            const dl = document.getElementById('taiKhoanList');
            dl.innerHTML = '';
            res.data.forEach(item => {
              const op = document.createElement('option');
              op.value = item; // Sẽ hiển thị dạng "HS01 - Nguyễn Văn A"
              dl.appendChild(op);
            });
        }
    } catch (err) {
        console.error("Lỗi tải gợi ý:", err);
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
});