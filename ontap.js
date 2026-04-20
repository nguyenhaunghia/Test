// =========================================================================
// KHỞI TẠO BIẾN TOÀN CỤC (TUÂN THỦ NGUYÊN TẮC "DÙNG CHUNG - KHÔNG LẶP LẠI")
// =========================================================================
if (typeof window.questions === 'undefined') {
  window.questions = [];
}
var daNop = false;
var THOI_GIAN_LAM_BAI = Infinity; 
var MA_DE_ID = ''; 
var timeLeft = Infinity; 
var timerId = null; 
var deLoaded = false;

// =========================================================================
// 1. TẢI DỮ LIỆU BAN ĐẦU (MÔN - KHỐI - CHỦ ĐỀ)
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const loadingOverlay = document.getElementById('loading');
  if(loadingOverlay) loadingOverlay.style.display = 'flex';

  const safetySwitch = setTimeout(() => { if(loadingOverlay) loadingOverlay.style.display = 'none'; }, 8000);

  if (typeof callAPI !== 'function') {
      showToast('Lỗi: Hàm callAPI chưa sẵn sàng. Hãy kiểm tra script.js', 'error'); // Đã gọi showToast dùng chung
      if(loadingOverlay) loadingOverlay.style.display = 'none';
      return;
  }

  callAPI('getMonFromMaDe', {})
    .then(res => {
      clearTimeout(safetySwitch);
      if(loadingOverlay) loadingOverlay.style.display = 'none';
      if (res && res.success) {
        const sel = document.getElementById('mon');
        if(sel) {
          sel.innerHTML = '<option value="" disabled selected>Chọn môn</option>';
          res.data.forEach(item => {
              let val = typeof item === 'object' ? item.value : item;
              let txt = typeof item === 'object' ? item.text : item;
              sel.appendChild(new Option(txt, val));
          });
          sel.disabled = false;
        }
      }
    })
    .catch(() => { if(loadingOverlay) loadingOverlay.style.display = 'none'; });
});

function loadKhoi() {
  deLoaded = false; updateStartButton();
  const mon = document.getElementById('mon').value;
  const selKhoi = document.getElementById('khoi');
  if(!selKhoi) return;
  selKhoi.innerHTML = '<option value="" disabled selected>Đang tải...</option>';
  selKhoi.disabled = true;
  callAPI('getKhoiFromMaDe', { mon: mon }).then(res => {
      if(res.success) {
        selKhoi.innerHTML = '<option value="" disabled selected>Chọn khối</option>';
        res.data.forEach(item => selKhoi.appendChild(new Option(typeof item === 'object' ? item.text : item, typeof item === 'object' ? item.value : item)));
        selKhoi.disabled = false;
      }
  });
}

function loadChuDe() {
  deLoaded = false; updateStartButton();
  const mon = document.getElementById('mon').value; 
  const khoi = document.getElementById('khoi').value;
  const selChuDe = document.getElementById('chude');
  if(!selChuDe) return;
  selChuDe.innerHTML = '<option value="" disabled selected>Đang tải...</option>';
  selChuDe.disabled = true;
  callAPI('getChuDeFromMaDe', { mon: mon, khoi: khoi }).then(res => {
      if(res.success) {
        selChuDe.innerHTML = '<option value="" disabled selected>Chọn chủ đề</option>';
        res.data.forEach(item => selChuDe.appendChild(new Option(typeof item === 'object' ? item.text : item, typeof item === 'object' ? item.value : item)));
        selChuDe.disabled = false;
      }
  });
}

