// ==================== LOGIC TRANG HỌC SINH ====================
const $ = s => document.querySelector(s);
let uploadTask = { TestID: '', mon: '' };

function toggleLoading(show, text = "Đang tải dữ liệu...") {
    const el = $('#loading');
    if (!el) return;
    if (show) { 
        $('#loadingText').innerText = text; 
        el.style.display = 'flex'; 
        el.style.opacity = '1'; 
    } else { 
        el.style.opacity = '0'; 
        setTimeout(() => el.style.display = 'none', 300); 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if(!requireLogin()) return; 
    
    const classDisp = $('#classDisplay');
    if(classDisp) classDisp.innerText = `Lớp: ${currentUser.ClassID || 'Chưa xếp lớp'}`;
    
    loadNhiemVu();
});

const formatDateFull = (isoStr) => {
    if (!isoStr) return '...'; 
    const d = new Date(isoStr);
    if(isNaN(d.getTime())) return isoStr; 
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
};

// --- XỬ LÝ NỘP BÀI TỰ LUẬN ---
function kichHoatUpload(testID, mon) {
   uploadTask.TestID = testID;
   uploadTask.mon = mon;
   const fileInput = document.getElementById('uploadInput');
   fileInput.value = ''; 
   fileInput.click();
}

async function xuLyFileDaChon() {
   const input = document.getElementById('uploadInput');
   if (input.files.length === 0) return;
   const file = input.files[0];
   if (file.size > 10 * 1024 * 1024) return showToast('File quá lớn (>10MB).', 'error');

   toggleLoading(true, "Đang nộp bài... Vui lòng đợi!");

   const d = new Date();
   const dateStr = `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;
   const ext = file.name.split('.').pop();
   const finalName = `${currentUser.UserID}_${uploadTask.TestID}_${dateStr}.${ext}`;

   const reader = new FileReader();
   reader.onload = async function(e) {
      const content = e.target.result.split(',')[1];
      try {
          const res = await callAPI('uploadBaiTuLuan', {
              fileContent: content,
              mimeType: file.type,
              fileName: finalName,
              UserID: currentUser.UserID,
              TestID: uploadTask.TestID,
              Subject: uploadTask.mon
          });
          toggleLoading(false);
          if(res && res.success) {
             showToast('Nộp bài thành công!', 'success');
             setTimeout(() => loadNhiemVu(), 1500); 
          } else {
             showToast(res.error || 'Lỗi nộp bài', 'error');
          }
      } catch(err) {
          toggleLoading(false);
          showToast('Mất kết nối với máy chủ!', 'error');
      }
   };
   reader.readAsDataURL(file);
}

// --- TẢI DANH SÁCH NHIỆM VỤ ---
async function loadNhiemVu() {
  const container = $('#taskList');
  if(container && container.innerHTML === '') toggleLoading(true);

  try {
      const res = await callAPI('getNhiemVuHocSinh', { UserID: currentUser.UserID, ClassID: currentUser.ClassID });
      toggleLoading(false);
      
      const tasks = res.data || [];
      if(!container) return;
      container.innerHTML = '';
      
      const noTaskEl = $('#noTask');
      if(noTaskEl) noTaskEl.style.display = tasks.length ? 'none' : 'block';

      const now = new Date();

      tasks.forEach(t => {
        const testID = t.TestID || t.TopicID || t.Code || t.maDe || 'NO_CODE';
        const begin = t.Begin || t.ngayBatDau;
        const end = t.End || t.ngayKetThuc;
        const countReq = parseInt(t.Count || t.soLuot || 0);
        const avgReq = parseFloat(t.AverageScore || t.diemTB || 0);
        const maxReq = parseFloat(t.MaxScore || t.diemCao || 0);
        const mon = t.Subject || t.mon || 'Chung';
        
        // Đã cập nhật: Lấy TestTopics được Backend gửi qua làm Tiêu đề
        const topic = t.TestTopics || t.Topic || t.chuDe || 'Nhiệm vụ học tập';
        const note = t.Note || t.ghiChu || 'Không có yêu cầu cụ thể.';
        
        const isTL = String(testID).trim().toUpperCase().startsWith('TL');
        const historyTitle = isTL ? 'Lịch sử nộp bài' : 'Lịch sử làm bài';

        const dStart = begin ? new Date(begin) : null;
        const dEnd = end ? new Date(end) : null;
        let statusColor = 'text-gray-300', btnDisabled = false;
        let btnText = isTL ? 'Nộp bài' : 'Làm bài ngay';
        let btnIcon = isTL ? 'fa-file-upload' : 'fa-play';
        
        if (dStart && now < dStart) { 
            statusColor = 'text-red-400 font-bold'; btnDisabled = true; btnText = 'Chưa mở'; btnIcon = 'fa-clock'; 
        } else if (dEnd && now > dEnd) { 
            statusColor = 'text-red-500 font-bold'; btnDisabled = true; btnText = 'Đã hết hạn'; btnIcon = 'fa-lock'; 
        } else { 
            if (dEnd && (dEnd - now) < 86400000) statusColor = 'text-yellow-400 font-bold animate-pulse'; 
            else statusColor = 'text-emerald-400 font-bold'; 
        }

        let btnAction = '';
        if (!btnDisabled) {
            if (isTL) btnAction = `onclick="kichHoatUpload('${testID}', '${mon}')"`;
            else btnAction = `onclick="window.open('lbai.html?mon=${encodeURIComponent(mon)}&maDe=${encodeURIComponent(testID)}', '_self')"`;
        }

        let middleContent = '';
        if (isTL) {
            middleContent = `
              <div class="flex-1 bg-indigo-900/30 border border-indigo-400/20 rounded-xl p-4 mb-5 relative overflow-hidden group">
                <div class="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition"><i class="fas fa-quote-right text-4xl text-white"></i></div>
                <h4 class="text-xs font-bold text-indigo-300 uppercase mb-2 flex items-center"><i class="fas fa-exclamation-circle mr-2"></i> Yêu cầu làm bài</h4>
                <div class="text-sm text-gray-200 leading-relaxed max-h-[130px] overflow-y-auto custom-scroll pr-2 whitespace-pre-wrap">${note}</div>
              </div>`;
        } else {
            middleContent = `
                <div class="text-sm bg-white/5 border-l-4 border-indigo-500 p-3 rounded-r mb-5 text-gray-200">
                  Yêu cầu cần đạt: <b class="text-white">${countReq}</b> lượt, điểm trung bình <b class="text-white">${avgReq.toFixed(2)}</b>, lớn nhất <b class="text-white">${maxReq.toFixed(2)}</b>.
                </div>
                <div class="space-y-4 mb-4">
                   <div class="flex items-center gap-3 text-sm"><span class="w-24 text-gray-400 text-xs uppercase font-semibold">Lượt làm</span><div class="progress-bar h-2.5 flex-1"><div class="progress-fill luot" id="fill-luot-${testID}"></div></div><span class="w-16 text-right font-mono font-bold" id="luot-${testID}">0/${countReq}</span></div>
                   <div class="flex items-center gap-3 text-sm"><span class="w-24 text-gray-400 text-xs uppercase font-semibold">Điểm TB</span><div class="progress-bar h-2.5 flex-1"><div class="progress-fill tb" id="fill-tb-${testID}"></div></div><span class="w-16 text-right font-mono font-bold" id="tb-${testID}">0/${avgReq.toFixed(2)}</span></div>
                   <div class="flex items-center gap-3 text-sm"><span class="w-24 text-gray-400 text-xs uppercase font-semibold">Điểm Cao</span><div class="progress-bar h-2.5 flex-1"><div class="progress-fill cao" id="fill-cao-${testID}"></div></div><span class="w-16 text-right font-mono font-bold" id="cao-${testID}">0/${maxReq.toFixed(2)}</span></div>
                </div>`;
        }

        const col1 = isTL ? 'Thời điểm nộp' : 'Thời gian';
        const col2 = isTL ? 'Tên File' : 'TGian';
        const col3 = isTL ? 'Xem File' : 'Tỉ lệ';
        const col4Header = isTL ? '' : `<th class="p-3 text-center font-semibold">Điểm</th>`;

        const card = document.createElement('div');
        card.className = 'card-glass p-6 rounded-2xl mb-6 shadow-lg border border-white/20 relative overflow-hidden';
        card.innerHTML = `
          <div class="flex flex-col lg:flex-row gap-6">
            <div class="lg:w-[60%] flex flex-col justify-between">
              <div>
                <h3 class="text-2xl font-bold text-white mb-2 uppercase tracking-wide leading-tight">${topic}</h3>
                <div class="text-xs text-indigo-200 font-mono mb-3 flex items-center gap-2">
                  <span class="bg-indigo-600 px-2 py-1 rounded text-white">${testID}</span>
                  <span class="bg-white/10 px-2 py-1 rounded">${mon}</span>
                </div>
                <div class="text-sm ${statusColor} mb-4 flex items-center gap-2">
                    <i class="far fa-calendar-alt"></i> ${formatDateFull(begin)} - ${formatDateFull(end)}
                </div>
                ${middleContent}
              </div>
              <button id="btn-${testID}" class="btn-play w-full py-3 text-base shadow-lg ${btnDisabled ? 'bg-gray-600' : 'incomplete'}" ${btnDisabled ? 'disabled' : ''} ${btnAction}>
                <i class="fas ${btnIcon}"></i> ${btnText}
              </button>
            </div>
            
            <div class="lg:w-[40%] border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6 flex flex-col">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="text-xs font-bold text-gray-400 uppercase flex items-center"><i class="fas fa-history mr-1"></i> ${historyTitle}</h4>
                    <span class="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300">Mới nhất</span>
                </div>
                <div class="flex-1 min-h-[200px] bg-black/20 rounded-xl relative overflow-hidden flex flex-col">
                  <div class="loading-hist absolute inset-0 flex items-center justify-center z-10 bg-black/20 backdrop-blur-[1px]"><i class="fas fa-spinner fa-spin text-white/50 text-2xl"></i></div>
                  <div class="overflow-y-auto custom-scroll flex-1">
                    <table class="w-full text-xs text-left hidden border-collapse">
                      <thead class="bg-white/5 text-indigo-200 sticky top-0 backdrop-blur-md z-0 shadow-sm">
                        <tr><th class="p-3 font-semibold">${col1}</th><th class="p-3 text-center font-semibold">${col2}</th><th class="p-3 text-center font-semibold">${col3}</th>${col4Header}</tr>
                      </thead>
                      <tbody class="text-gray-300 divide-y divide-white/5" id="hist-body-${testID}"></tbody>
                    </table>
                  </div>
                  <div class="empty-hist hidden flex-1 flex flex-col items-center justify-center text-gray-500 gap-2"><i class="far fa-folder-open text-2xl opacity-50"></i><span class="text-xs">Chưa có dữ liệu</span></div>
               </div>
            </div>
          </div>`;
        container.appendChild(card);

        callAPI('getLichSuLamBai', { TestID: testID, UserID: currentUser.UserID }, true).then(histRes => {
           const cardRoot = $(`#btn-${testID}`).closest('.card-glass');
           cardRoot.querySelector('.loading-hist').style.display = 'none';
           
           const histData = histRes.data || [];
           if(histData.length === 0) {
             cardRoot.querySelector('.empty-hist').classList.remove('hidden');
           } else {
             cardRoot.querySelector('table').classList.remove('hidden');
             const tbody = cardRoot.querySelector(`#hist-body-${testID}`);
             
             let sum10 = 0, max10 = 0;
             histData.forEach(r => {
               let timeStr = formatDateFull(r.TimeUpdate || r.timestamp);
               let htmlRow = '';
               
               if (isTL) {
                   let fileName = r.FileName || r.tenFile || 'File';
                   if (fileName.length > 18) fileName = fileName.substring(0, 15) + '...';
                   const linkHtml = `<a href="${r.FileLink || r.linkFile}" target="_blank" class="text-indigo-400 hover:text-white underline font-bold"><i class="fas fa-eye"></i> Xem</a>`;
                   htmlRow = `<tr class="hover:bg-white/5 transition-colors"><td class="p-3 border-r border-white/5 font-mono text-white font-medium whitespace-nowrap">${timeStr}</td><td class="p-3 text-center border-r border-white/5 text-gray-300 text-[10px]" title="${fileName}">${fileName}</td><td class="p-3 text-center">${linkHtml}</td></tr>`;
               } else {
                   const score = parseFloat(r.Score || r.diem || 0);
                   const total = parseFloat(r.Total || r.tong || 1);
                   const qd = total > 0 ? ((score/total)*10) : 0;
                   sum10 += qd; max10 = Math.max(max10, qd);
                   
                   let durDisplay = '--';
                   const duration = parseInt(r.Duration || r.thoiluong || 0);
                   if (duration > 0) { const m = Math.floor(duration/60), s = duration%60; durDisplay = `${m<10?'0'+m:m}:${s<10?'0'+s:s}`; }
                   
                   htmlRow = `<tr class="hover:bg-white/5 transition-colors"><td class="p-3 border-r border-white/5 font-mono text-white font-medium whitespace-nowrap">${timeStr}</td><td class="p-3 text-center border-r border-white/5 text-indigo-200 font-mono">${durDisplay}</td><td class="p-3 text-center border-r border-white/5 font-mono">${score}/${total}</td><td class="p-3 text-center font-bold text-emerald-400 font-mono text-sm">${qd.toFixed(1)}</td></tr>`;
               }
               tbody.innerHTML += htmlRow;
             });

             if (!isTL) {
                 const luot = histData.length, tb = luot > 0 ? (sum10/luot) : 0;
                 if(countReq > 0) { $(`#luot-${testID}`).innerText = `${luot}/${countReq}`; $(`#fill-luot-${testID}`).style.width = Math.min(100, (luot/countReq)*100) + '%'; }
                 if(avgReq > 0) { $(`#tb-${testID}`).innerText = `${tb.toFixed(2)}/${avgReq.toFixed(2)}`; $(`#fill-tb-${testID}`).style.width = Math.min(100, (tb/avgReq)*100) + '%'; }
                 if(maxReq > 0) { $(`#cao-${testID}`).innerText = `${max10.toFixed(2)}/${maxReq.toFixed(2)}`; $(`#fill-cao-${testID}`).style.width = Math.min(100, (max10/maxReq)*100) + '%'; }
                 
                 if (!btnDisabled && countReq > 0 && luot >= countReq && tb >= avgReq && max10 >= maxReq) {
                      const btn = $(`#btn-${testID}`);
                      btn.className = 'btn-play w-full py-3 text-base shadow-lg complete';
                      btn.innerHTML = '<i class="fas fa-check-circle"></i> Đã hoàn thành';
                      btn.onclick = null;
                 }
             } else {
                 if (!btnDisabled && histData.length > 0) {
                    const btn = $(`#btn-${testID}`);
                    btn.className = 'btn-play w-full py-3 text-base shadow-lg bg-blue-600 text-white hover:bg-blue-700';
                    btn.innerHTML = '<i class="fas fa-file-upload"></i> Nộp thêm bài'; 
                 }
             }
           }
        }).catch(() => {
           const cardRoot = $(`#btn-${testID}`).closest('.card-glass');
           cardRoot.querySelector('.loading-hist').style.display = 'none';
           cardRoot.querySelector('.empty-hist').classList.remove('hidden');
        });
      });
  } catch (err) {
      toggleLoading(false);
      showToast('Không thể tải nhiệm vụ, vui lòng thử lại', 'error');
  }
}