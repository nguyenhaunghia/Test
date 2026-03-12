async function callAPI(action, payload = {}) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, data: payload })
    });
    if (!response.ok) throw new Error('Mất kết nối máy chủ');
    const res = await response.json();
    if (res.success === false) throw new Error(res.error || 'Lỗi từ máy chủ');
    if (res.success === true && res.data !== undefined) return res.data; 
    return res; 
  } catch (error) { 
    console.error('API Error:', error); 
    throw error; 
  }
}

const PAGE_SIZE = 10; 
let filteredIds = []; 
let selectedQuestions = []; 
let questionCache = {}; 

let leftPage = 1, rightPage = 1; 
let totalFound = 0;
let currentEditingMaDe = null; 
let fullDataTree = null; 
let currentDownloadUrl = ''; 
let currentFilename = '';
let allMaDeList = []; 

if (typeof window.$ === 'undefined') { window.$ = s => document.querySelector(s); }

// --- HÀM HỆ THỐNG CƠ BẢN ---
function showToast(message, type = 'info') {
  const toast = $('#toast'); const icon = $('#toastIcon'); const msg = $('#toastMessage');
  if (!toast || !icon || !msg) return;
  msg.textContent = message;
  toast.className = 'fixed bottom-5 right-5 p-4 rounded-lg shadow-xl flex items-center gap-3 transform transition-all z-[9999]';
  if (type === 'info') { toast.classList.add('bg-blue-50', 'text-blue-800', 'border', 'border-blue-200'); icon.className = 'fas fa-spinner fa-spin text-blue-500'; } 
  else if (type === 'success') { toast.classList.add('bg-green-50', 'text-green-800', 'border', 'border-green-200'); icon.className = 'fas fa-check-circle text-green-500'; } 
  else if (type === 'error') { toast.classList.add('bg-red-50', 'text-red-800', 'border', 'border-red-200'); icon.className = 'fas fa-exclamation-triangle text-red-500'; }
  toast.style.opacity = '1'; toast.style.transform = 'translateY(0)';
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)'; }, 3000);
}

// --- TẢI CẤU TRÚC DANH MỤC ---
async function loadAllMetadata(isRefresh = false) {
  const headerEl = $('#leftHeader');
  if (headerEl) headerEl.textContent = 'Đang tải cấu trúc dữ liệu...';
  try {
    const data = await callAPI('getAllMetadata', { refresh: isRefresh });
    fullDataTree = data; 
    renderSelect('mon', data.monList || []); renderSelect('khoi', []); renderSelect('chude', []);
    renderSelect('loai', data.loaiList || []); renderSelect('mucdo', data.mucdoList || []);
    if (headerEl) headerEl.textContent = 'Dữ liệu đã sẵn sàng';
  } catch (e) { showToast('Lỗi tải cấu trúc dữ liệu', 'error'); }
}

function renderSelect(name, list, isLoading = false) {
  const sel = $(`select[name="${name}"]`); if (!sel) return;
  sel.innerHTML = isLoading ? '<option value="">Đang tải...</option>' : '<option value="">Tất cả</option>';
  if (isLoading) return;
  list.forEach(item => {
    const text = (typeof item === 'object') ? (item.name || item.id) : item;
    const val = (typeof item === 'object') ? item.id : item;
    sel.add(new Option(text, val));
  });
}

function onMonChange() {
  if (!fullDataTree) return;
  const monId = $('select[name="mon"]').value;
  renderSelect('khoi', [], true); renderSelect('chude', [], true); 
  setTimeout(() => {
    const filteredKhoi = fullDataTree.khoiList.filter(k => !monId || k.monId === monId || !k.monId);
    renderSelect('khoi', filteredKhoi);
    onKhoiChange();
  }, 100); 
}

function onKhoiChange() {
  if (!fullDataTree) return;
  const monId = $('select[name="mon"]').value; const khoiId = $('select[name="khoi"]').value;
  renderSelect('chude', [], true); 
  setTimeout(() => {
    const filteredChude = fullDataTree.chudeList.filter(c => (!monId || c.monId === monId || !c.monId) && (!khoiId || c.khoiId === khoiId || !c.khoiId));
    renderSelect('chude', filteredChude);
  }, 100);
}