// =========================================================================
// 2. TẢI ĐỀ VÀ XỬ LÝ XÁO TRỘN + LOGIC ĐÁP ÁN THEO TYPEID
// =========================================================================
function loadDeInfo() {
  const mon = document.getElementById('mon').value; 
  const khoi = document.getElementById('khoi').value; 
  const chude = document.getElementById('chude').value;
  const quizDiv = document.getElementById('quiz');
  const btnStart = document.getElementById('btnStart');
  
  if (!mon || !khoi || !chude) return;

  if (typeof shuffleArrayShared !== 'function') {
      showToast('Lỗi: Chưa có hàm xáo trộn shuffleArrayShared trong script.js!', 'error'); // Đã gọi showToast dùng chung
      return;
  }
  
  if(quizDiv) quizDiv.innerHTML = '';
  btnStart.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang chuẩn bị đề...'; 
  btnStart.disabled = true;

  callAPI('getMaDeDetailsForOnTap', { mon: mon, khoi: khoi, chude: chude })
    .then(res => {
      if(!res.success || !res.data || !res.data.questions) {
         if (quizDiv) quizDiv.innerHTML = `<div style="text-align:center;color:#fb7185;padding:40px;font-weight:bold;">${res.error || 'Lỗi tải đề.'}</div>`;
         deLoaded = false; updateStartButton(); return;
      }
      
      const rawQuestions = res.data.questions;

      window.questions = rawQuestions.map(q => {
        const typeID = q.TypeID;
        let correctTexts = []; 
        
        if (typeID === 'Typ_0001' || typeID === 'Typ_0006') {
            if (q.options[0]) correctTexts.push(q.options[0]); 
        } 
        else if (typeID === 'Typ_0002' || typeID === 'Typ_0007') {
            if (q.options[0]) correctTexts.push(q.options[0]); 
            if (q.options[1]) correctTexts.push(q.options[1]); 
        } 
        else if (typeID === 'Typ_0003' || typeID === 'Typ_0008') {
            if (q.options[0]) correctTexts.push(q.options[0]); 
            if (q.options[1]) correctTexts.push(q.options[1]); 
            if (q.options[2]) correctTexts.push(q.options[2]); 
        } 
        else if (typeID === 'Typ_0004' || typeID === 'Typ_0009') {
            if (q.options[0]) correctTexts.push(q.options[0]); 
            if (q.options[1]) correctTexts.push(q.options[1]); 
            if (q.options[2]) correctTexts.push(q.options[2]); 
            if (q.options[3]) correctTexts.push(q.options[3]); 
        } 
        else {
            if (q.options[0]) correctTexts.push(q.options[0]); 
        }

        let validOptions = q.options.filter(opt => opt !== null && opt !== undefined && opt.trim() !== "");

        return {
          ...q,
          answer: correctTexts, 
          options: shuffleArrayShared([...validOptions]), 
          loaiCauHoi: q.loaiCauHoi || '01 câu đúng'
        };
      });

      window.questions = shuffleArrayShared(window.questions);

      MA_DE_ID = res.data.maDeID || `${mon}_${khoi}`; 
      THOI_GIAN_LAM_BAI = (res.data.thoiLuong || 0) * 60; 
      timeLeft = THOI_GIAN_LAM_BAI; 
      deLoaded = true;
      updateStartButton();
      showToast('Đã xáo trộn câu hỏi và đáp án thành công!', 'success'); // Đã gọi showToast dùng chung
    })
    .catch(err => {
      deLoaded = false; updateStartButton();
      showToast('Lỗi tải đề: ' + err.message, 'error'); // Đã gọi showToast dùng chung
    });
}

function updateStartButton() {
  const btnStart = document.getElementById('btnStart');
  btnStart.disabled = !deLoaded;
  btnStart.innerHTML = deLoaded ? '<i class="fas fa-play"></i> BẮT ĐẦU ÔN TẬP' : 'Vui lòng chọn mục để bắt đầu';
}

// =========================================================================
// CẬP NHẬT TIẾN ĐỘ + ĐỔI MÀU BẢNG CÂU HỎI
// =========================================================================
function updateProgressUI() {
  if (typeof isQuestionAnsweredShared !== 'function') return;
  
  let answeredCount = 0;
  window.questions.forEach((q, i) => {
      const isAnswered = isQuestionAnsweredShared(q, 'quiz', i);
      const palBtn = document.getElementById(`pal-btn-${i}`);
      
      if (isAnswered) {
          answeredCount++;
          if (palBtn) palBtn.classList.add('answered'); // Tô màu xanh lá khi đã trả lời
      } else {
          if (palBtn) palBtn.classList.remove('answered');
      }
  });

  const progressEl = document.getElementById('progress');
  if(progressEl) progressEl.style.width = (answeredCount / window.questions.length) * 100 + '%';
  document.getElementById('submit').disabled = answeredCount !== window.questions.length;
}

// =========================================================================
// XÂY DỰNG MODAL BẢNG DANH SÁCH CÂU HỎI
// =========================================================================
function buildQuestionPalette() {
  const grid = document.getElementById('paletteGrid');
  const fabBtn = document.getElementById('fabPaletteBtn');
  if (!grid || !fabBtn) return;
  
  grid.innerHTML = ''; 
  fabBtn.style.display = 'flex'; // Hiện nút nổi
  
  window.questions.forEach((q, i) => {
      const btn = document.createElement('button');
      btn.className = 'palette-btn';
      btn.id = `pal-btn-${i}`;
      btn.innerText = i + 1;
      
      btn.onclick = () => {
          document.getElementById('paletteModal').style.display = 'none'; // Tắt Modal
          const qDivs = document.querySelectorAll('.question');
          if(qDivs[i]) {
              qDivs[i].scrollIntoView({ behavior: 'smooth', block: 'center' }); // Trượt tới câu
              qDivs[i].style.transition = 'box-shadow 0.3s';
              qDivs[i].style.boxShadow = '0 0 0 4px rgba(0, 181, 226, 0.5)';
              setTimeout(() => qDivs[i].style.boxShadow = '', 1500);
          }
      };
      grid.appendChild(btn);
  });
}

