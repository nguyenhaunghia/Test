// ==================== LOGIC TRANG QUẢN LÝ ĐỀ ====================
let allTests = []; 
const $ = s => document.querySelector(s);

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

document.addEventListener('DOMContentLoaded', async () => {
    if(!requireLogin()) return; 
    if (typeof renderGlobalHeader === 'function') renderGlobalHeader();

    await loadMonHoc();
    await loadTatCaDe();
});

// 1. Tải danh sách môn học cho bộ lọc
async function loadMonHoc() {
    try {
        const res = await callAPI('getMonList');
        const sel = $('#filterSubject');
        if (res && res.success && res.data) {
            res.data.forEach(item => {
                sel.add(new Option(item.SubjectName, item.SubjectID));
            });
        }
    } catch (e) { console.error("Lỗi tải môn học: ", e); }
}

// 2. Tải toàn bộ danh sách Đề từ sheet "Test"
async function loadTatCaDe() {
    toggleLoading(true, "Đang tải dữ liệu đề thi...");
    try {
        const res = await callAPI('getTestList', { _t: new Date().getTime() });
        if (res && res.success) {
            allTests = res.data || [];
            // Sắp xếp đề mới nhất lên đầu (dựa vào TimeUpdate)
            allTests.sort((a, b) => new Date(b.TimeUpdate || 0) - new Date(a.TimeUpdate || 0));
            renderTests(allTests);
        } else {
            showToast(res.error || 'Không tải được danh sách đề', 'error');
        }
    } catch (e) {
        showToast('Lỗi kết nối mạng', 'error');
    } finally {
        toggleLoading(false);
    }
}

// 3. Hàm hiển thị danh sách Đề ra UI (CLONE 100% GIAO DIỆN THEO ẢNH MẪU)

