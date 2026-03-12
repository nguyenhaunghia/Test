// ==================== BIẾN TOÀN CỤC ====================
let ids=[], idx=-1, edit=false, filterMode=true;
let currentImageId='';
let currentQuestionId = '';
let isCopyMode = false;
let filteredQuestions=[];
const ITEMS_PER_PAGE=10;
let currentPage=1;
currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// Biến cho Modal Quản lý
let modalOriginalData = []; // Lưu trạng thái ban đầu của checkbox để so sánh xem có thay đổi không
let currentManageQuestionId = '';

// Khai báo biến DOM
let f, navDisplay, icon, previewCards, pagination, imageUpload, uploadButton, uploadIcon, saveBtn;

// ==================== KHỞI TẠO HỆ THỐNG ====================
async function initApp() {
  try {
    setTimeout(() => { 
      const loadingEl = document.getElementById('loading');
      if (loadingEl) loadingEl.style.display = 'none'; 
    }, 2000);

    if (typeof renderGlobalHeader === 'function') {
        renderGlobalHeader();
    }

    f = document.forms.f || document.getElementById('f');
    navDisplay = document.getElementById('navDisplay');
    icon = document.getElementById('statusIcon');
    previewCards = document.getElementById('previewCards');
    pagination = document.getElementById('pagination');
    imageUpload = document.getElementById('imageUpload');
    uploadButton = document.getElementById('uploadButton');
    uploadIcon = document.getElementById('uploadIcon');
    saveBtn = document.getElementById('saveBtn');

    setupDragAndDrop();
    document.querySelectorAll('textarea').forEach(autoResize);

    if (typeof callAPI === 'function') {
        await Promise.all([
            loadMon().catch(e => console.error("Lỗi load môn:", e)), 
            loadLoai().catch(e => console.error("Lỗi load loại:", e)),
            loadMucdo().catch(e => console.error("Lỗi load mức độ:", e)) 
        ]);
    } else {
        showErrorToast("Lỗi: Không tìm thấy file kết nối API!");
    }
  } catch(e) {
    console.error("Lỗi khởi tạo:", e);
  } finally {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none'; 
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp(); 
}

// ==================== TOAST THÔNG BÁO ====================
function createToast(type, title, message, duration = 5000) {
  const container = document.getElementById('toastContainer');
  if(!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const iconMap = { success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', warning: 'fas fa-exclamation-triangle', info: 'fas fa-info-circle' };
  toast.innerHTML = `<i class="${iconMap[type] || 'fas fa-info-circle'}"></i><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div><button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => { if (toast.parentElement) { toast.classList.remove('show'); setTimeout(() => { if (toast.parentElement) toast.remove(); }, 400); } }, duration);
  return toast;
}
function showSuccessToast(message, title = 'Thành công') { createToast('success', title, message, 4000); }
function showErrorToast(message, title = 'Lỗi') { createToast('error', title, message, 6000); }
function showWarningToast(message, title = 'Cảnh báo') { createToast('warning', title, message, 5000); }
function showInfoToast(message, title = 'Thông tin') { createToast('info', title, message, 4000); }

// ==================== LOAD SELECTBOX (API) ====================
async function loadMon() {
  if (!f || !f.SubjectID) return;
  const sel = f.SubjectID; 
  sel.innerHTML = '<option value="">Đang tải...</option>';
  try {
    const res = await callAPI('getMonList');
    sel.innerHTML = '<option value="">Tất cả</option>';
    if (res && res.success && res.data) { 
      res.data.forEach(item => sel.add(new Option(item.SubjectName, item.SubjectID))); 
    }
    await loadKhoi(); 
  } catch(e) { sel.innerHTML = '<option value="">Lỗi tải môn</option>'; }
}

async function loadKhoi() {
  if (!f || !f.BlockID) return;
  const sel = f.BlockID; 
  sel.innerHTML = '<option value="">Đang tải...</option>';
  try {
    const res = await callAPI('getKhoiList', { SubjectID: f.SubjectID.value || null });
    sel.innerHTML = '<option value="">Tất cả</option>';
    if (res && res.success && res.data) { 
      res.data.forEach(item => sel.add(new Option(item.BlockName, item.BlockID))); 
    }
    await loadChude();
  } catch(e) { sel.innerHTML = '<option value="">Lỗi tải khối</option>'; }
}

async function loadLoai() {
  if (!f || !f.TypeID) return;
  const sel = f.TypeID; 
  sel.innerHTML = '<option value="">Đang tải...</option>';
  try {
    const res = await callAPI('getLoaiList');
    sel.innerHTML = '<option value="">Tất cả</option>';
    if (res && res.success && res.data) { 
      res.data.forEach(item => sel.add(new Option(item.TypeName, item.TypeID))); 
    }
    updateSaveStatus();
  } catch(e) { sel.innerHTML = '<option value="">Lỗi tải loại</option>'; }
}

async function loadMucdo() {
  if (!f || !f.LevelID) return;
  const sel = f.LevelID; 
  sel.innerHTML = '<option value="">Đang tải...</option>';
  try {
    const res = await callAPI('getLevelList');
    sel.innerHTML = '<option value="">Tất cả</option>';
    if (res && res.success && res.data) { 
      res.data.forEach(item => sel.add(new Option(item.LevelName, item.LevelID))); 
    }
    updateSaveStatus();
  } catch(e) { sel.innerHTML = '<option value="">Lỗi tải mức độ</option>'; }
}

async function loadChude() {
  if (!f || !f.TopicID) return;
  const sel = f.TopicID; 
  sel.innerHTML = '<option value="">Đang tải...</option>';
  try {
    const params = { SubjectID: f.SubjectID.value || null, BlockID: f.BlockID.value || null };
    const res = await callAPI('getChuDeList', params);
    
    sel.innerHTML = '<option value="">Tất cả</option>';
    if (res && res.success && res.data) { 
      res.data.forEach(item => sel.add(new Option(item.TopicName, item.TopicID))); 
    }
  } catch(e) { sel.innerHTML = '<option value="">Lỗi tải CĐ</option>'; }
}

// ==================== LÀM MỚI BỘ LỌC ====================
function refreshFilters() {
    if(f.SubjectID) f.SubjectID.value = '';
    if(f.BlockID) { f.BlockID.innerHTML = '<option value="">Tất cả</option>'; f.BlockID.value = ''; }
    if(f.TopicID) { f.TopicID.innerHTML = '<option value="">Tất cả</option>'; f.TopicID.value = ''; }
    if(f.TypeID) f.TypeID.value = '';
    if(f.LevelID) f.LevelID.value = '';
    if(f.searchKeyword) f.searchKeyword.value = '';
    
    ids = [];
    filteredQuestions = [];
    currentPage = 1;
    idx = -1;
    renderCurrentPage();
    updateNav();
    updatePagination();
    clearForm(); 
    
    loadMon(); 
    showSuccessToast('Đã làm mới bộ lọc và dọn dẹp form.');
}

function getFilters() {
  const getVal = (nameOrId) => {
    const el = document.querySelector(`select[name="${nameOrId}"]`) || document.getElementById(nameOrId);
    return (el && el.value) ? el.value : null;
  };
  const searchInput = document.getElementById('searchKeyword') || f.searchKeyword;
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';

  return { filter1: getVal('SubjectID'), filter2: getVal('BlockID'), filter3: getVal('TopicID'), filter4: getVal('TypeID'), filter5: getVal('LevelID'), keyword: keyword || null };
}

// ==================== LỌC DỮ LIỆU & RENDER ====================
async function filter(){
  if(!filterMode) return;
  const filters = getFilters(); 

  navDisplay.textContent='Đang lọc...'; icon.innerHTML='<i class="fas fa-spinner loading"></i>';
  const btnFilter = document.getElementById('btnFilter');
  if (btnFilter) { btnFilter.disabled = true; btnFilter.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lọc...'; }

  try {
    const res = await callAPI('getFilteredIds', filters);
    icon.innerHTML='';
    if(res && res.success) {
      ids = res.data || []; filteredQuestions=[]; currentPage=1; idx=ids.length>0 ? 0 : -1;
      if(ids.length > 0) { 
          loadQ(ids[0]); 
          loadPage(1); 
          showSuccessToast(`Tìm thấy ${ids.length} câu hỏi`);
      } else { 
          renderCurrentPage(); 
          navDisplay.textContent='Không có kết quả'; 
          clearForm();
      }
      updateNav(); updatePagination();
    }
  } catch(e) {
    icon.innerHTML=''; showErrorToast('Lỗi mạng'); navDisplay.textContent='Lỗi lọc'; setTimeout(()=>updateNav(),3000);
  } finally {
      if (btnFilter) { btnFilter.disabled = false; btnFilter.innerHTML = '<i class="fas fa-filter text-[13px]"></i> <span class="text-[13px]">Lọc</span>'; }
  }
}

// ==================== HÀM RENDER CÂU HỎI CHÍNH ====================
async function loadPage(page){
  const start = (page-1)*ITEMS_PER_PAGE;
  const pageIds = ids.slice(start, start+ITEMS_PER_PAGE);
  previewCards.innerHTML = '';
  
  if(pageIds.length === 0) { renderCurrentPage(); return; }

  for (let localIndex = 0; localIndex < pageIds.length; localIndex++) {
    try {
      const res = await callAPI('loadQuestion', { QuestionID: pageIds[localIndex] });
      if(res && res.success) {
        const data = res.data;
        filteredQuestions[start + localIndex] = data;
        
        const card = buildSharedQuestionCard(data, {
            id: pageIds[localIndex],
            order: start + localIndex + 1,
            showToggleIcon: false 
        });
        
        // =========================================================================
        // KIỂM TRA: NẾU ĐANG Ở TRANG QUẢN LÝ THÌ BỔ SUNG ICON "LINK"
        // =========================================================================
        if (typeof IS_MANAGE_MODE !== 'undefined' && IS_MANAGE_MODE) {
            const testNames = data.Tests || []; 
            
            let testListHtml = '';
            if (testNames.length > 0) {
                testListHtml = testNames.map(t => `<span class="inline-flex items-center gap-1 px-3 py-1 bg-white border border-[#bae6fd] rounded-lg text-[12px] font-semibold text-[#0284c7] shadow-sm"><i class="fas fa-file-alt text-[#38bdf8]"></i> ${t}</span>`).join('');
            } else {
                testListHtml = `<span class="text-[12px] text-gray-400 italic bg-[#f8fafc] px-3 py-1 rounded-lg border border-[#f1f5f9]">Chưa được sử dụng trong bài kiểm tra nào.</span>`;
            }

            // Gói dữ liệu để truyền vào hàm mở Modal
            // data.SubjectID và BlockID có sẵn trong data gốc trả về từ loadQuestion
            const safeQId = data.QuestionID;
            const safeSubj = data.SubjectID || '';
            const safeBlock = data.BlockID || '';

            const testsContainer = document.createElement('div');
            testsContainer.className = 'mt-3 pt-3 border-t border-dashed border-[#e0f2fe] flex items-start gap-2';
            
            // Xóa Text lable thay bằng Icon Button cực đẹp
            testsContainer.innerHTML = `
                <button type="button" onclick="event.stopPropagation(); openTestManageModal('${safeQId}', '${safeSubj}', '${safeBlock}')" class="w-[32px] h-[32px] flex-shrink-0 flex items-center justify-center bg-[#e0f2fe] hover:bg-[#00b5e2] text-[#00b5e2] hover:text-white rounded-xl shadow-sm transition-all" title="Bấm để đưa câu hỏi này vào Bài kiểm tra">
                    <i class="fas fa-link text-[14px]"></i>
                </button>
                <div class="flex flex-wrap gap-2 items-center min-h-[32px]">
                  ${testListHtml}
                </div>
            `;
            card.appendChild(testsContainer);
        }
        // =========================================================================

        card.onclick = () => {
            idx = start + localIndex; 
            loadQ(pageIds[localIndex]); 
            updateNav();
        };

        previewCards.appendChild(card);

        if(typeof renderMathInElement !== 'undefined') {
          renderMathInElement(card, { delimiters: [{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}], throwOnError: false });
        }
      }
    } catch(e) { console.error("Lỗi tải câu hỏi:", e); }
  }
}

// ==================== CÁC HÀM XỬ LÝ MODAL QUẢN LÝ ĐỀ (CHỈ CÓ Ở QUẢN LÝ) ====================

function openTestManageModal(qID, subjID, blockID) {
    if (!qID || !subjID || !blockID) {
        showWarningToast("Câu hỏi này chưa có Môn hoặc Khối rõ ràng. Vui lòng lưu lại trước khi gán vào Đề thi.");
        return;
    }

    currentManageQuestionId = qID;
    
    // Mở Modal và hiện Loading
    const modal = document.getElementById('testManageModal');
    const modalContent = document.getElementById('testManageModalContent');
    const loading = document.getElementById('modalLoading');
    const listContainer = document.getElementById('testListContainer');
    
    if(!modal) return;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // Tạo hiệu ứng fade-in
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
    }, 10);

    loading.classList.remove('hidden');
    loading.classList.add('flex');
    listContainer.classList.add('hidden');
    listContainer.innerHTML = '';

    // Gọi API lấy danh sách
    callAPI('getTestsForQuestion', { QuestionID: qID, SubjectID: subjID, BlockID: blockID })
    .then(res => {
        loading.classList.add('hidden');
        loading.classList.remove('flex');
        listContainer.classList.remove('hidden');
        listContainer.classList.add('flex');

        if (res && res.success && res.data.length > 0) {
            modalOriginalData = JSON.parse(JSON.stringify(res.data)); // Backup dữ liệu gốc để so sánh
            
            let html = '';
            res.data.forEach((test, index) => {
                const isEnable = test.Enable.toLowerCase() === 'yes';
                const checkedStr = test.isChecked ? 'checked' : '';
                const disabledStr = !isEnable ? 'disabled' : '';
                const bgClass = isEnable ? (test.isChecked ? 'bg-[#f0f9ff] border-[#00b5e2]' : 'bg-white border-gray-200 hover:border-[#bae6fd]') : 'bg-gray-100 border-gray-200 opacity-60';
                
                html += `
                    <label class="flex items-center justify-between p-3 rounded-xl border-2 ${bgClass} cursor-pointer transition-all">
                        <div class="flex items-center gap-3">
                            <input type="checkbox" id="chk_test_${index}" data-testid="${test.TestID}" ${checkedStr} ${disabledStr} class="w-5 h-5 rounded text-[#00b5e2] focus:ring-[#00b5e2] cursor-pointer disabled:cursor-not-allowed">
                            <div>
                                <div class="font-bold text-[#004c6d]">${test.TestID} - ${test.TestTopics}</div>
                                <div class="text-xs text-gray-500 font-medium">Đang có: <span class="text-[#0284c7]">${test.Total}</span> câu hỏi</div>
                            </div>
                        </div>
                        ${!isEnable ? '<span class="text-[10px] font-bold px-2 py-1 bg-gray-200 text-gray-500 rounded uppercase">Đã khóa</span>' : ''}
                    </label>
                `;
            });
            listContainer.innerHTML = html;

            // Thêm hiệu ứng đổi màu viền khi click checkbox
            listContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    const label = this.closest('label');
                    if (this.checked) {
                        label.classList.remove('bg-white', 'border-gray-200');
                        label.classList.add('bg-[#f0f9ff]', 'border-[#00b5e2]');
                    } else {
                        label.classList.add('bg-white', 'border-gray-200');
                        label.classList.remove('bg-[#f0f9ff]', 'border-[#00b5e2]');
                    }
                });
            });

        } else {
            listContainer.innerHTML = `
                <div class="text-center text-gray-400 py-6">
                    <i class="fas fa-folder-open text-4xl mb-2 opacity-50"></i>
                    <p>Chưa có Đề thi nào thuộc Môn và Khối này.</p>
                </div>
            `;
        }
    })
    .catch(err => {
        loading.innerHTML = `<div class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Lỗi kết nối: ${err}</div>`;
    });
}

function closeTestManageModal() {
    const modal = document.getElementById('testManageModal');
    const modalContent = document.getElementById('testManageModalContent');
    if(!modal) return;

    modal.classList.add('opacity-0');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300); // Đợi CSS transition chạy xong
}

function saveTestManageData() {
    const listContainer = document.getElementById('testListContainer');
    const btnSave = document.getElementById('btnSaveTestManage');
    
    // Quét toàn bộ checkbox hiện tại
    const currentStatus = [];
    listContainer.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        currentStatus.push({
            TestID: chk.getAttribute('data-testid'),
            isChecked: chk.checked
        });
    });

    // So sánh với modalOriginalData để tìm ra những cái NÀO BỊ THAY ĐỔI
    const updates = [];
    currentStatus.forEach(current => {
        const original = modalOriginalData.find(o => o.TestID === current.TestID);
        if (original && original.isChecked !== current.isChecked) {
            updates.push(current); // Có thay đổi (từ check -> uncheck HOẶC ngược lại)
        }
    });

    if (updates.length === 0) {
        showInfoToast("Không có sự thay đổi nào.");
        closeTestManageModal();
        return;
    }

    // Đổi trạng thái nút Lưu
    const originalBtnHtml = btnSave.innerHTML;
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

    // Gửi API cập nhật
    callAPI('updateTestsQuestionList', { QuestionID: currentManageQuestionId, updates: updates })
    .then(res => {
        if (res && res.success) {
            showSuccessToast(res.message || "Cập nhật thành công!");
            closeTestManageModal();
            // Lọc lại trang để render ra các Tag Xanh mới nhất
            filter(); 
        } else {
            showErrorToast(res.error || "Lỗi cập nhật");
        }
    })
    .catch(err => showErrorToast("Lỗi mạng: " + err))
    .finally(() => {
        btnSave.disabled = false;
        btnSave.innerHTML = originalBtnHtml;
    });
}

// ==================== LOAD & SAVE CÂU HỎI ====================
async function loadQ(id){
  if(!id) return;
  navDisplay.textContent='Đang tải...'; icon.innerHTML='<i class="fas fa-spinner loading"></i>';
  try {
    const res = await callAPI('loadQuestion', { QuestionID: id });
    icon.innerHTML='';
    if(res && res.success) {
      const data = res.data;
      f.QuestionLabel.value=data.QuestionLabel||''; f.A.value=data.A||''; f.B.value=data.B||'';
      f.C.value=data.C||''; f.D.value=data.D||''; f.Note.value=data.Note||''; f.Keywords.value=data.Keywords||'';
      currentImageId = data.Image ? data.Image.trim() : '';
      currentQuestionId = id;
      updateUploadButton(); updateNav(); document.querySelectorAll('textarea').forEach(autoResize);
    }
  } catch(e) { icon.innerHTML=''; }
}

function clearForm(){ 
  ['QuestionLabel', 'A', 'B', 'C', 'D', 'Note', 'Keywords'].forEach(name => {
      if (f && f[name]) { f[name].value = ''; }
  });
  currentImageId=''; 
  currentQuestionId=''; 
  isCopyMode=false; 
  updateUploadButton(); 
  document.querySelectorAll('textarea').forEach(autoResize); 
}

function isFormValid() {
  const f = document.getElementById('f');
  if (!f) return "";
  if (!f.SubjectID.value) return "Thiếu: Môn học";
  if (!f.BlockID.value) return "Thiếu: Khối lớp";
  if (!f.TypeID.value) return "Thiếu: Loại câu hỏi";
  if (!f.LevelID.value) return "Thiếu: Mức độ";
  if (!f.TopicID.value) return "Thiếu: Chủ đề";
  if (!f.QuestionLabel.value.trim()) return "Thiếu: Câu dẫn";
  if (f.TypeID.value !== "Typ_0005") {
    if (!f.A.value.trim() || !f.B.value.trim() || !f.C.value.trim() || !f.D.value.trim()) {
      return "Thiếu: Các phương án (A, B, C, D)";
    }
  }
  return "";
}

async function save(){
  const validMsg = isFormValid();
  if (validMsg) { showWarningToast(validMsg); navDisplay.textContent = validMsg; navDisplay.className = 'status'; return; }

  let imageIdToSave = currentImageId || '';
  if (isCopyMode && currentImageId) {
    navDisplay.textContent = 'Đang copy ảnh...';
    try {
      const resImg = await callAPI('duplicateImage', { ImageID: currentImageId });
      if (resImg && resImg.success) imageIdToSave = resImg.url;
    } catch(e) {}
  }

  const data = {
    SubjectID: f.SubjectID.value, BlockID: f.BlockID.value, TypeID: f.TypeID.value,
    TopicID: f.TopicID.value, LevelID: f.LevelID.value, QuestionLabel: f.QuestionLabel.value.trim(),
    A: f.A.value.trim(), B: f.B.value.trim(), C: f.C.value.trim(), D: f.D.value.trim(),
    Note: f.Note.value.trim(), Keywords: f.Keywords.value.trim(), Image: imageIdToSave
  };

  navDisplay.textContent = 'Đang lưu...'; navDisplay.className = '';
  
  try {
    let res;
    if (currentQuestionId) {
      res = await callAPI('updateQuestion', { QuestionID: currentQuestionId, data: data });
    } else {
      res = await callAPI('saveQuestion', data);
    }

    if (res && res.success) { 
      showSuccessToast(currentQuestionId ? 'Cập nhật thành công!' : 'Thêm mới thành công!'); 
      edit = false; filterMode = true; filter(); 
    } else { 
      showErrorToast(res.error || 'Lỗi lưu dữ liệu'); navDisplay.textContent = 'Lỗi lưu'; navDisplay.className = '';
    }
  } catch(e) { showErrorToast('Lỗi mạng khi lưu'); navDisplay.textContent = 'Lỗi lưu'; }
}

async function del(){
  if(idx===-1) return;
  showWarningToast('Bạn có chắc muốn xóa?', 'Xác nhận xóa', 7000);
  const confirmToast = createToast('warning', 'Xác nhận xóa', 'Chờ 7 giây để xóa', 7000);
  
  const timeout = setTimeout(async () => {
    if(currentImageId) callAPI('deleteImage', { ImageID: currentImageId }); 
    try {
      const res = await callAPI('deleteQuestion', { QuestionID: ids[idx] });
      if(res && res.success){ showSuccessToast('Đã xóa!'); filter(); }
      else { showErrorToast(res.error || 'Lỗi xóa'); }
    } catch(e) { showErrorToast('Lỗi mạng'); }
  }, 7000);
  
  confirmToast.querySelector('.toast-close').onclick = () => { clearTimeout(timeout); confirmToast.remove(); showInfoToast('Đã hủy xóa'); };
}

// ==================== UPLOAD ẢNH ====================
function setupDragAndDrop(){
  ['dragenter','dragover','dragleave','drop'].forEach(e=>uploadButton.addEventListener(e,ev=>{ev.preventDefault();ev.stopPropagation();}));
  ['dragenter','dragover'].forEach(e=>uploadButton.addEventListener(e,()=>uploadButton.classList.add('dragover')));
  ['dragleave','drop'].forEach(e=>uploadButton.addEventListener(e,()=>uploadButton.classList.remove('dragover')));
  uploadButton.addEventListener('drop',e=>{if(e.dataTransfer.files.length && edit) handleImageFiles(e.dataTransfer.files);});
}
function handleImageUpload(event){if(event.target.files.length && edit) handleImageFiles(event.target.files);}
function handleImageFiles(files){
  if(!edit) return;
  const file=files[0];
  if(!file.type.startsWith('image/')){showErrorToast('Chỉ hỗ trợ file hình ảnh'); return;}
  uploadImage(file);
}
function uploadImage(file){
  if(file.size>5*1024*1024){showErrorToast('File quá lớn (tối đa 5MB)'); return;}
  const reader=new FileReader();
  reader.onload= async e=>{
    const base64=e.target.result.split(',')[1];
    navDisplay.textContent='Đang upload...'; icon.innerHTML='<i class="fas fa-spinner loading"></i>';
    try {
      const res = await callAPI('uploadImage', { name:file.name, type:file.type, base64:base64 });
      icon.innerHTML='';
      if(res && res.success){
        if(currentImageId && currentImageId !== res.url) callAPI('deleteImage', { ImageID: currentImageId });
        currentImageId = res.url || ''; updateUploadButton();
        showSuccessToast('Upload thành công!'); navDisplay.textContent='Upload thành công!'; navDisplay.className='success';
      } else {
        showErrorToast(`Lỗi upload: ${res.error || 'Không rõ'}`); navDisplay.textContent=`Lỗi upload`; navDisplay.className='';
      }
    } catch(err) { icon.innerHTML=''; showErrorToast('Lỗi mạng'); navDisplay.textContent='Lỗi mạng'; navDisplay.className=''; }
    setTimeout(()=>updateNav(),3000);
  };
  reader.readAsDataURL(file);
}
function updateUploadButton(){
  if(currentImageId){ uploadButton.classList.add('success'); uploadIcon.className='fas fa-check-circle'; }
  else{ uploadButton.classList.remove('success'); uploadIcon.className='fas fa-cloud-upload-alt'; }
}

function updateSaveStatus() { updateNav(); }

function updateNav() {
  const newBtn=document.getElementById('newBtn'), copyBtn=document.getElementById('copyBtn'), editBtn=document.getElementById('editBtn'), delBtn=document.getElementById('delBtn'), prev=document.getElementById('prevBtn'), next=document.getElementById('nextBtn');
  const saveBtn = document.getElementById('saveBtn'); 
  const btnFilter = document.getElementById('btnFilter'); 
  
  let baseText = '0/0';
  if (edit) {
      baseText = (idx === -1) ? (isCopyMode ? 'Bản sao' : 'Câu hỏi mới') : 'Đang sửa';
  } else {
      baseText = (idx !== -1) ? `${idx + 1}/${ids.length}` : (ids.length > 0 ? `0/${ids.length}` : 'Chưa có câu');
  }
  
  const validMsg = isFormValid();
  
  if (validMsg && edit) { 
    navDisplay.textContent = validMsg; 
    navDisplay.classList.add('!border-red-400', '!bg-red-50', '!text-red-600', '!text-[12px]');
    navDisplay.classList.remove('!border-blue-200', '!bg-blue-50/50', '!text-blue-600', '!text-[15px]');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.classList.add('opacity-40', 'cursor-not-allowed', 'text-gray-400');
      saveBtn.classList.remove('hover:bg-indigo-50', 'text-indigo-700');
    }
  } else { 
    navDisplay.textContent = baseText; 
    navDisplay.classList.add('!border-blue-200', '!bg-blue-50/50', '!text-blue-600', '!text-[15px]');
    navDisplay.classList.remove('!border-red-400', '!bg-red-50', '!text-red-600', '!text-[12px]');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'text-gray-400');
      saveBtn.classList.add('hover:bg-indigo-50', 'text-indigo-700');
    }
  }
  
  if(edit){
    newBtn.style.display='none'; copyBtn.style.display='none'; editBtn.style.display='none'; delBtn.style.display='none';
    if (saveBtn) saveBtn.style.display='flex'; 
    prev.style.display='none'; next.style.display='none';

    if (btnFilter) {
        btnFilter.disabled = true;
        btnFilter.classList.add('opacity-50', 'cursor-not-allowed');
        btnFilter.classList.remove('hover:shadow-md');
    }
  } 
  else if (idx === -1) {
    newBtn.style.display='flex'; copyBtn.style.display='none'; editBtn.style.display='none'; delBtn.style.display='none';
    if (saveBtn) saveBtn.style.display='none'; 
    prev.style.display='none'; next.style.display='none';

    if (btnFilter) {
        btnFilter.disabled = false;
        btnFilter.classList.remove('opacity-50', 'cursor-not-allowed');
        btnFilter.classList.add('hover:shadow-md');
    }
  }
  else {
    newBtn.style.display='flex'; copyBtn.style.display='flex'; editBtn.style.display='flex'; delBtn.style.display='flex';
    if (saveBtn) saveBtn.style.display='none'; 
    prev.style.display = idx === 0 ? 'none' : 'flex'; 
    next.style.display = idx === ids.length - 1 ? 'none' : 'flex';

    if (btnFilter) {
        btnFilter.disabled = false;
        btnFilter.classList.remove('opacity-50', 'cursor-not-allowed');
        btnFilter.classList.add('hover:shadow-md');
    }
  }
  
  document.querySelectorAll('#f textarea').forEach(el => el.disabled = !edit); 
  const imgUpl = document.getElementById('imageUpload');
  if (imgUpl) imgUpl.disabled = !edit; 
  document.querySelectorAll('#f select, #f input[name="searchKeyword"]').forEach(el => el.disabled = false);
}


function nav(dir){ if(dir===-2&&idx>0) idx--; else if(dir===2&&idx<ids.length-1) idx++; if(idx>=0&&idx<ids.length){ const page=Math.floor(idx/ITEMS_PER_PAGE)+1; if(page!==currentPage){ currentPage=page; loadPage(currentPage); updatePagination(); } loadQ(ids[idx]); } }

function newMode(){ currentImageId=''; currentQuestionId=''; isCopyMode=false; idx=-1; edit=true; filterMode=false; clearForm(); updateNav(); }
function copyMode(){ if(idx===-1) return; isCopyMode=true; currentQuestionId=''; idx=-1; edit=true; filterMode=false; updateNav(); }
function editMode(){ if(idx===-1) return; currentQuestionId=ids[idx]; isCopyMode=false; edit=true; filterMode=false; updateNav(); }

function updatePagination() {
  const paginationEl = document.getElementById('pagination');
  if (!paginationEl) return;

  const totalPages = Math.ceil(ids.length / ITEMS_PER_PAGE);
  if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

  let html = `
    <button onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''} title="Trang đầu"><i class="fas fa-angle-double-left"></i></button>
    <button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} title="Trang trước"><i class="fas fa-angle-left"></i></button>
    <span class="page-info">Trang ${currentPage} / ${totalPages}</span>
    <button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} title="Trang sau"><i class="fas fa-angle-right"></i></button>
    <button onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''} title="Trang cuối"><i class="fas fa-angle-double-right"></i></button>
  `;
  paginationEl.innerHTML = html;
}

function goToPage(page) {
  const totalPages = Math.ceil(ids.length / ITEMS_PER_PAGE);
  if (page < 1 || page > totalPages || page === currentPage) return;
  currentPage = page;
  loadPage(currentPage);
  updatePagination();
  const rightPanelContent = document.querySelector('.right-panel .panel-content');
  if (rightPanelContent) { rightPanelContent.scrollTo({ top: 0, behavior: 'smooth' }); }
}

function renderCurrentPage() { previewCards.innerHTML = '<em class="text-[#004c6d] opacity-60 text-center block w-full">Không có câu hỏi nào</em>'; }
function autoResize(t){t.style.height='auto';t.style.height=t.scrollHeight+'px';}

function updateFormImagePreview() {
  const imgPreview = document.getElementById('formImagePreview');
  const placeholder = document.getElementById('formImagePlaceholder');
  const removeBtn = document.getElementById('removeImageBtn');
  
  if (!imgPreview || !placeholder) return;

  if (currentImageId) {
    imgPreview.src = 'https://drive.google.com/thumbnail?id=' + currentImageId + '&sz=w1000';
    imgPreview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    if (edit) removeBtn.classList.remove('hidden');
    else removeBtn.classList.add('hidden');
  } else {
    imgPreview.src = '';
    imgPreview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    removeBtn.classList.add('hidden');
  }
}

function removeFormImage() {
  if (!edit) return;
  currentImageId = ''; 
  updateUploadButton(); 
  updateSaveStatus();
}

const originalUpdateUploadButton = updateUploadButton;
updateUploadButton = function() {
  originalUpdateUploadButton();
  updateFormImagePreview();
};

const originalUpdateNav = updateNav;
updateNav = function() {
  originalUpdateNav();
  updateFormImagePreview();
};