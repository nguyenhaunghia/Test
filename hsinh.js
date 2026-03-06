// ==================== LOGIC TRANG HỌC SINH ====================
const $ = s => document.querySelector(s);
let uploadTask = { TestID: '', mon: '', subjectID: '' };

function toggleLoading(show, text = "Đang tải...") {
    const el = $('#loading');
    if (!el) return;
    if (show) { 
        $('#loadingText').innerText = text; 
        el.style.display = 'flex'; el.style.opacity = '1'; 
    } else { 
        el.style.opacity = '0'; setTimeout(() => el.style.display = 'none', 300); 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if(!requireLogin()) return; 
    
    const classDisp = $('#classDisplay');
    if(classDisp) classDisp.innerText = `Lớp: ${currentUser.ClassID || '---'}`;
    
    loadNhiemVu();
});

const formatDateFull = (isoStr) => {
    if (!isoStr) return '...'; 
    const d = new Date(isoStr);
    if(isNaN(d.getTime())) return isoStr; 
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth()+1)}`;
};

function kichHoatUpload(testID, subjectID, mon) {
   uploadTask.TestID = testID;
   uploadTask.subjectID = subjectID;
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

   toggleLoading(true, "Đang nộp...");

   const d = new Date();
   const dateStr = `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;
   const timeStr = `${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
   const ext = file.name.split('.').pop();
   const finalName = `${currentUser.UserID}_${uploadTask.TestID}_${dateStr}_${timeStr}.${ext}`;

   const reader = new FileReader();
   reader.onload = async function(e) {
      const content = e.target.result.split(',')[1];
      try {
          const res = await callAPI('uploadBaiTuLuan', {
              fileContent: content, mimeType: file.type, fileName: finalName,
              UserID: currentUser.UserID, TestID: uploadTask.TestID, SubjectID: uploadTask.subjectID
          });
          toggleLoading(false);
          
          if(res && res.success) {
             try {
                 const deviceInfo = navigator.userAgent.substring(0, 150);
                 callAPI('ghiLogHeThong', {
                     PC_Name: deviceInfo,
                     UserID: currentUser.UserID,
                     Event: 'SUBMIT_TL',
                     Note: uploadTask.TestID 
                 }, true); 
             } catch(logErr) { console.error("Lỗi ghi log TL:", logErr); }

             showToast('Nộp bài thành công!', 'success');
             setTimeout(() => loadNhiemVu(), 1000); 
          } else {
             showToast(res.error || 'Lỗi nộp bài', 'error');
          }
      } catch(err) { toggleLoading(false); showToast('Mất kết nối!', 'error'); }
   };
   reader.readAsDataURL(file);
}

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
        const subjectID = t.SubjectID || 'KetQuaChung'; 
        const begin = t.Begin || t.ngayBatDau;
        const end = t.End || t.ngayKetThuc;
        const countReq = parseInt(t.Count || t.soLuot || 0);
        const avgReq = parseFloat(t.AverageScore || t.diemTB || 0);
        const maxReq = parseFloat(t.MaxScore || t.diemCao || 0);
        const topic = t.TestTopics || t.Topic || t.chuDe || 'Nhiệm vụ học tập';
        const mon = t.SubjectName || t.Subject || t.mon || subjectID;
        const note = t.TestNote || t.Note || t.ghiChu || 'Chưa có yêu cầu cụ thể.';
        
        const isTL = String(testID).trim().toUpperCase().startsWith('TL');

        const dStart = begin ? new Date(begin) : null;
        const dEnd = end ? new Date(end) : null;
        const isNotStarted = (dStart && now < dStart);
        const isExpired = (dEnd && now > dEnd);
        
        let statusColor = 'text-slate-500';
        if (isNotStarted) statusColor = 'text-slate-400';
        else if (isExpired) statusColor = 'text-red-500 font-bold';
        else if (dEnd && (dEnd - now) < 86400000) statusColor = 'text-orange-500 animate-pulse font-bold'; 
        else statusColor = 'text-emerald-600 font-bold'; 

        let initBtnDisabled = false;
        let initBtnText = '';
        let initBtnIcon = '';
        let initBtnClass = 'w-full py-3 px-3 text-[12px] md:text-sm leading-snug text-center font-bold shadow-md rounded-xl flex items-center justify-center gap-2 transition-all mt-4 ';
        let initOnClick = '';

        if (isNotStarted) {
            initBtnDisabled = true;
            initBtnText = 'Chưa mở';
            initBtnIcon = 'fa-lock';
            initBtnClass += 'bg-slate-200 text-slate-500 cursor-not-allowed';
        } else if (isExpired) {
            initBtnDisabled = true;
            initBtnText = 'Không hoàn thành nhiệm vụ học tập';
            initBtnIcon = 'fa-times-circle';
            initBtnClass += 'bg-red-500 text-white cursor-not-allowed opacity-90';
        } else {
            initBtnDisabled = false;
            initBtnText = isTL ? 'Tiếp tục hoàn thành nhiệm vụ học tập' : 'Tiếp tục hoàn thành nhiệm vụ học tập';
            initBtnIcon = isTL ? 'fa-file-upload' : 'fa-play';
            initBtnClass += 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white hover:shadow-lg hover:-translate-y-0.5';
            initOnClick = isTL ? `onclick="kichHoatUpload('${testID}', '${subjectID}', '${mon}')"` : `onclick="window.open('lbai.html?mon=${encodeURIComponent(subjectID)}&maDe=${encodeURIComponent(testID)}', '_self')"`;
        }

        const col1 = isTL ? 'Ngày nộp' : 'Thời gian';
        const col2 = isTL ? 'Tên File' : 'TGian';
        const col3 = isTL ? 'Xem' : 'Đúng';
        const col4Header = isTL ? '' : `<th class="py-2 px-2 text-center font-semibold">Điểm</th>`;

        // ==================== CÁC KHỐI GIAO DIỆN DÙNG CHUNG ====================
        const metaInfoHTML = `
            <div class="flex flex-col gap-2.5 mb-5">
              <div class="flex flex-wrap items-center gap-2">
                <span class="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-md border border-indigo-200 font-bold text-xs font-mono tracking-tight shadow-sm">${testID}</span>
                <span class="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md border border-blue-200 font-bold text-xs shadow-sm">${mon}</span>
              </div>
              <div class="${statusColor} text-[13px] md:text-sm flex items-center gap-1.5">
                <i class="far fa-clock text-base"></i>
                <span>${formatDateFull(begin)} - ${formatDateFull(end)}</span>
              </div>
            </div>
        `;

        const btnHTML = `
            <div class="mt-auto pt-2">
              <button id="btn-${testID}" class="${initBtnClass}" ${initBtnDisabled ? 'disabled' : ''} ${initOnClick}>
                <i class="fas ${initBtnIcon}"></i> ${initBtnText}
              </button>
            </div>
        `;

        const historyBoxHTML = `
            <div class="flex-1 bg-white/70 rounded-xl relative overflow-hidden border border-slate-200 shadow-inner flex flex-col min-h-[160px]">
              <div class="loading-hist absolute inset-0 flex items-center justify-center z-20 bg-white/60 backdrop-blur-[1px]"><i class="fas fa-spinner fa-spin text-indigo-400 text-2xl"></i></div>
              <div class="absolute inset-0 overflow-x-auto overflow-y-auto custom-scroll">
                <table class="w-full text-xs text-left hidden border-collapse min-w-[240px]">
                  <thead class="bg-slate-100/90 text-slate-600 sticky top-0 backdrop-blur-md z-10 shadow-sm">
                    <tr>
                        <th class="py-2 px-2 font-semibold whitespace-nowrap">${col1}</th>
                        <th class="py-2 px-2 text-center font-semibold">${col2}</th>
                        <th class="py-2 px-2 text-center font-semibold">${col3}</th>
                        ${col4Header}
                    </tr>
                  </thead>
                  <tbody class="text-slate-700 divide-y divide-slate-100" id="hist-body-${testID}"></tbody>
                </table>
              </div>
              <div class="empty-hist hidden absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2"><i class="far fa-folder-open text-3xl opacity-30"></i><span class="text-xs">Chưa có dữ liệu</span></div>
           </div>
        `;

        let leftColumnHTML = '';
        let rightColumnHTML = '';

        if (isTL) {
            // --- NẾU LÀ TỰ LUẬN: Đảo Lịch sử sang trái, Yêu cầu sang phải ---
            const yeuCauHTML = `
              <div class="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-5 relative overflow-hidden group flex flex-col h-full">
                <div class="absolute top-0 right-0 p-3 opacity-5"><i class="fas fa-quote-right text-5xl text-indigo-900"></i></div>
                <h4 class="text-sm font-bold text-indigo-600 uppercase mb-3 flex items-center"><i class="fas fa-exclamation-circle mr-2"></i> Yêu cầu làm bài</h4>
                <div class="text-sm text-slate-700 leading-relaxed overflow-y-auto custom-scroll pr-2 whitespace-pre-wrap flex-1 text-justify">${note}</div>
              </div>`;

            leftColumnHTML = `
              <div class="lg:w-[55%] flex flex-col h-full">
                ${metaInfoHTML}
                <div class="flex-1 flex flex-col relative mb-2">
                   ${historyBoxHTML}
                </div>
                ${btnHTML}
              </div>`;
              
            rightColumnHTML = `
              <div class="lg:w-[45%] border-t lg:border-t-0 lg:border-l border-slate-200 pt-5 lg:pt-0 lg:pl-6 flex flex-col h-full min-h-[160px]">
                ${yeuCauHTML}
              </div>`;
        } else {
            // --- NẾU LÀ TRẮC NGHIỆM: Giữ nguyên bố cục cũ ---
            const progressHTML = `
                <div class="space-y-3.5 mt-2 flex-1">
                   <div class="flex items-center gap-3 text-xs"><span class="w-16 text-slate-500 font-bold">Lượt làm</span><div class="progress-bar h-1.5 flex-1 bg-slate-200/60 rounded-full"><div class="progress-fill luot rounded-full" id="fill-luot-${testID}"></div></div><span class="w-10 text-right font-mono font-bold text-slate-700" id="luot-${testID}">0/${countReq}</span></div>
                   <div class="flex items-center gap-3 text-xs"><span class="w-16 text-slate-500 font-bold">Điểm TB</span><div class="progress-bar h-1.5 flex-1 bg-slate-200/60 rounded-full"><div class="progress-fill tb rounded-full" id="fill-tb-${testID}"></div></div><span class="w-10 text-right font-mono font-bold text-slate-700" id="tb-${testID}">0/${avgReq.toFixed(1)}</span></div>
                   <div class="flex items-center gap-3 text-xs"><span class="w-16 text-slate-500 font-bold">Điểm Cao</span><div class="progress-bar h-1.5 flex-1 bg-slate-200/60 rounded-full"><div class="progress-fill cao rounded-full" id="fill-cao-${testID}"></div></div><span class="w-10 text-right font-mono font-bold text-slate-700" id="cao-${testID}">0/${maxReq.toFixed(1)}</span></div>
                </div>`;

            leftColumnHTML = `
              <div class="lg:w-[55%] flex flex-col justify-between h-full">
                <div>
                  ${metaInfoHTML}
                  ${progressHTML}
                </div>
                ${btnHTML}
              </div>`;
              
            rightColumnHTML = `
              <div class="lg:w-[45%] border-t lg:border-t-0 lg:border-l border-slate-200 pt-5 lg:pt-0 lg:pl-6 flex flex-col h-full min-h-[160px]">
                ${historyBoxHTML}
              </div>`;
        }

        const card = document.createElement('div');
        card.className = 'card-glass px-5 md:px-6 pb-5 md:pb-6 pt-2 md:pt-3 rounded-2xl relative overflow-hidden flex flex-col h-full';
        
        card.innerHTML = `
          <div class="w-full mb-2 border-b border-slate-200/60 pb-1">
             <h3 class="text-center text-xl md:text-2xl font-bold text-indigo-950 uppercase tracking-wide leading-tight">${topic}</h3>
          </div>
          <div class="flex flex-col lg:flex-row gap-6 flex-1 h-full mt-2">
            ${leftColumnHTML}
            ${rightColumnHTML}
          </div>`;
        container.appendChild(card);

        // ==================== LOAD LỊCH SỬ TỪ SERVER ====================
        callAPI('getLichSuLamBai', { TestID: testID, UserID: currentUser.UserID, SubjectID: subjectID }, true).then(histRes => {
           const cardRoot = $(`#btn-${testID}`).closest('.card-glass');
           cardRoot.querySelector('.loading-hist').style.display = 'none';
           
           const histData = histRes.data || [];
           if(histData.length === 0) {
             cardRoot.querySelector('.empty-hist').classList.remove('hidden');
           } else {
             cardRoot.querySelector('table').classList.remove('hidden');
             const tbody = cardRoot.querySelector(`#hist-body-${testID}`);
             
             let sum10 = 0, max10 = 0;
             histData.slice().reverse().forEach(r => {
               let timeStr = formatDateFull(r.TimeUpdate);
               let htmlRow = '';
               
               if (isTL) {
                   let fileLink = r.File_TL || '#';
                   const linkHtml = `<a href="${fileLink}" target="_blank" class="text-indigo-600 hover:text-indigo-800 font-bold"><i class="fas fa-external-link-alt"></i></a>`;
                   htmlRow = `<tr class="hover:bg-slate-50 transition-colors"><td class="py-1.5 px-2 border-r border-slate-100 font-mono text-slate-600 whitespace-nowrap">${timeStr}</td><td class="py-1.5 px-2 text-center border-r border-slate-100 text-slate-500">Bài Nộp</td><td class="py-1.5 px-2 text-center">${linkHtml}</td></tr>`;
               } else {
                   const correct = parseFloat(r.Correct || 0);
                   const total = parseFloat(r.Total || 1);
                   const qd = total > 0 ? ((correct/total)*10) : 0;
                   sum10 += qd; max10 = Math.max(max10, qd);
                   
                   let durDisplay = '--';
                   const duration = parseInt(r.Duration || 0);
                   if (duration > 0) { const m = Math.floor(duration/60), s = duration%60; durDisplay = `${m<10?'0'+m:m}:${s<10?'0'+s:s}`; }
                   
                   htmlRow = `<tr class="hover:bg-slate-50 transition-colors"><td class="py-1.5 px-2 border-r border-slate-100 font-mono text-slate-600 whitespace-nowrap">${timeStr}</td><td class="py-1.5 px-2 text-center border-r border-slate-100 text-slate-500 font-mono">${durDisplay}</td><td class="py-1.5 px-2 text-center border-r border-slate-100 font-mono text-indigo-600 font-bold">${correct}/${total}</td><td class="py-1.5 px-2 text-center font-bold text-emerald-600 font-mono text-sm">${qd.toFixed(1)}</td></tr>`;
               }
               tbody.innerHTML += htmlRow;
             });

             let isAchieved = false;
             if (isTL) {
                 isAchieved = histData.length > 0;
             } else {
                 const luot = histData.length, tb = luot > 0 ? (sum10/luot) : 0;
                 if(countReq > 0) { $(`#luot-${testID}`).innerText = `${luot}/${countReq}`; $(`#fill-luot-${testID}`).style.width = Math.min(100, (luot/countReq)*100) + '%'; }
                 if(avgReq > 0) { $(`#tb-${testID}`).innerText = `${tb.toFixed(1)}/${avgReq.toFixed(1)}`; $(`#fill-tb-${testID}`).style.width = Math.min(100, (tb/avgReq)*100) + '%'; }
                 if(maxReq > 0) { $(`#cao-${testID}`).innerText = `${max10.toFixed(1)}/${maxReq.toFixed(1)}`; $(`#fill-cao-${testID}`).style.width = Math.min(100, (max10/maxReq)*100) + '%'; }
                 
                 isAchieved = (countReq > 0 && luot >= countReq && tb >= avgReq && max10 >= maxReq);
             }

             const btn = $(`#btn-${testID}`);
             if (btn && !isNotStarted) {
                 const baseClass = 'w-full py-3 px-3 text-[12px] md:text-sm leading-snug text-center font-bold shadow-md rounded-xl flex items-center justify-center gap-2 mt-4 ';
                 
                 if (isExpired) {
                     if (isAchieved) {
                         btn.className = baseClass + 'bg-emerald-600 text-white cursor-not-allowed opacity-90';
                         btn.innerHTML = '<i class="fas fa-check-circle"></i> Nhiệm vụ đã hoàn thành';
                         btn.onclick = null;
                         btn.disabled = true;
                     }
                 } else {
                     if (isAchieved) {
                         if (isTL) {
                             btn.className = baseClass + 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transition-all cursor-pointer';
                             btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Nộp bản cập nhật';
                             btn.disabled = false;
                         } else {
                             btn.className = baseClass + 'bg-emerald-500 text-white cursor-not-allowed';
                             btn.innerHTML = '<i class="fas fa-crown text-yellow-300"></i> Hoàn thành tốt nhiệm vụ học tập';
                             btn.onclick = null;
                             btn.disabled = true;
                         }
                     }
                 }
             }
           }
        }).catch((e) => {
           const cardRoot = $(`#btn-${testID}`).closest('.card-glass');
           cardRoot.querySelector('.loading-hist').style.display = 'none';
           cardRoot.querySelector('.empty-hist').classList.remove('hidden');
        });
      });
  } catch (err) {
      toggleLoading(false);
      showToast('Không thể tải nhiệm vụ, thử lại sau', 'error');
  }
}