// =========================================================================
// TÍNH NĂNG MỚI: LÀM MỚI BỘ LỌC KẾT HỢP BẢO TOÀN TRẠNG THÁI & LỌC TỰ ĐỘNG
// =========================================================================
async function refreshAndPreserveFilters() {
  const btn = $('#btnRefresh');
  const originalIcon = btn ? btn.innerHTML : '<i class="fas fa-sync-alt"></i>';
  
  if (btn) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin text-[16px]"></i>';
      btn.disabled = true;
  }

  // 1. Sao lưu giá trị hiện tại của các List Box
  const getVal = name => { const el = $(`select[name="${name}"]`); return el ? el.value : ''; };
  const savedMon = getVal('mon');
  const savedKhoi = getVal('khoi');
  const savedChude = getVal('chude');
  const savedLoai = getVal('loai');
  const savedMucdo = getVal('mucdo');

  try {
    // 2. Nạp lại metadata (gọi hàm gốc của bạn)
    await loadAllMetadata(true);

    // 3. Phục hồi Môn, Loại, Mức độ (Chỉ phục hồi nếu giá trị đó vẫn còn trong danh sách mới)
    const setVal = (name, val) => {
        const el = $(`select[name="${name}"]`);
        if (el && Array.from(el.options).some(o => o.value === val)) el.value = val;
    };
    setVal('mon', savedMon);
    setVal('loai', savedLoai);
    setVal('mucdo', savedMucdo);

    // 4. Phục hồi Khối (Bắt buộc phải filter dựa trên Môn đã phục hồi)
    const currentMon = getVal('mon');
    if (fullDataTree && fullDataTree.khoiList) {
        const filteredKhoi = fullDataTree.khoiList.filter(k => !currentMon || k.monId === currentMon || !k.monId);
        renderSelect('khoi', filteredKhoi);
        setVal('khoi', savedKhoi);
    }

    // 5. Phục hồi Chủ đề (Bắt buộc phải filter dựa trên Môn và Khối đã phục hồi)
    const currentKhoi = getVal('khoi');
    if (fullDataTree && fullDataTree.chudeList) {
        const filteredChude = fullDataTree.chudeList.filter(c => (!currentMon || c.monId === currentMon || !c.monId) && (!currentKhoi || c.khoiId === currentKhoi || !c.khoiId));
        renderSelect('chude', filteredChude);
        setVal('chude', savedChude);
    }

    // 6. Áp dụng bộ lọc ngay lập tức sau khi đã phục hồi xong form
    await applyFilter();

  } catch (error) {
    console.error("Lỗi khi phục hồi filter:", error);
  } finally {
    if (btn) {
        btn.innerHTML = originalIcon;
        btn.disabled = false;
    }
  }
}
// =========================================================================


// --- LỌC DỮ LIỆU ---
function getFilters() {
  const searchInput = $('#keywordSearch'); const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
  return {
    filter1: ($('select[name="mon"]') || {}).value || null, filter2: ($('select[name="khoi"]') || {}).value || null,
    filter3: ($('select[name="chude"]') || {}).value || null, filter4: ($('select[name="loai"]') || {}).value || null,
    filter5: ($('select[name="mucdo"]') || {}).value || null, keyword: keyword || null
  };
}