function renderTests(testsArray) {
    const grid = $('#testGrid');
    const emptyState = $('#emptyState');
    
    grid.innerHTML = '';
    
    if (!testsArray || testsArray.length === 0) {
        grid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');

    testsArray.forEach(test => {
        const testID = test.TestID || '---';
        const topic = test.TestTopics || test.TestTopic || 'Đề thi chưa có tên';
        const mon = test.SubjectID || '---';
        const block = test.BlockID || '---';
        const totalQ = test.Total || test.NumberQuestions || 0;
        const duration = test.Duration || 0;
        const isEnable = String(test.Enable).toLowerCase() === 'yes';
        const ghiChu = test.Note || "Chưa có ghi chú cụ thể cho đề này.";
        
        // Phân biệt format Thực hành / Trắc nghiệm
        const isTH = String(testID).startsWith('TH');
        
        // Format thời gian
        const ngayHienThi = test.TimeUpdate 
            ? new Date(test.TimeUpdate).toLocaleString('vi-VN', {day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'}) 
            : '--';

        // Badge trạng thái theo chuẩn gbai.js
        const hieuLucLabel = isEnable ? 'ENABLE' : 'DISABLE';
        const hieuLucClass = isEnable ? 'text-[#10b981] bg-[#d1fae5] border-[#10b981]' : 'text-[#fb7185] bg-[#ffe4e6] border-[#fb7185]';

        const card = document.createElement('div');
        card.className = 'card-glass flex flex-col h-full';
        
        // Cột trái: Thông số (Specs)
        const specsHTML = `
           <div class="flex justify-between items-center mb-2">
              <span class="text-[#00b5e2] font-bold text-[11px] uppercase tracking-wider">Code</span>
              <span class="font-mono text-[#f59e0b] font-black bg-[#fef3c7] border border-[#fde68a] px-2 py-0.5 rounded">${testID}</span>
           </div>
           <div class="flex justify-between items-center mb-2">
              <span class="text-[#00b5e2] font-bold text-[11px] uppercase tracking-wider">Môn - Khối</span>
              <span class="text-[#004c6d] font-bold text-[13px]">${mon} - ${block}</span>
           </div>
           ${!isTH ? `
           <div class="flex justify-between items-center mb-2">
              <span class="text-[#00b5e2] font-bold text-[11px] uppercase tracking-wider">Số câu</span>
              <span class="text-[#004c6d] font-bold text-[13px]">${totalQ}</span>
           </div>
           <div class="flex justify-between items-center mb-2">
              <span class="text-[#00b5e2] font-bold text-[11px] uppercase tracking-wider">Thời lượng</span>
              <span class="text-[#004c6d] font-bold text-[13px]">${duration} phút</span>
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

        // Lắp ráp toàn bộ Card
        card.innerHTML = `
          <div class="mb-4 pb-3 border-b border-[#e0f2fe]">
            <h3 class="text-lg font-black text-[#004c6d] leading-snug line-clamp-1" title="${topic}">${topic}</h3>
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
               
               <div class="flex gap-2 justify-end mt-auto flex-wrap">
                  <button class="px-3 py-2 rounded-xl font-semibold text-[13px] inline-flex items-center justify-center flex-1 md:flex-none gap-1.5 bg-[#f0f9ff] text-[#00b5e2] hover:bg-[#00b5e2] hover:text-white transition-all border border-[#e0f2fe] shadow-sm hover:shadow-md" onclick="editTest('${testID}')" title="Sửa đề">
                    <i class="fas fa-pen"></i> Sửa
                  </button>
                  <button class="px-3 py-2 rounded-xl font-semibold text-[13px] inline-flex items-center justify-center flex-1 md:flex-none gap-1.5 bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-100 shadow-sm hover:shadow-md" onclick="duplicateTest('${testID}')" title="Nhân bản đề">
                    <i class="fas fa-copy"></i> Nhân bản
                  </button>
                  <button class="px-3 py-2 rounded-xl font-semibold text-[13px] inline-flex items-center justify-center flex-1 md:flex-none gap-1.5 bg-[rgba(251,113,133,0.1)] text-[#fb7185] border border-[rgba(251,113,133,0.3)] hover:bg-[#fb7185] hover:text-white shadow-sm hover:shadow-[0_4px_12px_rgba(251,113,133,0.3)] transition-all" onclick="deleteTest(this, '${testID}')" title="Xóa đề này">
                    <i class="fas fa-trash-alt"></i> Xóa
                  </button>
               </div>
            </div>
          </div>
        `;
        grid.appendChild(card);
    });
}

// 4. Lọc dữ liệu trên Giao diện
function filterTests() {
    const subjectID = $('#filterSubject').value;
    const keyword = $('#filterKeyword').value.trim().toLowerCase();
    
    let filtered = allTests;
    
    if (subjectID) {
        filtered = filtered.filter(t => t.SubjectID === subjectID);
    }
    
    if (keyword) {
        filtered = filtered.filter(t => 
            (t.TestID && t.TestID.toLowerCase().includes(keyword)) ||
            (t.TestTopics && t.TestTopics.toLowerCase().includes(keyword))
        );
    }
    
    renderTests(filtered);
}

// =========================================================================
// HỘP THOẠI XÁC NHẬN XÓA (GLASSMORPHISM ĐỒNG BỘ HỆ THỐNG)
// =========================================================================
function showDeleteConfirmModal(onConfirm, testID) {
    let modal = document.getElementById('customDeleteModal');
    
    if (!modal) {
        const modalHtml = `
        <div id="customDeleteModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 opacity-0 hidden">
            <div class="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-7 w-[90%] max-w-[340px] transform scale-95 transition-all duration-300">
                <h3 class="text-[19px] font-bold text-[#004c6d] text-center mb-2">Xác nhận xóa Đề thi</h3>
                <p id="deleteModalDesc" class="text-[13px] text-[#00b5e2] text-center mb-7 leading-relaxed font-medium"></p>
                <div class="flex items-center justify-center gap-4">
                    <button id="btnCancelDelete" class="flex-1 py-2.5 rounded-xl font-bold text-[#004c6d] bg-gray-200/80 hover:bg-gray-300 transition-colors shadow-sm">Hủy</button>
                    <button id="btnConfirmDelete" class="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.4)] transition-all transform hover:-translate-y-0.5">Xóa Đề</button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('customDeleteModal');
    }

    const modalBox = modal.querySelector('div > div');
    const btnCancel = document.getElementById('btnCancelDelete');
    const btnConfirm = document.getElementById('btnConfirmDelete');
    const desc = document.getElementById('deleteModalDesc');

    // Chèn mã đề vào thông báo cho rõ ràng
    desc.innerHTML = `Bạn có chắc chắn muốn xóa toàn bộ dữ liệu của đề thi <strong class="text-red-500">${testID}</strong>?<br>Hành động này không thể hoàn tác.`;

    modal.classList.remove('hidden');
    void modal.offsetWidth; 
    modal.classList.remove('opacity-0');
    modalBox.classList.remove('scale-95');
    modalBox.classList.add('scale-100');

    const closeModal = () => {
        modal.classList.add('opacity-0');
        modalBox.classList.remove('scale-100');
        modalBox.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    };

    btnCancel.onclick = closeModal;
    btnConfirm.onclick = () => {
        closeModal();
        if (typeof onConfirm === 'function') onConfirm();
    };
}


// =========================================================================
// CÁC HÀM XỬ LÝ NÚT BẤM GỌI API SERVER
// =========================================================================

function editTest(testID) {
    showToast(`Đang mở giao diện sửa đề: ${testID}...`, 'info');
    // window.open(`suade.html?id=${testID}`, '_blank');
}

function duplicateTest(testID) {
    // Chuyển sang dùng Confirm Modal thay vì confirm mặc định cho đẹp
    showDeleteConfirmModal(async () => {
        toggleLoading(true, "Đang nhân bản đề...");
        try {
            const res = await callAPI('duplicateTest', { TestID: testID });
            toggleLoading(false);
            if(res && res.success) {
                showSuccessToast('Nhân bản đề thành công!');
                loadTatCaDe(); 
            } else {
                showErrorToast(res.error || 'Lỗi nhân bản');
            }
        } catch(e) { 
            toggleLoading(false); 
            showErrorToast('Lỗi kết nối mạng!'); 
        }
    }, testID);
    
    // Đổi text trong Modal cho phù hợp với Nhân bản
    document.getElementById('customDeleteModal').querySelector('h3').innerText = "Xác nhận Nhân bản";
    document.getElementById('deleteModalDesc').innerHTML = `Bạn muốn tạo một bản sao cho đề thi <strong class="text-indigo-600">${testID}</strong>?`;
    const btnCnf = document.getElementById('btnConfirmDelete');
    btnCnf.innerText = "Nhân bản";
    btnCnf.className = "flex-1 py-2.5 rounded-xl font-bold text-white bg-indigo-500 hover:bg-indigo-600 shadow-[0_4px_15px_rgba(99,102,241,0.4)] transition-all transform hover:-translate-y-0.5";
}

function deleteTest(btnElement, testID) {
    // Trả lại UI mặc định của Modal Xóa đề phòng trường hợp trước đó vừa ấn nút Nhân Bản
    const cnfBtn = document.getElementById('btnConfirmDelete');
    if (cnfBtn) {
        cnfBtn.innerText = "Xóa Đề";
        cnfBtn.className = "flex-1 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.4)] transition-all transform hover:-translate-y-0.5";
        document.getElementById('customDeleteModal').querySelector('h3').innerText = "Xác nhận Xóa Đề thi";
    }

    showDeleteConfirmModal(async () => {
        toggleLoading(true, "Đang xóa đề...");
        try {
            const res = await callAPI('deleteTest', { TestID: testID });
            toggleLoading(false);
            if(res && res.success) {
                showSuccessToast('Đã xóa đề thành công!');
                
                // XÓA TỨC THÌ TRÊN GIAO DIỆN, HIỆU ỨNG THU NHỎ RỒI BIẾN MẤT
                const card = btnElement.closest('.test-card');
                if (card) {
                    card.style.transform = 'scale(0.9)';
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.remove();
                        // Kiểm tra xem trên màn hình còn cái thẻ nào không
                        const grid = $('#testGrid');
                        if (grid.children.length === 0) {
                            grid.classList.add('hidden');
                            $('#emptyState').classList.remove('hidden');
                        }
                    }, 300);
                }
            } else {
                showErrorToast(res.error || 'Lỗi khi xóa');
            }
        } catch (e) {
            toggleLoading(false);
            showErrorToast('Lỗi kết nối mạng!');
        }
    }, testID);
}