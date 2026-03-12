const $ = s => document.querySelector(s);
let fullList = [];
let currentMaDe = '';
let hocSinhList = [];
const selectedKeys = new Set();

// --- DISPLAY LOGIC ---
function displayMaDeListcu(list) {
  const container = $('#maDeListContent');
  container.innerHTML = '';
  
  list.forEach(item => {
    const isTH = String(item.maDe || '').startsWith('TH');
    const ngayHienThi = item.ngayTao ? new Date(item.ngayTao).toLocaleString('vi-VN', {day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'}) : '--';
    const isEnable = (item.hieuLuc || 'Yes').toLowerCase() === 'yes';
    
    const hieuLucLabel = isEnable ? 'ENABLE' : 'DISABLE';
    const hieuLucClass = isEnable ? 'text-[#10b981] bg-[#d1fae5] border-[#10b981]' : 'text-[#fb7185] bg-[#ffe4e6] border-[#fb7185]';
    
    const tongCau = item.ids ? item.ids.split(',').filter(Boolean).length : 0;
    const soCauDisplay = `${item.soCau || 0}/${tongCau}`;
    const ghiChu = item.ghiChu || item.note || "Chưa có ghi chú cho chủ đề này.";

    const card = document.createElement('div');
    card.className = 'card-glass flex flex-col';
    
    const specsHTML = `
       <div class="flex justify-between items-center mb-2">
          <span class="text-[#00b5e2] font-bold text-[11px] uppercase tracking-wider">Code</span>
          <span class="font-mono text-[#f59e0b] font-black bg-[#fef3c7] border border-[#fde68a] px-2 py-0.5 rounded">${item.maDe}</span>
       </div>
       <div class="flex justify-between items-center mb-2">
          <span class="text-[#00b5e2] font-bold text-[11px] uppercase tracking-wider">Môn - Khối</span>
          <span class="text-[#004c6d] font-bold text-[13px]">${item.mon} - ${item.khoi}</span>
       </div>
       ${!isTH ? `
       <div class="flex justify-between items-center mb-2">
          <span class="text-[#00b5e2] font-bold text-[11px] uppercase tracking-wider">Số câu</span>
          <span class="text-[#004c6d] font-bold text-[13px]">${soCauDisplay}</span>
       </div>
       <div class="flex justify-between items-center mb-2">
          <span class="text-[#00b5e2] font-bold text-[11px] uppercase tracking-wider">Thời lượng</span>
          <span class="text-[#004c6d] font-bold text-[13px]">${item.thoiLuong || 0} phút</span>
       </div>
       ` : ''}
       <div class="mt-auto pt-4">
          <div class="flex justify-between items-end">
             <div>
                <div class="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Cập nhật</div>
                <div class="text-[13px] font-medium text-[#004c6d]">${ngayHienThi}</div>
             </div>
             <span class="text-[10px] font-black px-2 py-1 rounded-md border ${hieuLucClass}">${hieuLucLabel}</span>
          </div>
       </div>
    `;

    card.innerHTML = `
      <div class="mb-4 pb-3 border-b border-[#e0f2fe]">
        <h3 class="text-lg font-black text-[#004c6d] leading-snug" title="${item.chuDe}">${item.chuDe || '(Chưa có tên chủ đề)'}</h3>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
        <div class="flex flex-col text-sm border-r border-[#e0f2fe] pr-3 md:border-r md:border-b-0 border-b md:pb-0 pb-4">
           ${specsHTML}
        </div>
        <div class="flex flex-col h-full pl-1">
           <div class="bg-[#f0f9ff] rounded-xl p-3 mb-4 flex-grow border border-[#e0f2fe]">
             <p class="text-[13px] text-[#334155] text-justify leading-relaxed italic line-clamp-4 hover:line-clamp-none transition-all">
                <i class="fas fa-quote-left text-xs opacity-30 mr-1 text-[#00b5e2]"></i>
                ${ghiChu}
             </p>
           </div>
           <div class="flex gap-3 justify-end mt-auto">
              <button class="btn-action btn-xoa" onclick="handleDelete('${item.maDe}')" title="Xóa đề này">
                <i class="fas fa-trash-alt"></i>
              </button>
              <button class="btn-action btn-giao flex-1 justify-center" onclick="showGiaoModal('${item.maDe}')">
                <i class="fas fa-paper-plane text-[15px]"></i> GIAO BÀI
              </button>
           </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// --- DISPLAY LOGIC ---
function displayMaDeList(list) {
  const container = $('#maDeListContent');
  container.innerHTML = '';
  
  list.forEach(item => {
    const isTH = String(item.maDe || '').startsWith('TH');
    const ngayHienThi = item.ngayTao ? new Date(item.ngayTao).toLocaleString('vi-VN', {day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'}) : '--';
    
    // Kiểm tra trạng thái hiệu lực
    const isEnable = String(item.hieuLuc || 'Yes').trim().toLowerCase() === 'yes';
    const hieuLucLabel = isEnable ? 'ENABLE' : 'DISABLE';
    const hieuLucClass = isEnable ? 'text-[#10b981] bg-[#d1fae5] border-[#10b981]' : 'text-[#fb7185] bg-[#ffe4e6] border-[#fb7185]';
    
    // Logic render nút Giao Bài tùy theo hiệu lực
    const btnGiaoHtml = isEnable 
        ? `<button class="btn-action btn-giao flex-1 justify-center" onclick="showGiaoModal('${item.maDe}')">
             <i class="fas fa-paper-plane text-[15px]"></i> GIAO BÀI
           </button>`
        : `<button class="btn-action flex-1 justify-center bg-[#cbd5e1] text-[#64748b] cursor-not-allowed shadow-none" disabled title="Mã đề này đã hết hiệu lực">
             <i class="fas fa-lock text-[15px]"></i> ĐÃ KHÓA
           </button>`;

    const tongCau = item.ids ? item.ids.split(',').filter(Boolean).length : 0;
    const soCauDisplay = `${item.soCau || 0}/${tongCau}`;
    const ghiChu = item.ghiChu || item.note || "Chưa có ghi chú cho chủ đề này.";

    const card = document.createElement('div');
    card.className = 'card-glass flex flex-col';
    
    const specsHTML = `
       <div class="flex justify-between items-center mb-2">
          <span class="text-[#00b5e2] font-bold text-[11px] uppercase tracking-wider">Code</span>
          <span class="font-mono text-[#f59e0b] font-black bg-[#fef3c7] border border-[#fde68a] px-2 py-0.5 rounded">${item.maDe}</span>
       </div>
       <div class="flex justify-between items-center mb-2">
          <span class="text-[#00b5e2] font-bold text-[11px] uppercase tracking-wider">Môn - Khối</span>
          <span class="text-[#004c6d] font-bold text-[13px]">${item.mon} - ${item.khoi}</span>
       </div>
       ${!isTH ? `
       <div class="flex justify-between items-center mb-2">
          <span class="text-[#00b5e2] font-bold text-[11px] uppercase tracking-wider">Số câu</span>
          <span class="text-[#004c6d] font-bold text-[13px]">${soCauDisplay}</span>
       </div>
       <div class="flex justify-between items-center mb-2">
          <span class="text-[#00b5e2] font-bold text-[11px] uppercase tracking-wider">Thời lượng</span>
          <span class="text-[#004c6d] font-bold text-[13px]">${item.thoiLuong || 0} phút</span>
       </div>
       ` : ''}
       <div class="mt-auto pt-4">
          <div class="flex justify-between items-end">
             <div>
                <div class="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Cập nhật</div>
                <div class="text-[13px] font-medium text-[#004c6d]">${ngayHienThi}</div>
             </div>
             <span class="text-[10px] font-black px-2 py-1 rounded-md border ${hieuLucClass}">${hieuLucLabel}</span>
          </div>
       </div>
    `;

    card.innerHTML = `
      <div class="mb-4 pb-3 border-b border-[#e0f2fe]">
        <h3 class="text-lg font-black text-[#004c6d] leading-snug" title="${item.chuDe}">${item.chuDe || '(Chưa có tên chủ đề)'}</h3>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
        <div class="flex flex-col text-sm border-r border-[#e0f2fe] pr-3 md:border-r md:border-b-0 border-b md:pb-0 pb-4">
           ${specsHTML}
        </div>
        <div class="flex flex-col h-full pl-1">
           <div class="bg-[#f0f9ff] rounded-xl p-3 mb-4 flex-grow border border-[#e0f2fe]">
             <p class="text-[13px] text-[#334155] text-justify leading-relaxed italic line-clamp-4 hover:line-clamp-none transition-all">
                <i class="fas fa-quote-left text-xs opacity-30 mr-1 text-[#00b5e2]"></i>
                ${ghiChu}
             </p>
           </div>
           <div class="flex gap-3 justify-end mt-auto">
              <button class="btn-action btn-xoa" onclick="handleDelete('${item.maDe}')" title="Xóa đề này">
                <i class="fas fa-trash-alt"></i>
              </button>
              ${btnGiaoHtml}
           </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}


// --- APP LOGIC ---
window.onload = () => {
  $('#mainLoading').style.display = 'flex';
  
  // Dùng chuẩn callAPI của hệ thống mới để gọi file Code.gs
  callAPI('getAllMaDeList', {type: 'ALL'})
    .then(res => {
      $('#mainLoading').style.display = 'none';
      if(res.success) {
          fullList = res.data || [];
          displayMaDeList(fullList);
          $('#noResults').style.display = fullList.length === 0 ? 'block' : 'none';
          loadTruongList();
      } else {
          showToast('Lỗi tải danh sách: ' + res.error, 'error');
          $('#noResults').style.display = 'block';
      }
    })
    .catch(err => {
      $('#mainLoading').style.display = 'none';
      $('#noResults').style.display = 'block';
      showToast('Lỗi kết nối máy chủ!', 'error');
    });
};

function filterList() {
  const query = $('#searchInput').value.toLowerCase().trim();
  const filtered = fullList.filter(item => 
    String(item.maDe || '').toLowerCase().includes(query) ||
    String(item.mon || '').toLowerCase().includes(query) ||
    String(item.khoi || '').toLowerCase().includes(query) ||
    String(item.chuDe || '').toLowerCase().includes(query)
  );
  displayMaDeList(filtered);
  $('#noResults').style.display = filtered.length === 0 ? 'block' : 'none';
}

function handleDelete(maDe) {
  if (confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa mã đề [${maDe}]?\nDữ liệu đã giao cho học sinh liên quan đến mã này có thể bị ảnh hưởng.`)) {
    showToast('Đang xử lý xóa...', 'info');
    
    callAPI('deleteMaDe', { maDeId: maDe })
        .then(res => {
            if(res.success) {
                showToast('Đã xóa thành công!', 'success');
                fullList = fullList.filter(i => i.maDe !== maDe);
                filterList();
            } else {
                showToast('Lỗi: ' + res.error, 'error');
            }
        })
        .catch(err => showToast('Lỗi hệ thống!', 'error'));
  }
}

// --- MODAL LOGIC ---
function showGiaoModal(maDe) {
  currentMaDe = maDe;
  const item = fullList.find(i => i.maDe === maDe);
  const isTH = maDe.startsWith('TH');

  $('#modalMaDeTitle').textContent = item ? `CODE: ${maDe} • ${item.mon} • ${item.khoi}` : maDe;
  
  selectedKeys.clear();
  $('#selectAll').checked = false;
  $('#selectedCount').textContent = 'Đã chọn: 0 học sinh';
  
  const settingFields = document.querySelectorAll('.setting-field');
  settingFields.forEach(el => { el.style.display = isTH ? 'none' : 'block'; });

  $('#giaoModal').classList.remove('hidden');
  loadHocSinhList();
}

function hideGiaoModal() {
  $('#giaoModal').classList.add('hidden');
}

function loadTruongList() {
  callAPI('getDistinctDonVi', {})
    .then(res => {
        if(res.success) {
            const sel = $('#filterTruong');
            sel.innerHTML = '<option value="">Tất cả trường</option>';
            res.data.forEach(v => sel.add(new Option(v, v)));
            loadLopList();
        }
    });
}

function loadLopList() {
  const truong = $('#filterTruong').value;
  callAPI('getDistinctLop', { truong: truong })
    .then(res => {
        if(res.success) {
            const sel = $('#filterLop');
            sel.innerHTML = '<option value="">Tất cả lớp</option>';
            res.data.forEach(v => sel.add(new Option(v, v)));
            loadHocSinhList();
        }
    });
}

function loadHocSinhList() {
  const truong = $('#filterTruong').value;
  const lop = $('#filterLop').value;
  const ten = $('#filterTen').value.trim();
  
  const tbody = $('#hocSinhTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-xs font-bold text-[#00b5e2]">Đang tải dữ liệu...</td></tr>';

  callAPI('getHocSinhList', { truong: truong, lop: lop, ten: ten })
    .then(res => {
        if(!res.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-xs text-red-500">${res.error}</td></tr>`;
            return;
        }
        const data = res.data || [];
        hocSinhList = data;
        tbody.innerHTML = '';
        if (data.length === 0) {
          $('#noStudentMsg').style.display = 'block';
          return;
        }
        $('#noStudentMsg').style.display = 'none';
        
        data.forEach(hs => {
          const key = hs.idHS || 'N/A'; 
          const checked = selectedKeys.has(key) ? 'checked' : '';
          
          tbody.innerHTML += `
            <tr class="hover:bg-[#f0f9ff] transition group cursor-pointer" onclick="const cb = this.querySelector('input'); cb.checked = !cb.checked; updateSelected(cb);">
              <td class="p-3 border-b border-[#e0f2fe]" onclick="event.stopPropagation()">
                  <input type="checkbox" class="w-4 h-4 rounded border-[#00b5e2] text-[#00b5e2] focus:ring-0 cursor-pointer" data-key='${key}' ${checked} onclick="updateSelected(this)">
              </td>
              <td class="p-3 border-b border-[#e0f2fe] font-mono text-[#f59e0b] font-black text-[13px]">${hs.idHS || '---'}</td>
              <td class="p-3 border-b border-[#e0f2fe] font-bold text-[#004c6d] group-hover:text-[#00b5e2] transition">${hs.hoten}</td>
              <td class="p-3 border-b border-[#e0f2fe] text-[#334155] font-medium">${hs.lop}</td>
              <td class="p-3 border-b border-[#e0f2fe] text-[#64748b] text-[13px]">${hs.ngaysinh}</td>
            </tr>
          `;
        });
        updateSelectAll();
    })
    .catch(err => {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-xs text-red-500">Lỗi lấy danh sách học sinh</td></tr>';
    });
}

function toggleSelectAll() {
  const checked = $('#selectAll').checked;
  document.querySelectorAll('#hocSinhTableBody input[type="checkbox"]').forEach(cb => {
    cb.checked = checked;
    const key = cb.dataset.key;
    if (key && key !== 'N/A') {
      if (checked) selectedKeys.add(key);
      else selectedKeys.delete(key);
    }
  });
  updateCounter();
}

function updateSelected(cb) {
  const key = cb.dataset.key;
  if (key && key !== 'N/A') {
    if (cb.checked) selectedKeys.add(key);
    else selectedKeys.delete(key);
  }
  updateSelectAll();
  updateCounter();
}

function updateSelectAll() {
  const all = document.querySelectorAll('#hocSinhTableBody input[type="checkbox"]');
  $('#selectAll').checked = all.length > 0 && Array.from(all).every(cb => cb.checked);
}

function updateCounter() {
    $('#selectedCount').textContent = `Đã chọn: ${selectedKeys.size} học sinh`;
}

function giaoNhiemVu() {
  const listID = Array.from(selectedKeys);
  if (listID.length === 0) {
    showToast('Vui lòng chọn ít nhất một học sinh!', 'error');
    return;
  }

  if(!$('#batDau').value || !$('#ketThuc').value) {
      showToast('Vui lòng chọn thời gian Bắt đầu và Kết thúc', 'error');
      return;
  }

  $('#pageLoading').style.display = 'flex';
  $('#confirmBtn').disabled = true;

  const isTH = currentMaDe.startsWith('TH');

  const data = {
    maDe: currentMaDe,
    dsID: listID,
    batDau: $('#batDau').value,
    ketThuc: $('#ketThuc').value,
    soLuot: isTH ? "" : parseInt($('#soLuot').value),
    diemCao: isTH ? "" : parseFloat($('#diemCao').value),
    diemTB: isTH ? "" : parseFloat($('#diemTB').value)
  };

  callAPI('luuNhiemVu', data)
    .then(res => {
        $('#pageLoading').style.display = 'none';
        $('#confirmBtn').disabled = false;
        if(res.success) {
            showToast(`Đã giao thành công cho ${listID.length} học sinh!`, 'success');
            hideGiaoModal();
        } else {
            showToast('Lỗi: ' + res.error, 'error');
        }
    })
    .catch(err => {
        $('#pageLoading').style.display = 'none';
        $('#confirmBtn').disabled = false;
        showToast('Lỗi hệ thống!', 'error');
    });
}