async function applyFilter() {
  const btnFilter = document.getElementById('btnFilter'); 
  const leftCards = $('#leftCards');
  
  if (btnFilter) { btnFilter.disabled = true; btnFilter.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang lọc...'; }
  if (leftCards) leftCards.innerHTML = '<div class="flex justify-center p-10"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>';

  try {
    const ids = await callAPI('getFilteredIds', getFilters());
    totalFound = ids ? ids.length : 0; 
    filteredIds = ids || [];
    leftPage = 1;
    
    if (btnFilter) { btnFilter.disabled = false; btnFilter.innerHTML = '<i class="fas fa-filter mr-2"></i> Lọc danh sách'; }
    
    if (totalFound === 0) { 
      if (leftCards) leftCards.innerHTML = '<div class="no-results text-center p-10 text-gray-500">Không tìm thấy câu hỏi nào...</div>'; 
      updateLeftHeader();
      return; 
    }
    
    showToast(`Tìm thấy ${totalFound} câu hỏi`, 'success');
    renderLeftPanel(); 
  } catch(e) { 
    if (btnFilter) { btnFilter.disabled = false; btnFilter.innerHTML = '<i class="fas fa-filter mr-2"></i> Lọc danh sách'; }
    showToast('Lỗi kết nối khi lọc', 'error'); 
  }
}

function updateLeftHeader() {
  const availableCount = filteredIds.filter(id => !selectedQuestions.some(sq => sq.id === id)).length;
  const headerEl = $('#leftHeader'); if (headerEl) headerEl.textContent = `Ngân hàng: ${availableCount}/${totalFound} câu hỏi`;
}

function updateButtonStates() {
  const hasQuestions = selectedQuestions.length > 0; const isEditing = currentEditingMaDe !== null;
  const exportBtn = $('#exportBtn'); const saveDeBtn = $('#saveDeBtn'); const quickSaveBtn = $('#quickSaveBtn');
  if (exportBtn) exportBtn.disabled = !hasQuestions; if (saveDeBtn) saveDeBtn.disabled = !hasQuestions; if (quickSaveBtn) quickSaveBtn.disabled = !(isEditing && hasQuestions);
}

// --- RENDER DỮ LIỆU ---
async function renderLeftPanelcu() {
  const cont = $('#leftCards'); const pag = $('#leftPagination');
  if (!cont) return;
  updateLeftHeader();

  const availableIds = filteredIds.filter(id => !selectedQuestions.some(sq => sq.id === id));
  const totalP = Math.ceil(availableIds.length / PAGE_SIZE) || 1; 
  leftPage = Math.max(1, Math.min(leftPage, totalP));
  
  const start = (leftPage - 1) * PAGE_SIZE; 
  const pageIds = availableIds.slice(start, start + PAGE_SIZE);

  if (pageIds.length === 0) {
    cont.innerHTML = '<div class="no-results">Trống</div>';
    if (pag) pag.innerHTML = '';
    return;
  }

  cont.innerHTML = '';
  renderPagination('left', leftPage, totalP, pag);

  for (let i = 0; i < pageIds.length; i++) {
    const qId = pageIds[i];
    let qData = questionCache[qId];

    if (!qData) {
      try {
        const res = await callAPI('loadQuestion', { QuestionID: qId });
        qData = res.data ? res.data : res; 
        if (qData && !qData.error) questionCache[qId] = qData; 
      } catch (e) { console.error('Lỗi tải câu', qId); }
    }

    if (qData && !qData.error) {
      cont.appendChild(createCard({ id: qId, data: qData }, false));
    }
  }
  renderKaTeX('#leftCards');
}

function renderRightPanelcu() {
  const cont = $('#rightCards'); const pag = $('#rightPagination');
  if (!cont) return;

  const totalP = Math.ceil(selectedQuestions.length / PAGE_SIZE) || 1; 
  rightPage = Math.max(1, Math.min(rightPage, totalP));
  const start = (rightPage - 1) * PAGE_SIZE; 
  const pageQs = selectedQuestions.slice(start, start + PAGE_SIZE);

  cont.innerHTML = pageQs.length ? '' : '<div class="no-results">Chưa chọn câu nào</div>';
  pageQs.forEach((q, i) => { cont.appendChild(createCard(q, true, start + i + 1)); });

  renderPagination('right', rightPage, totalP, pag);
  renderKaTeX('#rightCards');
}

async function renderLeftPanel() {
  const cont = $('#leftCards'); const pag = $('#leftPagination');
  if (!cont) return;
  updateLeftHeader();

  const availableIds = filteredIds.filter(id => !selectedQuestions.some(sq => sq.id === id));
  const totalP = Math.ceil(availableIds.length / PAGE_SIZE) || 1; 
  leftPage = Math.max(1, Math.min(leftPage, totalP));
  
  const start = (leftPage - 1) * PAGE_SIZE; 
  const pageIds = availableIds.slice(start, start + PAGE_SIZE);

  if (pageIds.length === 0) {
    cont.innerHTML = '<div class="no-results">Trống</div>';
    if (pag) pag.innerHTML = '';
    return;
  }

  cont.innerHTML = '';
  renderPagination('left', leftPage, totalP, pag);

  for (let i = 0; i < pageIds.length; i++) {
    const qId = pageIds[i];
    let qData = questionCache[qId];

    if (!qData) {
      try {
        const res = await callAPI('loadQuestion', { QuestionID: qId });
        qData = res.data ? res.data : res; 
        if (qData && !qData.error) questionCache[qId] = qData; 
      } catch (e) { console.error('Lỗi tải câu', qId); }
    }

    if (qData && !qData.error) {
      // ÉP RENDER LATEX NGAY KHI VỪA TẠO THẺ ĐỂ KHÔNG BỊ TRỄ
      const card = createCard({ id: qId, data: qData }, false);
      cont.appendChild(card);
      renderKaTeX(card); 
    }
  }
}

function renderRightPanel() {
  const cont = $('#rightCards'); const pag = $('#rightPagination');
  if (!cont) return;

  const totalP = Math.ceil(selectedQuestions.length / PAGE_SIZE) || 1; 
  rightPage = Math.max(1, Math.min(rightPage, totalP));
  const start = (rightPage - 1) * PAGE_SIZE; 
  const pageQs = selectedQuestions.slice(start, start + PAGE_SIZE);

  cont.innerHTML = pageQs.length ? '' : '<div class="no-results">Chưa chọn câu nào</div>';
  
  pageQs.forEach((q, i) => { 
      const card = createCard(q, true, start + i + 1);
      cont.appendChild(card); 
      renderKaTeX(card); // ÉP RENDER LATEX NGAY
  });

  renderPagination('right', rightPage, totalP, pag);
}





function renderPagination(side, current, total, container) {
  if (!container) return;
  if (total <= 1) { container.innerHTML = ''; return; }
  
  let html = `<button onclick="changePage('${side}', ${current-1})" ${current===1?'disabled':''}>&laquo;</button>`;
  for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
          html += `<button onclick="changePage('${side}', ${i})" ${i===current?'class="active"':''}>${i}</button>`;
      } else if (i === current - 3 || i === current + 3) {
          html += `<span style="padding:0 5px; color:#999">...</span>`;
      }
  }
  html += `<button onclick="changePage('${side}', ${current+1})" ${current===total?'disabled':''}>&raquo;</button>`;
  container.innerHTML = html;
}

function changePage(side, page) { 
  if (side === 'left') { leftPage = page; renderLeftPanel(); } 
  else { rightPage = page; renderRightPanel(); } 
}

function toggle(id) {
  let qData = questionCache[id];
  let q = qData ? { id: id, data: qData } : selectedQuestions.find(item => item.id === id);
  if (!q) return;

  const index = selectedQuestions.findIndex(item => item.id === id);
  if (index > -1) { selectedQuestions.splice(index, 1); } 
  else { selectedQuestions.push(q); }

  const countEl = $('#selectedCount'); if (countEl) countEl.textContent = selectedQuestions.length;
  updateButtonStates(); 
  
  if (index === -1) rightPage = Math.ceil(selectedQuestions.length / PAGE_SIZE) || 1; 

  renderLeftPanel(); 
  renderRightPanel();
}

function createCard(q, sel, order) {
  return buildSharedQuestionCard(q, {
    id: q.id,
    order: order,
    showToggleIcon: true,
    isSelected: sel,
    onToggleAction: `toggle('${q.id}')`
  });
}

function renderKaTeXcu(sel) {
  const el = $(sel);
  if (el && typeof renderMathInElement === 'function') {
    renderMathInElement(el, { delimiters: [ {left:'$$',right:'$$',display:true}, {left:'$',right:'$',display:false} ], throwOnError: false });
  }
}

