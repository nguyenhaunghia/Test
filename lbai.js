// =========================================================================
// KHỞI TẠO BIẾN TOÀN CỤC (CHỐNG XUNG ĐỘT)
// =========================================================================
const urlParams = new URLSearchParams(window.location.search);
const urlMon = urlParams.get('mon') || 'Chung';
const urlTestID = urlParams.get('maDe') || '';

if (typeof window.questions === 'undefined') {
  window.questions = [];
}
var daNop = false;
var THOI_GIAN_LAM_BAI = Infinity;
var timeLeft = Infinity;
var timerId = null;
var deLoaded = false;
var dangLamBai = false;
var REAL_SUBJECT_ID = ''; 
var thoiDiemBatDau = 0; // Lưu thời điểm bắt đầu để tính giờ chuẩn xác

// =========================================================================
// 1. KHỞI TẠO & KIỂM TRA ĐĂNG NHẬP
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  if (!requireLogin()) return; // Hàm này nằm trong script.js

  // Hiển thị thông tin User lên Header
  document.getElementById('dispTen').textContent = currentUser.FullName || '...';
  document.getElementById('dispID').textContent = currentUser.UserID || '...';
  document.getElementById('dispMon').textContent = urlMon;
  document.getElementById('dispMaDe').textContent = urlTestID || "Đang tải...";
  const avatarEl = document.getElementById('userAvatar');
  if(avatarEl) avatarEl.src = currentUser.Avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.UserID}`;

  if (!urlTestID) {
    showToast("Lỗi: Không tìm thấy Mã Đề (TestID)", "error");
    document.getElementById('loading').style.display = 'none';
    return;
  }

  loadData();
});

// =========================================================================
// 2. TẢI ĐỀ & XỬ LÝ XÁO TRỘN THEO TYPEID (DÙNG CHUNG LOGIC ONTAP)
// =========================================================================
async function loadData() {
  try {
    const res = await callAPI('getTestDetails', { TestID: urlTestID });
    
    if (!res.success || !res.data || !res.data.questions) {
        throw new Error("Dữ liệu đề thi trống hoặc lỗi.");
    }

    const rawQuestions = res.data.questions;

    // XỬ LÝ LOGIC ĐÁP ÁN VÀ XÁO TRỘN
    window.questions = rawQuestions.map(q => {
        const typeID = q.TypeID;
        let correctTexts = []; 
        
        // Bắt logic TypeID y như trang Ôn Tập
        if (typeID === 'Typ_0001' || typeID === 'Typ_0006') {
            if (q.options[0]) correctTexts.push(q.options[0]); 
        } else if (typeID === 'Typ_0002' || typeID === 'Typ_0007') {
            if (q.options[0]) correctTexts.push(q.options[0]); 
            if (q.options[1]) correctTexts.push(q.options[1]); 
        } else if (typeID === 'Typ_0003' || typeID === 'Typ_0008') {
            if (q.options[0]) correctTexts.push(q.options[0]); 
            if (q.options[1]) correctTexts.push(q.options[1]); 
            if (q.options[2]) correctTexts.push(q.options[2]); 
        } else if (typeID === 'Typ_0004' || typeID === 'Typ_0009') {
            if (q.options[0]) correctTexts.push(q.options[0]); 
            if (q.options[1]) correctTexts.push(q.options[1]); 
            if (q.options[2]) correctTexts.push(q.options[2]); 
            if (q.options[3]) correctTexts.push(q.options[3]); 
        } else {
            if (q.options[0]) correctTexts.push(q.options[0]); 
        }

        let validOptions = q.options.filter(opt => opt !== null && opt !== undefined && opt.trim() !== "");

        return {
          ...q,
          answer: correctTexts, // Lưu mảng chữ chuẩn xác để Shared Engine chấm
          options: typeof shuffleArrayShared === 'function' ? shuffleArrayShared([...validOptions]) : validOptions,
          loaiCauHoi: q.loaiCauHoi || '01 câu đúng'
        };
    });

    // Xáo trộn thứ tự các câu hỏi
    if (typeof shuffleArrayShared === 'function') {
        window.questions = shuffleArrayShared(window.questions);
    }
    
    THOI_GIAN_LAM_BAI = res.data.thoiLuong * 60;
    timeLeft = THOI_GIAN_LAM_BAI;
    
    // Lấy SubjectID chuẩn từ DB để LƯU KẾT QUẢ
    REAL_SUBJECT_ID = res.data.testInfo.SubjectID || urlMon;
    
    document.getElementById('dispMon').textContent = res.data.testInfo.SubjectName || REAL_SUBJECT_ID;
    document.getElementById('dispMaDe').textContent = res.data.testInfo.TestTopics || res.data.testInfo.TestID;

    const timerContainer = document.getElementById('timer');
    if (timerContainer) {
        timerContainer.style.display = THOI_GIAN_LAM_BAI <= 0 ? 'none' : 'flex';
    }

    deLoaded = true;
    const btnStart = document.getElementById('btnStart');
    btnStart.disabled = false;
    btnStart.innerHTML = '<i class="fas fa-play"></i> BẮT ĐẦU LÀM BÀI!';
    document.getElementById('loading').style.display = 'none';
    showToast('Đã tải và xáo trộn đề thi thành công', 'success');
    
  } catch (err) {
    showToast("Không thể tải cấu trúc đề thi: " + err.message, "error");
    const btnStart = document.getElementById('btnStart');
    btnStart.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Lỗi tải đề';
    document.getElementById('loading').style.display = 'none';
  }
}

// =========================================================================
// 3. CẬP NHẬT TIẾN ĐỘ & BẢNG CÂU HỎI (QUESTION PALETTE)
// =========================================================================
function updateProgressUI() {
  if (typeof isQuestionAnsweredShared !== 'function') return;
  
  let answeredCount = 0;
  window.questions.forEach((q, i) => {
      const isAnswered = isQuestionAnsweredShared(q, 'quiz', i);
      const palBtn = document.getElementById(`pal-btn-${i}`);
      
      if (isAnswered) {
          answeredCount++;
          if (palBtn) palBtn.classList.add('answered'); // Đổi màu xanh lá
      } else {
          if (palBtn) palBtn.classList.remove('answered');
      }
  });

  const progressEl = document.getElementById('progress');
  if(progressEl) progressEl.style.width = (answeredCount / window.questions.length) * 100 + '%';
  document.getElementById('submit').disabled = answeredCount < window.questions.length;
}

function buildQuestionPalette() {
  const grid = document.getElementById('paletteGrid');
  const fabBtn = document.getElementById('fabPaletteBtn');
  if (!grid || !fabBtn) return;
  
  grid.innerHTML = ''; 
  fabBtn.style.display = 'flex'; // Hiện nút nổi lên
  
  window.questions.forEach((q, i) => {
      const btn = document.createElement('button');
      btn.className = 'palette-btn';
      btn.id = `pal-btn-${i}`;
      btn.innerText = i + 1;
      
      btn.onclick = () => {
          document.getElementById('paletteModal').style.display = 'none'; 
          const qDivs = document.querySelectorAll('.question');
          if(qDivs[i]) {
              qDivs[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
              qDivs[i].style.transition = 'box-shadow 0.3s';
              qDivs[i].style.boxShadow = '0 0 0 4px rgba(0, 181, 226, 0.5)';
              setTimeout(() => qDivs[i].style.boxShadow = '', 1500);
          }
      };
      grid.appendChild(btn);
  });
}

// =========================================================================
// 4. BẮT ĐẦU & ĐẾM NGƯỢC
// =========================================================================
document.getElementById('btnStart').addEventListener('click', () => {
  if (!deLoaded || window.questions.length === 0) return;
  
  thoiDiemBatDau = Date.now(); // Chốt giờ
  
  document.getElementById('btnStart').style.display = 'none';
  document.getElementById('submit').style.display = 'flex';
  document.getElementById('submit').disabled = true;
  
  // GỌI ENGINE DÙNG CHUNG ĐỂ VẼ GIAO DIỆN
  renderQuizShared(window.questions, 'quiz', 'updateProgressUI');
  buildQuestionPalette();
  
  if (THOI_GIAN_LAM_BAI > 0 && typeof formatTimeShared === 'function') {
    document.getElementById('timeDisplay').textContent = formatTimeShared(timeLeft);
    startTimer();
  }
  dangLamBai = true;
});

function startTimer() {
  timerId = setInterval(() => {
    timeLeft--;
    const timerDisplay = document.getElementById('timeDisplay');
    const timerContainer = document.getElementById('timer');
    
    if(typeof formatTimeShared === 'function' && timerDisplay) {
        timerDisplay.textContent = formatTimeShared(timeLeft);
    }
    if (timeLeft <= 300 && timerContainer) timerContainer.classList.add('warning');
    if (timeLeft <= 0) {
      clearInterval(timerId);
      if(timerDisplay) timerDisplay.textContent = "00:00";
      if(timerContainer) timerContainer.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Hết giờ!';
      if (!daNop) document.getElementById('submit').click(); // ÉP NỘP BÀI
    }
  }, 1000);
}

// =========================================================================
// 5. NỘP BÀI, CHẤM ĐIỂM & LƯU SERVER (BẢO TOÀN BỘ LOGIC SERVER GỐC)
// =========================================================================
document.getElementById('submit').addEventListener('click', async function() {
  const submitBtn = document.getElementById('submit');
  if (daNop || submitBtn.disabled) return;
  
  daNop = true;
  dangLamBai = false;
  clearInterval(timerId);
  submitBtn.style.display = 'none';
  
  // Ẩn Bảng câu hỏi đi
  const fabBtn = document.getElementById('fabPaletteBtn');
  if(fabBtn) fabBtn.style.display = 'none';

  let thoiGianDaSuDungGiay = Math.floor((Date.now() - thoiDiemBatDau) / 1000);
  if (thoiGianDaSuDungGiay <= 0) thoiGianDaSuDungGiay = 1;

  // GỌI ENGINE DÙNG CHUNG ĐỂ CHẤM ĐIỂM VÀ IN HTML
  const result = calculateAndRenderResultsShared(window.questions, 'quiz', 'msg', currentUser.FullName);
  
  // Thêm nút Quay lại nhiệm vụ đặc thù của lbai
  document.getElementById('msg').innerHTML += `
    <div style="text-align:center; margin-top:20px;">
        <a href="javascript:chuyenTrang('hsinh')" class="btn-ranking" style="max-width:350px; display:inline-flex; align-items:center; gap:8px;">
            <i class="fas fa-undo-alt"></i> Về trang nhiệm vụ
        </a>
    </div>`;

  // === BẢO TOÀN LỆNH LƯU ĐIỂM VÀ LOG ===
  try {
    const saveRes = await callAPI('saveTestResult', {
      SubjectID: REAL_SUBJECT_ID,
      UserID: currentUser.UserID,
      Correct: result.score,
      Total: result.totalContents,
      TestID: urlTestID, 
      Duration: thoiGianDaSuDungGiay
    }, false); 
    
    if (saveRes && saveRes.success) {
       console.log("Đã lưu kết quả thành công vào sheet: " + (saveRes.sheetName || REAL_SUBJECT_ID));
       
       try {
           const deviceInfo = navigator.userAgent.substring(0, 150);
           callAPI('ghiLogHeThong', {
               PC_Name: deviceInfo,
               UserID: currentUser.UserID,
               Event: 'SUBMIT_TN',
               Note: urlTestID
           }, true);
       } catch(logErr) {}
    }
  } catch (e) { 
    console.error("Lỗi khi ghi kết quả vào sheet", e); 
    showToast("Lỗi khi ghi điểm lên hệ thống!", "error");
  }
});