// =========================================================================
// 3. ĐIỀU KHIỂN LÀM BÀI VÀ NỘP BÀI
// =========================================================================
document.getElementById('btnStart').addEventListener('click', () => {
  if (!deLoaded) return;
  document.querySelector('#selectSection').style.opacity = '0.3';
  document.querySelector('#selectSection').style.pointerEvents = 'none';
  document.getElementById('btnStart').style.display = 'none'; 
  document.getElementById('submit').style.display = 'flex'; 
  
  if(THOI_GIAN_LAM_BAI > 0) { 
      document.getElementById('timer').style.display = 'flex'; 
      startTimer(); 
  }
  
  renderQuizShared(window.questions, 'quiz', 'updateProgressUI'); 
  
  // GỌI HÀM VẼ BẢNG CÂU HỎI
  buildQuestionPalette(); 
});

document.getElementById('submit').addEventListener('click', function() {
  if (daNop) return;
  daNop = true; clearInterval(timerId); 
  this.style.display = 'none';
  
  // Ẩn nút nổi Bảng câu hỏi sau khi nộp
  const fabBtn = document.getElementById('fabPaletteBtn');
  if(fabBtn) fabBtn.style.display = 'none';
  
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
  const tenHS = currentUser.FullName || currentUser.hoten || "Khách vãng lai";
  
  // Chấm bài bằng Quiz Engine
  const result = calculateAndRenderResultsShared(window.questions, 'quiz', 'msg', tenHS);
  
  document.getElementById('msg').innerHTML += `
    <div class="flex gap-4 mt-6">
        <button onclick="location.reload()" class="flex-1 p-4 bg-[#00b5e2] text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all">LÀM ĐỀ KHÁC</button>
        <button onclick="chuyenTrang('7_XHang')" class="flex-1 p-4 bg-[#f59e0b] text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all">XẾP HẠNG</button>
    </div>`;

  let thoiGianDaSuDungGiay = THOI_GIAN_LAM_BAI > 0 ? (THOI_GIAN_LAM_BAI - (timeLeft > 0 ? timeLeft : 0)) : 0;
  
  callAPI('saveAndGetRankingHTML', {
      tenHS: tenHS, score: result.score, totalContents: result.totalContents,
      mon: document.getElementById('mon').value, MA_DE_ID: MA_DE_ID, 
      thoiGianDaSuDungGiay: thoiGianDaSuDungGiay
  });
});

function startTimer() {
  timerId = setInterval(() => {
    timeLeft--; 
    if(typeof formatTimeShared === 'function') document.getElementById('timeDisplay').textContent = formatTimeShared(timeLeft);
    if (timeLeft <= 300) document.getElementById('timer').classList.add('warning');
    if (timeLeft <= 0) { 
        clearInterval(timerId); 
        document.getElementById('timeDisplay').textContent = " 00:00"; 
        if (!daNop) document.getElementById('submit').click(); 
    }
  }, 1000);
}


// =========================================================================
// 4. CHỐNG GIAN LẬN (ANTI-CHEAT): NGĂN RỜI TRANG / CHUYỂN TAB (Dành cho Ôn tập)
// =========================================================================

// Hàm kiểm tra trạng thái đang làm bài: Nút nộp bài đang hiện và chưa nộp bài
function checkDangLamBaiOntap() {
    const submitBtn = document.getElementById('submit');
    return submitBtn && submitBtn.style.display === 'flex' && !daNop;
}

// 4.1. Ngăn học sinh vô tình (hoặc cố ý) F5 tải lại trang hoặc đóng tab
window.addEventListener('beforeunload', function (e) {
    if (checkDangLamBaiOntap()) {
        e.preventDefault();
        e.returnValue = ''; // Hiển thị hộp thoại cảnh báo mặc định của trình duyệt
    }
});

// 4.2. Phát hiện hành vi chuyển sang Tab khác hoặc thu nhỏ trình duyệt đi tra Google
document.addEventListener('visibilitychange', function() {
    if (checkDangLamBaiOntap() && document.visibilityState === 'hidden') {
        
        // --- CÁCH 1: Cảnh báo răn đe ---
        alert("CẢNH BÁO: Bạn vừa rời khỏi trang ôn tập! Hành động này đã được ghi nhận.");
        
        // --- CÁCH 2: Xử lý mạnh tay - Buộc nộp bài ngay lập tức ---
        // Nếu muốn tự động thu bài, bạn xóa 2 dấu gạch chéo // ở dòng code bên dưới:
        // document.getElementById('submit').click(); 
    }
});

// 4.3. Phát hiện hành vi mở ứng dụng khác đè lên (Mất focus chuột khỏi trang web)
window.addEventListener('blur', function() {
    if (checkDangLamBaiOntap()) {
        console.warn("Học sinh đang thao tác ngoài phạm vi bài ôn tập.");
        // Nếu muốn, có thể dùng hàm showToast đã có sẵn trong dự án của bạn để nhắc nhở
        // if (typeof showToast === 'function') showToast("Vui lòng tập trung ôn tập!", "warning");
    }
});