function renderKaTeX(target) {
  // Cho phép truyền vào ID string (vd: '#leftCards') hoặc truyền trực tiếp Element (card)
  const el = typeof target === 'string' ? $(target) : target;
  if (el && typeof renderMathInElement === 'function') {
    renderMathInElement(el, { 
        delimiters: [ 
            {left:'$$',right:'$$',display:true}, 
            {left:'$',right:'$',display:false},
            {left:'\\(',right:'\\)',display:false}, // Bổ sung để nhận diện \( ... \)
            {left:'\\[',right:'\\]',display:true}   // Bổ sung để nhận diện \[ ... \]
        ], 
        throwOnError: false 
    });
  }
}

// =========================================================================
// QUẢN LÝ MÃ ĐỀ (LƯU, SỬA, XÓA) - ĐÃ CẬP NHẬT TỪ BẢN GỐC CỦA BẠN
// =========================================================================

function showMaDeListModal() {
  $('#maDeListContent').innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:100px;">
      <i class="fas fa-spinner fa-spin" style="font-size:60px;color:#6f42c1;margin-bottom:24px;"></i>
      <br><strong style="font-size:20px;color:#5f6368;">Đang tải danh sách mã đề...</strong>
    </div>`;
  $('#maDeSearch').value = '';
  $('#maDeListModal').style.display = 'flex';

  callAPI('getAllMaDeList').then(data => {
    allMaDeList = data;
    displayMaDeList(allMaDeList);
  }).catch(e => showToast('Lỗi tải danh sách mã đề', 'error'));
}

function hideMaDeListModal() { $('#maDeListModal').style.display = 'none'; }

function filterMaDeList() {
  const query = $('#maDeSearch').value.toLowerCase();
  const filtered = allMaDeList.filter(item => {
    return (item.maDe || '').toLowerCase().includes(query) ||
           (item.mon || '').toLowerCase().includes(query) ||
           (item.khoi || '').toLowerCase().includes(query) ||
           (item.chuDe || '').toLowerCase().includes(query);
  });
  displayMaDeList(filtered);
}

function displayMaDeList(list) {
  const container = $('#maDeListContent');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:50px; color:#999; font-size:16px;">Chưa có đề trắc nghiệm (TN) nào được lưu.</div>';
    return;
  }

  container.innerHTML = '';
  list.forEach(item => {
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff; border:1px solid #e0e0e0; border-radius:12px; padding:18px; position:relative; box-shadow:0 2px 8px rgba(0,0,0,0.06); display:flex; flex-direction:column; gap:10px;';
    
    const isEnable = String(item.hieuLuc).toLowerCase() === 'yes';
    const statusHtml = isEnable 
      ? '<span style="color:#16a34a; font-weight:600;"><i class="fas fa-check-circle"></i> Sẵn sàng</span>' 
      : '<span style="color:#dc2626; font-weight:600;"><i class="fas fa-lock"></i> Đã khóa</span>';

    const title = item.chuDe || 'Chưa đặt chủ đề';
    
    let totalCount = item.total;
    if (!totalCount || totalCount == 0) {
        totalCount = item.ids ? item.ids.split(',').filter(Boolean).length : 0;
    }
    const ratioText = `${item.soCau}/${totalCount}`;

    card.innerHTML = `
      <div style="font-weight:700; color:#1a73e8; font-size:18px; line-height:1.3;">
        ${title}
      </div>
      
      <div style="font-size:12px; color:#6b7280; font-family:monospace; background:#f3f4f6; display:inline-block; padding:2px 8px; border-radius:4px; width:fit-content;">
        ID: ${item.maDe}
      </div>

      <div style="font-size:14px; color:#4b5563; display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:4px;">
        <span>Môn: <b>${item.mon}</b></span>
        <span>Khối: <b>${item.khoi}</b></span>
        <span>Số câu: <b style="color:#6f42c1;">${ratioText}</b></span>
        <span>Thời gian: <b>${item.thoiLuong}p</b></span>
        
        <div style="grid-column: 1/-1; margin-top:8px; padding-top:8px; border-top:1px dashed #e5e7eb; display:flex; justify-content:space-between; align-items:center;">
          <span>Trạng thái: ${statusHtml}</span>
        </div>
      </div>

      <div style="margin-top:auto; padding-top:12px; display:flex; gap:8px;">
        <button onclick="editMaDe('${item.maDe}', false)" style="flex:1; background:#6f42c1; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:600; font-size:13px; transition:all 0.2s;" title="Xóa danh sách hiện tại và nạp mới hoàn toàn">
          <i class="fas fa-file-import mr-1"></i> Nạp mới
        </button>
        <button onclick="editMaDe('${item.maDe}', true)" style="flex:1; background:#10b981; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:600; font-size:13px; transition:all 0.2s;" title="Giữ nguyên danh sách hiện tại, bổ sung thêm câu hỏi mới">
          <i class="fas fa-plus-circle mr-1"></i> Nạp thêm
        </button>
        <button onclick="confirmDeleteMaDe('${item.maDe}')" style="background:#fee2e2; color:#dc2626; border:none; width:40px; height:40px; border-radius:8px; cursor:pointer; transition:all 0.2s; flex-shrink:0;">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function confirmDeleteMaDe(maDeId) {
  showToast(`Xác nhận xóa mã đề "${maDeId}"? Nhấn lại để xác nhận.`, 'warning');
  setTimeout(() => {
    const deleteBtn = document.querySelector(`button[onclick="confirmDeleteMaDe('${maDeId}')"]`);
    if (deleteBtn) { deleteBtn.onclick = () => deleteMaDe(maDeId); }
  }, 100); 
}

async function deleteMaDe(maDeId) {
  try {
    const result = await callAPI('deleteMaDe', { maDeId: maDeId });
    if (result.success || result) { 
      showToast(`Đã xóa mã đề ${maDeId} thành công!`, 'success');
      showMaDeListModal(); 
    }
  } catch (e) { showToast('Lỗi xóa: ' + e.message, 'error'); }
}

async function editMaDecu(maDeId, isAppend = false) {
  hideMaDeListModal();
  const rightCards = $('#rightCards');
  if (rightCards) {
    rightCards.innerHTML = `
      <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; height: 100%; min-height: 300px;">
        <i class="fas fa-spinner fa-spin" style="font-size: 44px; color: #1a73e8; margin-bottom: 20px;"></i>
        <h3 style="color: #202124; font-size: 18px; font-weight: 600; margin-bottom: 8px;">Đang ${isAppend ? 'nạp thêm từ' : 'nạp'} mã đề ${maDeId}...</h3>
        <p id="loadingProgressText" style="color: #5f6368; font-size: 15px;">Đang phân tích dữ liệu...</p>
      </div>
    `;
  }

  if (!isAppend) {
      selectedQuestions = [];
      const countEl = $('#selectedCount');
      if(countEl) countEl.textContent = '0';
  }
  updateButtonStates();

  try {
    const details = await callAPI('getMaDeInfoById', { maDeId: maDeId });
    if (!details) throw new Error('Dữ liệu mã đề trống.');

    const idsString = details.ids ? String(details.ids) : '';
    let idsArray = idsString.split(',').map(s => s.trim()).filter(Boolean);

    if (idsArray.length === 0) {
      showToast('Nhiệm vụ này được tạo nhưng chưa có câu hỏi nào.', 'success');
      if (!isAppend) currentEditingMaDe = maDeId;
      updateButtonStates();
      renderRightPanel();
      return;
    }

    let duplicateCount = 0;
    let addedCount = 0;

    if (isAppend) {
        const existingIds = selectedQuestions.map(q => String(q.id).trim());
        const newIdsArray = idsArray.filter(id => !existingIds.includes(id)); 
        duplicateCount = idsArray.length - newIdsArray.length;
        idsArray = newIdsArray;

        if (idsArray.length === 0) {
            showToast(`Đã bỏ qua ${duplicateCount} câu do trùng lặp. Không có câu mới nào được thêm.`, 'warning');
            renderRightPanel();
            return;
        }
    }

    const progressText = $('#loadingProgressText');
    if (progressText) progressText.innerHTML = `Đang phân loại <b>${idsArray.length}</b> câu hỏi cần nạp...`;

    let missingIds = idsArray.filter(id => !questionCache[id]);

    if (missingIds.length > 0) {
        if (progressText) progressText.innerHTML = `Đang kết nối lấy <b>${missingIds.length}</b> câu hỏi...`;
        
        try {
            let res = await callAPI('loadQuestionBatch', missingIds);
            let loaded = res.data ? res.data : res;
            
            if (!Array.isArray(loaded) || loaded.length === 0) throw new Error("Batch rỗng");

            loaded.forEach(q => {
                let qId = q.id || q.QuestionID;
                let qData = q.data ? q.data : q; 
                if (qId && qData) questionCache[qId] = qData;
            });

        } catch (batchError) {
            if (progressText) progressText.innerHTML = `Đang áp dụng tải song song...`;
            
            for (let i = 0; i < missingIds.length; i += 5) {
                let chunk = missingIds.slice(i, i + 5);
                if (progressText) progressText.innerHTML = `Đang nạp câu <b>${Math.min(i + 5, missingIds.length)}</b> / <b>${missingIds.length}</b>...`;
                
                let promises = chunk.map(qId => 
                    callAPI('loadQuestion', { QuestionID: qId })
                    .then(res => {
                        let qData = res.data ? res.data : res;
                        if (qData && !qData.error) questionCache[qId] = qData;
                    })
                    .catch(e => console.error("Lỗi tải câu", qId))
                );
                
                await Promise.all(promises); 
            }
        }
    }

    if (progressText) progressText.innerHTML = `Đang xuất giao diện...`;
    
    for (let id of idsArray) {
        let cachedData = questionCache[id];
        if (cachedData) {
            let finalData = cachedData.data ? cachedData.data : cachedData;
            selectedQuestions.push({ id: id, data: finalData });
            addedCount++;
        }
    }

    const countEl = $('#selectedCount');
    if(countEl) countEl.textContent = selectedQuestions.length;
    
    currentEditingMaDe = isAppend ? null : maDeId;
    
    renderRightPanel();
    updateButtonStates();
    
    const quickSaveBtn = $('#quickSaveBtn');
    if(quickSaveBtn && currentEditingMaDe) {
        quickSaveBtn.classList.add('ring-2', 'ring-green-400', 'ring-offset-2');
    } else if (quickSaveBtn) {
        quickSaveBtn.classList.remove('ring-2', 'ring-green-400', 'ring-offset-2');
    }

    if (addedCount === 0 && !isAppend) {
        showToast('Nạp thất bại: Không lấy được dữ liệu chi tiết!', 'error');
    } else {
        if (isAppend) {
            let msg = `Đã bổ sung ${addedCount} câu hỏi mới.`;
            if (duplicateCount > 0) msg += ` (Bỏ qua ${duplicateCount} câu trùng)`;
            showToast(msg, 'success');
        } else {
            showToast(`Nạp thành công ${addedCount} câu hỏi!`, 'success');
        }
    }

  } catch (e) {
    showToast('Lỗi nạp đề: ' + e.message, 'error');
    renderRightPanel(); 
  }
}


async function editMaDe(maDeId, isAppend = false) {
  hideMaDeListModal();
  const rightCards = $('#rightCards');
  if (rightCards) {
    rightCards.innerHTML = `
      <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; height: 100%; min-height: 300px;">
        <i class="fas fa-spinner fa-spin" style="font-size: 44px; color: #1a73e8; margin-bottom: 20px;"></i>
        <h3 style="color: #202124; font-size: 18px; font-weight: 600; margin-bottom: 8px;">Đang ${isAppend ? 'nạp thêm từ' : 'nạp'} mã đề ${maDeId}...</h3>
        <p id="loadingProgressText" style="color: #5f6368; font-size: 15px;">Đang phân tích dữ liệu...</p>
      </div>
    `;
  }

  if (!isAppend) {
      selectedQuestions = [];
      const countEl = $('#selectedCount');
      if(countEl) countEl.textContent = '0';
  }
  updateButtonStates();

  try {
    const details = await callAPI('getMaDeInfoById', { maDeId: maDeId });
    if (!details) throw new Error('Dữ liệu mã đề trống.');

    const idsString = details.ids ? String(details.ids) : '';
    let idsArray = idsString.split(',').map(s => s.trim()).filter(Boolean);

    if (idsArray.length === 0) {
      showToast('Nhiệm vụ này được tạo nhưng chưa có câu hỏi nào.', 'success');
      if (!isAppend) currentEditingMaDe = maDeId;
      updateButtonStates();
      renderRightPanel();
      
      // Đồng bộ trái ngay cả khi đề rỗng (nếu dùng lệnh Nạp mới)
      if (filteredIds.length > 0) renderLeftPanel();
      return;
    }

    let duplicateCount = 0;
    let addedCount = 0;

    if (isAppend) {
        const existingIds = selectedQuestions.map(q => String(q.id).trim());
        const newIdsArray = idsArray.filter(id => !existingIds.includes(id)); 
        duplicateCount = idsArray.length - newIdsArray.length;
        idsArray = newIdsArray;

        if (idsArray.length === 0) {
            showToast(`Đã bỏ qua ${duplicateCount} câu do trùng lặp. Không có câu mới nào được thêm.`, 'warning');
            renderRightPanel();
            return;
        }
    }

    const progressText = $('#loadingProgressText');
    if (progressText) progressText.innerHTML = `Đang phân loại <b>${idsArray.length}</b> câu hỏi cần nạp...`;

    let missingIds = idsArray.filter(id => !questionCache[id]);

    if (missingIds.length > 0) {
        if (progressText) progressText.innerHTML = `Đang kết nối lấy <b>${missingIds.length}</b> câu hỏi...`;
        
        try {
            let res = await callAPI('loadQuestionBatch', missingIds);
            let loaded = res.data ? res.data : res;
            
            if (!Array.isArray(loaded) || loaded.length === 0) throw new Error("Batch rỗng");

            loaded.forEach(q => {
                let qId = q.id || q.QuestionID;
                let qData = q.data ? q.data : q; 
                if (qId && qData) questionCache[qId] = qData;
            });

        } catch (batchError) {
            if (progressText) progressText.innerHTML = `Đang áp dụng tải song song...`;
            
            for (let i = 0; i < missingIds.length; i += 5) {
                let chunk = missingIds.slice(i, i + 5);
                if (progressText) progressText.innerHTML = `Đang nạp câu <b>${Math.min(i + 5, missingIds.length)}</b> / <b>${missingIds.length}</b>...`;
                
                let promises = chunk.map(qId => 
                    callAPI('loadQuestion', { QuestionID: qId })
                    .then(res => {
                        let qData = res.data ? res.data : res;
                        if (qData && !qData.error) questionCache[qId] = qData;
                    })
                    .catch(e => console.error("Lỗi tải câu", qId))
                );
                
                await Promise.all(promises); 
            }
        }
    }

    if (progressText) progressText.innerHTML = `Đang xuất giao diện...`;
    
    for (let id of idsArray) {
        let cachedData = questionCache[id];
        if (cachedData) {
            let finalData = cachedData.data ? cachedData.data : cachedData;
            selectedQuestions.push({ id: id, data: finalData });
            addedCount++;
        }
    }

    const countEl = $('#selectedCount');
    if(countEl) countEl.textContent = selectedQuestions.length;
    
    currentEditingMaDe = isAppend ? null : maDeId;
    
    // Render khung bên phải (Đề thi)
    renderRightPanel();
    updateButtonStates();
    
    const quickSaveBtn = $('#quickSaveBtn');
    if(quickSaveBtn && currentEditingMaDe) {
        quickSaveBtn.classList.add('ring-2', 'ring-green-400', 'ring-offset-2');
    } else if (quickSaveBtn) {
        quickSaveBtn.classList.remove('ring-2', 'ring-green-400', 'ring-offset-2');
    }

    if (addedCount === 0 && !isAppend) {
        showToast('Nạp thất bại: Không lấy được dữ liệu chi tiết!', 'error');
    } else {
        if (isAppend) {
            let msg = `Đã bổ sung ${addedCount} câu hỏi mới.`;
            if (duplicateCount > 0) msg += ` (Bỏ qua ${duplicateCount} câu trùng)`;
            showToast(msg, 'success');
        } else {
            showToast(`Nạp thành công ${addedCount} câu hỏi!`, 'success');
        }
    }

    // ===============================================================
    // UPDATE: TỰ ĐỘNG ĐỒNG BỘ KHUNG BÊN TRÁI (LỌC BỎ CÂU TRÙNG)
    // ===============================================================
    if (filteredIds.length > 0) {
        renderLeftPanel();
    }

  } catch (e) {
    showToast('Lỗi nạp đề: ' + e.message, 'error');
    renderRightPanel(); 
  }
}



// --- MODAL LƯU / CẬP NHẬT MÃ ĐỀ ---

function showSaveDeDialog() {
  if (selectedQuestions.length === 0) {
    showToast('Chọn ít nhất một câu hỏi để lưu đề.', 'error');
    return;
  }

  const monSelect = $('#saveMonModal');
  if (monSelect) {
      monSelect.innerHTML = '<option value="">-- Chọn môn --</option>';
      if (fullDataTree && fullDataTree.monList) {
          fullDataTree.monList.forEach(m => monSelect.add(new Option(m.name, m.id)));
      }
  }

  updateKhoiModalOptions();

  const mainMon = $('select[name="mon"]').value;
  const mainKhoi = $('select[name="khoi"]').value;
  if (mainMon && monSelect) monSelect.value = mainMon;
  if (mainKhoi) $('#saveKhoiModal').value = mainKhoi;

  const tongSoCau = selectedQuestions.length;
  
  const inputTongSoCau = $('#saveTongSoCau');
  if (inputTongSoCau) inputTongSoCau.value = tongSoCau;

  const inputSoCauLam = $('#saveSoCauHoi');
  if (inputSoCauLam) {
      inputSoCauLam.disabled = false; 
      inputSoCauLam.value = tongSoCau; 
      inputSoCauLam.max = tongSoCau;

      inputSoCauLam.oninput = function() {
          let val = parseInt(this.value) || 0;
          if (val > tongSoCau) {
              this.value = tongSoCau;
              showToast('Số câu làm không được lớn hơn Tổng số câu!', 'warning');
          }
          if (val < 1) {
              this.value = 1;
          }
      };
  }

  $('#saveChuDeOnTap').value = '';
  $('#saveThoiLuong').value = '0';
  $('#saveGhiChu').value = '';
  $('#saveHieuLuc').value = 'Yes';
  $('#saveStatus').innerHTML = '';

  $('#btnSaveNew').style.display = 'inline-block';
  $('#btnUpdateExisting').style.display = currentEditingMaDe ? 'inline-block' : 'none';

  $('#saveDeModal').style.display = 'flex';
}

function updateKhoiModalOptions() {
  const monVal = $('#saveMonModal').value;
  const khoiSelect = $('#saveKhoiModal');
  khoiSelect.innerHTML = '<option value="">-- Chọn khối --</option>';
  if (fullDataTree && fullDataTree.khoiList) {
      const list = fullDataTree.khoiList.filter(k => !monVal || k.monId === monVal || !k.monId);
      list.forEach(k => khoiSelect.add(new Option(k.name, k.id)));
  }
}

function hideSaveDeDialog() { $('#saveDeModal').style.display = 'none'; }


// =========================================================================
// LƯU ĐỀ HOẶC CẬP NHẬT
// =========================================================================
async function saveDeThi(isUpdate) {
  const mon = $('#saveMonModal').value.trim();
  const khoi = $('#saveKhoiModal').value.trim();
  const chuDe = $('#saveChuDeOnTap').value.trim();

  if (!mon || !khoi || !chuDe) {
    showToast('Nhập đầy đủ Môn, Khối, Chủ đề ôn tập.', 'error');
    return;
  }

  showToast('Đang lưu đề thi...', 'info');

  const btnNew = $('#btnSaveNew');
  const btnUpd = $('#btnUpdateExisting');
  if (btnNew) btnNew.disabled = true;
  if (btnUpd) btnUpd.disabled = true;

  const ids = selectedQuestions.map(q => q.id).join(',');
  const tongSoCau = selectedQuestions.length;
  const soCauLam = parseInt($('#saveSoCauHoi').value) || tongSoCau;

  const saveData = {
    mon: mon,
    khoi: khoi,
    chuDeOnTap: chuDe,
    soCauHoi: soCauLam,    
    tongSoCau: tongSoCau,  
    hieuLuc: $('#saveHieuLuc').value,
    thoiLuong: parseInt($('#saveThoiLuong').value) || 0,
    danhSachId: ids,
    ghiChu: $('#saveGhiChu').value.trim()
  };

  if (isUpdate && currentEditingMaDe) saveData.maDeId = currentEditingMaDe;

  try {
    const action = (isUpdate && currentEditingMaDe) ? 'updateMaDe' : 'saveMaDe';
    const result = await callAPI(action, saveData);
    
    const returnedMaDe = result.maDe || result; 
    const successMsg = isUpdate ? 'Cập nhật mã đề thành công!' : 'Lưu đề thành công! Mã đề: ' + returnedMaDe;
    
    showToast(successMsg, 'success');

    if (!isUpdate && returnedMaDe) {
      currentEditingMaDe = returnedMaDe;
      updateButtonStates();
      if (btnUpd) btnUpd.style.display = 'inline-block';
      if (btnNew) btnNew.style.display = 'none';
    } else if (isUpdate) {
      updateButtonStates();
    }

    setTimeout(hideSaveDeDialog, 2500);

  } catch (e) { 
    showToast('Lỗi lưu đề: ' + e.message, 'error'); 
  } finally {
    if (btnNew) btnNew.disabled = false;
    if (btnUpd) btnUpd.disabled = false;
  }
}


// =========================================================================
// LƯU NHANH (NÚT TÍCH XANH)
// =========================================================================
async function quickSaveCurrentMaDe() {
  if (!currentEditingMaDe || selectedQuestions.length === 0) {
    showToast('Không thể lưu nhanh. Đang chỉnh sửa mã đề và cần có câu hỏi.', 'error');
    return;
  }
  showToast(`Xác nhận cập nhật mã đề "${currentEditingMaDe}"?`, 'info');
  
  const btn = $('#quickSaveBtn');
  btn.disabled = true; 
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const oldDetails = await callAPI('getMaDeInfoById', { maDeId: currentEditingMaDe });
    
    const tongSoCau = selectedQuestions.length;
    let soCauLamCu = parseInt(oldDetails.soCau) || tongSoCau;
    if (soCauLamCu > tongSoCau) soCauLamCu = tongSoCau;

    const saveData = {
        maDeId: currentEditingMaDe,
        mon: oldDetails.mon, 
        khoi: oldDetails.khoi,
        chuDeOnTap: oldDetails.chuDe, 
        soCauHoi: soCauLamCu, 
        tongSoCau: tongSoCau, 
        hieuLuc: oldDetails.hieuLuc || 'Yes', 
        thoiLuong: oldDetails.thoiLuong || 0,
        danhSachId: selectedQuestions.map(q => q.id).join(','), 
        ghiChu: oldDetails.ghiChu || ''
    };

    await callAPI('updateMaDe', saveData);
    showToast(`Đã cập nhật mã đề ${currentEditingMaDe} thành công!`, 'success');
    
    btn.classList.remove('ring-2', 'ring-green-400', 'ring-offset-2');
  } catch (e) {
    showToast('Lỗi cập nhật: ' + e.message, 'error');
  } finally {
    btn.innerHTML = '<i class="fas fa-check"></i>';
    updateButtonStates();
  }
}


