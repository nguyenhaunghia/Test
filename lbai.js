// ==================== LOGIC LÀM BÀI TRỰC TUYẾN ====================
// 1. Phân tích URL Params để lấy thông tin Đề
const urlParams = new URLSearchParams(window.location.search);
const urlMon = urlParams.get('mon') || 'Chung';
const urlTestID = urlParams.get('maDe') || '';

let questions = [], daNop = false;
const submitBtn = document.getElementById('submit');
const btnStart = document.getElementById('btnStart');
const timerDisplay = document.getElementById('timeDisplay');
const timerContainer = document.getElementById('timer');

let THOI_GIAN_LAM_BAI = Infinity;
let timeLeft = THOI_GIAN_LAM_BAI;
let timerId = null;
let deLoaded = false;
let dangLamBai = false;
let REAL_SUBJECT_ID = ''; 

// THÊM BIẾN LƯU THỜI ĐIỂM BẮT ĐẦU ĐỂ TÍNH GIỜ CHUẨN XÁC
let thoiDiemBatDau = 0;

// --- HÀM XÁO TRỘN NGẪU NHIÊN (SHUFFLE MẢNG) ---
function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!requireLogin()) return;

  // Hiển thị thông tin User
  document.getElementById('dispTen').textContent = currentUser.FullName || '...';
  document.getElementById('dispID').textContent = currentUser.UserID || '...';
  document.getElementById('dispMon').textContent = urlMon;
  document.getElementById('dispMaDe').textContent = urlTestID || "Đang tải...";
  document.getElementById('userAvatar').src = currentUser.Avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.UserID}`;

  if (!urlTestID) {
    showToast("Lỗi: Không tìm thấy Mã Đề (TestID)", "error");
    document.getElementById('loading').style.display = 'none';
    return;
  }

  loadData();
});

async function loadData() {
  try {
    const res = await callAPI('getTestDetails', { TestID: urlTestID });
    
    questions = res.data.questions;
    
    // --- XÁO TRỘN THỨ TỰ CÁC CÂU HỎI ---
    if (questions && questions.length > 0) {
        shuffleArray(questions);
    }
    
    THOI_GIAN_LAM_BAI = res.data.thoiLuong * 60;
    timeLeft = THOI_GIAN_LAM_BAI;
    
    // Lấy SubjectID chuẩn từ DB để LƯU KẾT QUẢ
    REAL_SUBJECT_ID = res.data.testInfo.SubjectID || urlMon;
    
    document.getElementById('dispMon').textContent = res.data.testInfo.SubjectName || REAL_SUBJECT_ID;
    document.getElementById('dispMaDe').textContent = res.data.testInfo.TestTopics || res.data.testInfo.TestID;

    if (THOI_GIAN_LAM_BAI <= 0) {
      timerContainer.style.display = 'none';
    } else {
      timerContainer.style.display = 'flex';
    }

    deLoaded = true;
    btnStart.disabled = false;
    btnStart.innerHTML = '<i class="fas fa-play"></i> BẮT ĐẦU LÀM BÀI!';
    document.getElementById('loading').style.display = 'none';
    
  } catch (err) {
    showToast("Không thể tải cấu trúc đề thi", "error");
    btnStart.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Lỗi tải đề';
    document.getElementById('loading').style.display = 'none';
  }
}

btnStart.addEventListener('click', () => {
  if (!deLoaded || questions.length === 0) return;
  
  thoiDiemBatDau = Date.now();
  
  btnStart.style.display = 'none';
  submitBtn.style.display = 'flex';
  submitBtn.disabled = true;
  renderQuiz();
  if (THOI_GIAN_LAM_BAI > 0) {
    timerDisplay.textContent = formatTime(timeLeft);
    startTimer();
  }
  dangLamBai = true;
});

function getSelectedAnswers(index) {
  const questionDiv = document.querySelectorAll('.question')[index];
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

function isQuestionAnswered(q, i) {
  const selected = getSelectedAnswers(i);
  if (q.loaiCauHoi.includes('đúng - sai')) {
    return Object.keys(selected).length === q.options.length;
  } else {
    return (selected.normal || []).length > 0;
  }
}

function updateProgress() {
  const answeredCount = questions.filter((q, i) => isQuestionAnswered(q, i)).length;
  const percentage = (answeredCount / questions.length) * 100;
  document.getElementById('progress').style.width = percentage + '%';
  submitBtn.disabled = answeredCount < questions.length;
}

function applyLayoutBasedOnImage(questionDiv, hasImage, imgElement) {
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
  imgElement.onerror = () => {
    if (imgElement.parentElement) imgElement.parentElement.style.display = 'none';
  };
}

function renderQuiz() {
  const c = document.getElementById('quiz');
  c.innerHTML = '';
  questions.forEach((q, i) => {
    const d = document.createElement('div');
    d.className = 'question';

    const hasImage = !!q.hinhanh;
    let imageHTML = '';
    if (hasImage) {
      imageHTML = `<div class="question-image-wrapper">
        <img src="https://drive.google.com/thumbnail?id=${q.hinhanh}&sz=1000" class="question-image" loading="lazy">
      </div>`;
    }

    const isTrueFalse = q.loaiCauHoi.includes('đúng - sai');
    const isSingle = !isTrueFalse && q.loaiCauHoi === '01 câu đúng';

    let contentHTML = `
      <div class="question-header">
        <div class="question-number">${i+1}</div>
        <div class="question-text">${q.question}</div>
      </div>
      ${imageHTML}
      <div class="answer-container">`;

    if (isTrueFalse) {
      const groupName = `tf-group-${i}`;
      q.options.forEach((opt, optIdx) => {
        contentHTML += `
          <div class="answer-item">
            <div class="answer-options tf-options">
              <label class="answer-label"><input type="radio" name="${groupName}-${optIdx}" value="${optIdx}|Đúng" onchange="updateProgress()"> Đúng</label>
              <label class="answer-label"><input type="radio" name="${groupName}-${optIdx}" value="${optIdx}|Sai" onchange="updateProgress()"> Sai</label>
            </div>
            <div class="answer-content">${opt}</div>
          </div>`;
      });
    } else {
      let displayOptions = [...q.options];
      shuffleArray(displayOptions);
      
      const nameAttr = isSingle ? `name="q${i}"` : '';
      const inputType = isSingle ? 'radio' : 'checkbox';
      displayOptions.forEach((opt) => {
        contentHTML += `
          <div class="answer-item" onclick="this.querySelector('input').click()">
            <div class="answer-options">
              <label class="answer-label"><input type="${inputType}" ${nameAttr} value="${opt}" onchange="updateProgress()"></label>
            </div>
            <div class="answer-content">${opt}</div>
          </div>`;
      });
    }

    contentHTML += `</div>`;
    d.innerHTML = contentHTML;

    if (hasImage) {
      const imgEl = d.querySelector('.question-image');
      applyLayoutBasedOnImage(d, hasImage, imgEl);
    }

    const items = d.querySelectorAll('.answer-item');
    items.forEach(item => {
      const inputs = item.querySelectorAll('input');
      inputs.forEach(input => {
        input.addEventListener('change', () => {
          if (isTrueFalse) {
            const hasChecked = Array.from(item.querySelectorAll('input')).some(r => r.checked);
            item.classList.toggle('selected', hasChecked);
          } else if (isSingle) {
            items.forEach(sib => sib.classList.remove('selected'));
            if (input.checked) item.classList.add('selected');
          } else {
            item.classList.toggle('selected', input.checked);
          }
        });
      });
    });

    c.appendChild(d);
  });
  updateProgress();
  renderLaTeX();
}

submitBtn.addEventListener('click', async function() {
  if (daNop || submitBtn.disabled) return;
  daNop = true;
  dangLamBai = false;
  clearInterval(timerId);
  submitBtn.style.display = 'none';

  let thoiGianDaSuDungGiay = Math.floor((Date.now() - thoiDiemBatDau) / 1000);
  if (thoiGianDaSuDungGiay <= 0) thoiGianDaSuDungGiay = 1;

  let score = 0;
  let totalContents = 0;
  const answers = [];

  questions.forEach((q, i) => {
    const selected = getSelectedAnswers(i);
    let correctCountThisQuestion = 0;
    let questionTotal = 0;
    
    const isTrueFalse = q.loaiCauHoi.toLowerCase().includes('đúng - sai');
    let rawAnswers = String(q.answer).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    
    let resolvedExpectedTF = [];
    let resolvedCorrectTexts = [];

    if (isTrueFalse) {
      const letters = ['A','B','C','D'];
      
      if (rawAnswers.length >= 4 && rawAnswers.every(x => x.startsWith('Đ') || x.startsWith('S') || x === 'T' || x === 'F')) {
         resolvedExpectedTF = rawAnswers.map(x => (x.startsWith('Đ') || x === 'T') ? 'Đúng' : 'Sai');
      } else {
         q.options.forEach((opt, idx) => {
            const isTrue = rawAnswers.includes(letters[idx]) || rawAnswers.includes(opt.toUpperCase());
            resolvedExpectedTF.push(isTrue ? 'Đúng' : 'Sai');
         });
      }

      q.options.forEach((opt, optIdx) => {
        const expectedChoice = resolvedExpectedTF[optIdx] || 'Sai';
        const userChoice = selected[optIdx] || null;
        if (userChoice === expectedChoice) correctCountThisQuestion++;
      });
      questionTotal = q.options.length;

    } else {
      const letters = ['A','B','C','D'];
      
      rawAnswers.forEach(ans => {
         if (letters.includes(ans) && q.options[letters.indexOf(ans)]) {
             resolvedCorrectTexts.push(q.options[letters.indexOf(ans)]);
         } else {
             resolvedCorrectTexts.push(ans);
         }
      });

      const userSelected = (selected.normal || []);
      const numCorrectNeeded = resolvedCorrectTexts.length;
      let numCorrectChosen = 0;
      let numWrongChosen = 0;

      userSelected.forEach(uAns => {
         if (resolvedCorrectTexts.includes(uAns)) numCorrectChosen++;
         else numWrongChosen++;
      });

      if (numCorrectNeeded > 0 && numCorrectChosen === numCorrectNeeded && numWrongChosen === 0) {
         correctCountThisQuestion = 1;
      }
      questionTotal = 1;
    }

    score += correctCountThisQuestion;
    totalContents += questionTotal;

    answers.push({
      question: q.question, selected: selected,
      rawAnswers: rawAnswers, resolvedExpectedTF: resolvedExpectedTF, resolvedCorrectTexts: resolvedCorrectTexts,
      explanation: q.explanation, hinhanh: q.hinhanh,
      isTrueFalse: isTrueFalse, point: correctCountThisQuestion, totalThisQ: questionTotal
    });
  });

  const percentage = totalContents > 0 ? Math.round((score / totalContents) * 100) : 0;

  // --- RENDER KẾT QUẢ ĐÃ ĐƯỢC CHUẨN HÓA (ĐƯA CÂU TRẢ LỜI LÊN CÙNG DÒNG) ---
  const container = document.getElementById('quiz');
  container.innerHTML = '';
  answers.forEach((a, i) => {
    const q = questions[i]; 
    const div = document.createElement('div');
    div.className = `result-item ${a.point === a.totalThisQ ? 'correct' : 'wrong'}`;

    let imageHTML = a.hinhanh ? `<div class="question-image-wrapper"><img src="https://drive.google.com/thumbnail?id=${a.hinhanh}&sz=1000" class="question-image" loading="lazy"></div>` : '';
    let explanationHTML = a.explanation ? `<div class="explanation-box mt-4 text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200 text-justify"><strong>Giải thích:</strong> ${a.explanation}</div>` : '';

    let resultHTML = '';
    if (a.isTrueFalse) {
      resultHTML = '<div class="result-multi-answer mt-3 space-y-2">';
      q.options.forEach((opt, optIdx) => {
        const expected = a.resolvedExpectedTF[optIdx];
        const user = a.selected[optIdx] || 'Chưa chọn';
        resultHTML += `<div class="text-sm text-justify"><strong>${opt}</strong><br>Bạn chọn: <span class="${user === expected ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}">${user}</span> | Đáp án chính xác: <span class="text-green-600 font-bold">${expected}</span></div>`;
      });
      resultHTML += '</div>';
    } else {
      const userSelectedContents = (a.selected.normal || []);
      // Chuyển mảng kết quả thành chuỗi nối bằng dấu chấm phẩy, không dùng thẻ div bọc riêng biệt nữa
      const userAnsText = userSelectedContents.length > 0 ? userSelectedContents.join('; ') : '<em>Chưa chọn</em>';
      const correctAnsText = a.resolvedCorrectTexts.join('; ');
      
      resultHTML = `
        <div class="mt-4 text-[14.5px] space-y-2">
           <div class="text-justify"><span class="text-slate-500 font-bold mr-1">Bạn chọn:</span> <span class="${a.point === 0 ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}">${userAnsText}</span></div>
           <div class="text-justify"><span class="text-slate-500 font-bold mr-1">Đáp án chính xác:</span> <span class="text-green-600 font-semibold">${correctAnsText}</span></div>
        </div>`;
    }

    div.innerHTML = `<div class="question-header"><div class="question-number">${i+1}</div><div class="question-text">${q.question}</div></div>${imageHTML}${resultHTML}${explanationHTML}`;
    container.appendChild(div);
  });
  renderLaTeX();

  document.getElementById('msg').innerHTML = `
    <div class="final-result">
      <h2>Chúc mừng <strong>${currentUser.FullName}</strong>!</h2>
      <div class="score">${score}<small>/${totalContents}</small></div>
      <p class="accuracy">Độ chính xác: <strong>${percentage}%</strong></p>
      <a href="javascript:chuyenTrang('3_HSinh')" class="back-to-profile"><i class="fas fa-undo-alt"></i> Về trang nhiệm vụ học tập</a>
    </div>`;

  try {
    const saveRes = await callAPI('saveTestResult', {
      SubjectID: REAL_SUBJECT_ID,
      UserID: currentUser.UserID,
      Correct: score,
      Total: totalContents,
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
  }
});

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function startTimer() {
  timerId = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = formatTime(timeLeft);
    if (timeLeft <= 300) timerContainer.classList.add('warning');
    if (timeLeft <= 0) {
      clearInterval(timerId);
      timerDisplay.textContent = "00:00";
      timerContainer.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Hết giờ!';
      if (!daNop) submitBtn.click();
    }
  }, 1000);
}

function renderLaTeX() {
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(document.body, { delimiters: [{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}], throwOnError: false });
  }
}