// =========================================================================
// XUẤT WORD & XÁO TRỘN
// =========================================================================
function exportToWord() {
  if (selectedQuestions.length === 0) {
    showToast('Vui lòng chọn ít nhất một câu hỏi.', 'error'); return;
  }
  $('#shuffleCount').textContent = selectedQuestions.length;
  $('#shuffleQuestions').checked = false; 
  $('#shuffleAnswers').checked = false;
  $('#shuffleModal').style.display = 'flex';
}

function hideShuffleModal() { $('#shuffleModal').style.display = 'none'; }


// =========================================================================
// XÁC NHẬN XUẤT FILE WORD KÈM TOAST THÔNG BÁO TIẾN TRÌNH
// =========================================================================
async function confirmExport() {
  const Ques = $('#shuffleQuestions').checked; 
  const Answ = $('#shuffleAnswers').checked; 
  hideShuffleModal();

  const ids = selectedQuestions.map(q => q.id);
  const btn = $('#exportBtn');
  
  btn.disabled = true; 
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  showToast('Đang khởi tạo file Word. Vui lòng đợi trong giây lát...', 'info');

  try {
    const result = await callAPI('createWordFileFromSelected', { ids: ids, Ques: Ques, Answ: Answ });
    
    if (!result || !result.url) throw new Error('Không nhận được link tải file từ máy chủ.');
    
    currentDownloadUrl = result.url + '&confirm=no_antivirus';
    currentFilename = result.filename || 'DeThi_TracNghiem.docx';

    showToast('Tạo file Word thành công! Hệ thống đang tải xuống...', 'success');

    btn.disabled = false;
    btn.style.background = '#16a34a';
    btn.innerHTML = '<i class="fas fa-download"></i>';
    btn.onclick = downloadFile;
    
    downloadFile();

  } catch (e) {
    showToast('Lỗi tạo file Word: ' + e.message, 'error');
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-file-word"></i>';
    btn.style.background = '#2563eb'; 
    btn.onclick = exportToWord;
    updateButtonStates();
  }
}



function downloadFile() {
  if (!currentDownloadUrl) return;
  const a = document.createElement('a');
  a.href = currentDownloadUrl; a.download = currentFilename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);

  const btn = $('#exportBtn');
  btn.disabled = false; btn.style.background = '#1a73e8';
  btn.innerHTML = '<i class="fas fa-file-word"></i>';
  btn.onclick = exportToWord;
}

// KHỞI TẠO
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { const loadingEl = document.getElementById('loading'); if (loadingEl) loadingEl.style.display = 'none'; updateHeader(); }, 500);
  try {
    loadAllMetadata(); updateButtonStates();
    const selMon = $('select[name="mon"]'); if (selMon) selMon.addEventListener('change', onMonChange);
    const selKhoi = $('select[name="khoi"]'); if (selKhoi) selKhoi.addEventListener('change', onKhoiChange);
    const btnFilter = document.getElementById('btnFilter'); if (btnFilter) { btnFilter.innerHTML = '<i class="fas fa-filter"></i>'; btnFilter.addEventListener('click', applyFilter); }
    
    // Đã thay đổi hàm Gọi Lại cho nút Refresh ở đây
    const btnRefresh = document.getElementById('btnRefresh'); if (btnRefresh) { btnRefresh.innerHTML = '<i class="fas fa-sync-alt text-[16px]"></i>'; btnRefresh.addEventListener('click', refreshAndPreserveFilters); }
    
    const saveMonModal = $('#saveMonModal'); if (saveMonModal) saveMonModal.addEventListener('change', updateKhoiModalOptions);
  } catch (error) { console.error('Lỗi khởi tạo UI:', error); }
});