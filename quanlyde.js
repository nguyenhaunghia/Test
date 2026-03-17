// ==================== LOGIC TRANG QUẢN LÝ ĐỀ ====================
let allTests = []; 
let subjectMap = {}; // Từ điển ánh xạ ID Môn -> Tên Môn
let blockMap = {};   // Từ điển ánh xạ ID Khối -> Tên Khối

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

    // Chạy song song việc tải cấu hình (Môn, Khối) để tiết kiệm thời gian
    await Promise.all([
        loadMonHoc(),
        loadKhoiHoc()
    ]);
    
    // Sau khi có từ điển Môn/Khối thì mới tải Đề
    await loadTatCaDe();
});

// 1. Tải danh sách môn học & Tạo bộ ánh xạ (Map)
async function loadMonHoc() {
    try {
        const res = await callAPI('getMonList');
        const sel = $('#filterSubject');
        const editMonSel = $('#editMon'); // Lấy thêm thẻ select trong Modal Edit
        
        if (res && res.success && res.data) {
            res.data.forEach(item => {
                const subjID = item.SubjectID;
                const subjName = item.SubjectName || subjID;
                
                subjectMap[subjID] = subjName; // Lưu vào từ điển
                
                // Đổ vào Dropdown Lọc
                if(sel) sel.add(new Option(subjName, subjID));
                
                // Đổ vào Dropdown trong Modal Edit (Lưu SubjectID nhưng hiển thị SubjectName)
                if(editMonSel) editMonSel.add(new Option(subjName, subjID));
            });
        }
    } catch (e) { console.error("Lỗi tải môn học: ", e); }
}

// 1b. Tải danh sách Khối học & Tạo bộ ánh xạ (Map)
async function loadKhoiHoc() {
    try {
        // Đã sửa lại đúng tên API của bạn là 'getKhoiList' thay vì 'getBlockList'
        const res = await callAPI('getKhoiList'); 
        const editKhoiSel = $('#editKhoi'); // Lấy thẻ select Khối trong Modal
        
        if (res && res.success && res.data) {
            res.data.forEach(item => {
                const blockID = item.BlockID;
                const blockName = item.BlockName || blockID;
                
                blockMap[blockID] = blockName; // Lưu từ điển để dịch tên ở màn hình chính
                
                // Đổ vào Dropdown trong Modal Edit (Hiển thị Tên Khối, Lưu BlockID)
                if (editKhoiSel) editKhoiSel.add(new Option(blockName, blockID));
            });
        }
    } catch (e) { 
        console.log("Bỏ qua tải Khối hoặc lỗi: ", e); 
    }
}

// 2. Tải toàn bộ danh sách Đề từ sheet "Test"
async function loadTatCaDe() {
    toggleLoading(true, "Đang tải dữ liệu đề thi...");
    try {
        const res = await callAPI('getTestList', { _t: new Date().getTime() });
        if (res && res.success) {
            allTests = res.data || [];
            // Sắp xếp đề mới nhất lên đầu dựa vào cột TimeUpdate
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

// 3. Hàm hiển thị danh sách Đề ra UI
function renderTests(testsArray) {
    const grid = $('#testGrid');
    const emptyState = $('#emptyState');
    
    grid.innerHTML = '';
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';
    
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
        
        const isTH = String(testID).startsWith('TH');
        
        // Đã sửa: Lấy trực tiếp số phút
        const durationMin = parseInt(test.Duration) || 0; 
        
        const isEnable = String(test.Enable).toLowerCase() === 'yes';
        const ghiChu = test.Note || "Chưa có ghi chú cụ thể cho đề này.";
        
        const ngayHienThi = test.TimeUpdate 
            ? new Date(test.TimeUpdate).toLocaleString('vi-VN', {day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'}) 
            : '--';

        const statusIcon = isEnable 
            ? '<i class="fas fa-unlock text-teal-500 text-lg" title="Đang mở khóa (Hoạt động)"></i>' 
            : '<i class="fas fa-lock text-rose-500 text-lg" title="Đã khóa"></i>';

        const card = document.createElement('div');
        card.className = 'flex flex-col h-full rounded-[32px] p-6 bg-[#eaf6ff] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,181,226,0.15)]';
        
        const specsHTML = `
           <div class="flex justify-between items-center mb-2">
              <span class="text-slate-400 font-bold text-[12px] uppercase tracking-wider">Mã đề</span>
              <span class="font-bold text-amber-500 text-[13px]">${testID}</span>
           </div>
           <div class="flex justify-between items-center mb-2">
              <span class="text-slate-400 font-bold text-[12px] uppercase tracking-wider">Môn - Khối</span>
              <span class="font-bold text-sky-500 text-[13px]">${mon} - ${block}</span>
           </div>
           ${!isTH ? `
           <div class="flex justify-between items-center mb-2">
              <span class="text-slate-400 font-bold text-[12px] uppercase tracking-wider">Số câu</span>
              <span class="font-bold text-violet-500 text-[13px]">${totalQ} câu</span>
           </div>
           <div class="flex justify-between items-center mb-2">
              <span class="text-slate-400 font-bold text-[12px] uppercase tracking-wider">Thời lượng</span>
              <span class="font-bold text-emerald-500 text-[13px]">${durationMin} phút</span>
           </div>
           ` : ''}
        `;

        card.innerHTML = `
          <div class="mb-5 pb-4 border-b border-sky-200/60">
            <h3 class="text-[17px] font-extrabold text-slate-800 leading-snug line-clamp-2 uppercase text-center" title="${topic}">${topic}</h3>
          </div>
          <div class="flex flex-col flex-grow gap-4">
            <div class="flex flex-col">${specsHTML}</div>
            <div class="bg-white/50 rounded-2xl p-4 flex-grow">
               <p class="text-slate-500 text-[13px] leading-relaxed italic line-clamp-3">
                  <i class="fas fa-quote-left text-sky-300 text-base mr-1.5 opacity-80"></i>${ghiChu}
               </p>
            </div>
          </div>
          <div class="flex justify-between items-center mt-5 pt-3 border-t border-sky-200/60">
              <div class="flex items-center gap-4">
                  ${statusIcon}
                  <div class="flex items-center gap-1.5 text-slate-500 text-[12px] font-medium" title="Cập nhật lúc">
                      <i class="far fa-clock text-slate-400 text-sm"></i><span>${ngayHienThi}</span>
                  </div>
              </div>
              <div class="flex justify-end gap-2.5">
                  <button class="w-9 h-9 flex items-center justify-center bg-cyan-100 text-cyan-600 rounded-full text-sm hover:bg-cyan-200 transition-colors shadow-sm hover:-translate-y-0.5" onclick="editTest('${testID}')" title="Sửa đề"><i class="fas fa-pen"></i></button>
                  <button class="w-9 h-9 flex items-center justify-center bg-violet-100 text-violet-600 rounded-full text-sm hover:bg-violet-200 transition-colors shadow-sm hover:-translate-y-0.5" onclick="duplicateTest('${testID}')" title="Nhân bản đề"><i class="fas fa-copy"></i></button>
                  <button class="w-9 h-9 flex items-center justify-center bg-rose-100 text-rose-500 rounded-full text-sm hover:bg-rose-200 transition-colors shadow-sm hover:-translate-y-0.5" onclick="deleteTest(this, '${testID}')" title="Xóa đề này"><i class="fas fa-trash-alt"></i></button>
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
// HỘP THOẠI XÁC NHẬN XÓA (GLASSMORPHISM PASTEL)
// =========================================================================
function showDeleteConfirmModal(onConfirm, testID) {
    let modal = document.getElementById('customDeleteModal');
    
    if (!modal) {
        const modalHtml = `
        <div id="customDeleteModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 opacity-0 hidden">
            <div class="bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-7 w-[90%] max-w-[340px] transform scale-95 transition-all duration-300">
                <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-4 text-xl">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="text-[19px] font-bold text-slate-800 text-center mb-2">Xác nhận thao tác</h3>
                <p id="deleteModalDesc" class="text-[13px] text-slate-500 text-center mb-7 leading-relaxed font-medium"></p>
                <div class="flex items-center justify-center gap-3">
                    <button id="btnCancelDelete" class="flex-1 py-2.5 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors shadow-sm">Hủy</button>
                    <button id="btnConfirmDelete" class="flex-1 py-2.5 rounded-2xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-[0_4px_15px_rgba(244,63,94,0.4)] transition-all transform hover:-translate-y-0.5">Xác nhận</button>
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

    desc.innerHTML = `Bạn có chắc chắn muốn xóa toàn bộ dữ liệu của đề thi <strong class="text-rose-500">${testID}</strong>?<br>Hành động này không thể hoàn tác.`;

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

// =========================================================================
// LOGIC MODAL CHỈNH SỬA ĐỀ THI (EDIT MODAL)
// =========================================================================

function closeEditModal() {
    const modal = document.getElementById('editTestModal');
    const modalBox = modal.querySelector('div > div');
    modal.classList.add('opacity-0');
    modalBox.classList.remove('scale-100');
    modalBox.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// Hàm mở Modal và Tải dữ liệu Đề 
async function editTest(testID) {
    toggleLoading(true, "Đang tải dữ liệu đề...");
    try {
        const res = await callAPI('getMaDeInfoById', { maDeId: testID });
        toggleLoading(false);
        
        if (res && res.success) {
            const data = res.data;
            
            // Đổ dữ liệu vào Form
            $('#editMaDe').value = testID;
            $('#editEnable').value = data.hieuLuc || 'Yes';
            $('#editMon').value = data.mon || ''; 
            $('#editKhoi').value = data.khoi || '';
            $('#editChuDe').value = data.chuDe || '';
            
            // FIX: Nạp đúng thời lượng (Không nhân/chia 60 nữa)
            $('#editThoiLuong').value = data.thoiLuong ? parseInt(data.thoiLuong) : 0; 

            $('#editGhiChu').value = data.ghiChu || '';
            
            // Nạp Số câu bốc ra làm (từ mảng allTests đã tải lúc đầu)
            const testRow = allTests.find(t => t.TestID === testID);
            $('#editSoCauHoi').value = testRow ? (testRow.NumberQuestions || 0) : 0;

            // Xây dựng List Checkbox trực quan từ chuỗi ID
            renderEditCheckboxes(data.ids);

            // Mở Modal
            const modal = document.getElementById('editTestModal');
            const modalBox = modal.querySelector('div > div');
            modal.classList.remove('hidden');
            void modal.offsetWidth; 
            modal.classList.remove('opacity-0');
            modalBox.classList.remove('scale-95');
            modalBox.classList.add('scale-100');
        } else {
            showToast(res.error || 'Lỗi tải dữ liệu', 'error');
        }
    } catch (e) {
        toggleLoading(false);
        showToast('Lỗi kết nối hệ thống', 'error');
    }
}

// Xây dựng Checkbox: Bỏ check sẽ làm mờ đi chứ không biến mất
function renderEditCheckboxes(idsString) {
    const qList = (idsString || '').split(',').map(id => id.trim()).filter(Boolean);
    
    $('#editTongSoCau').innerText = qList.length;
    const container = $('#editCheckboxContainer');
    container.innerHTML = '';
    
    if(qList.length === 0) {
        container.innerHTML = '<span class="text-xs text-slate-400 italic">Hiện tại chưa có câu hỏi nào trong danh sách.</span>';
        return;
    }

    qList.forEach(qID => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 shadow-sm';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = qID;
        checkbox.checked = true;
        checkbox.className = 'w-4 h-4 text-sky-500 bg-white border-sky-300 rounded focus:ring-sky-400 focus:ring-2 cursor-pointer';
        
        // FIX: Khi bỏ check chỉ làm mờ đi để người dùng có thể check lại
        checkbox.onchange = function() {
            if(!this.checked) {
                label.classList.add('opacity-40', 'bg-slate-100', 'grayscale');
                label.classList.remove('bg-sky-50');
            } else {
                label.classList.remove('opacity-40', 'bg-slate-100', 'grayscale');
                label.classList.add('bg-sky-50');
            }
            // Đếm lại tổng số câu thực tế đang được check
            const currentCount = document.querySelectorAll('#editCheckboxContainer input[type="checkbox"]:checked').length;
            $('#editTongSoCau').innerText = currentCount;
        };

        const span = document.createElement('span');
        span.className = 'text-[13px] font-mono font-bold text-sky-700 pt-0.5';
        span.innerText = qID;

        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
}

// LƯU ĐỀ THI
async function saveEditTest() {
    const maDeId = $('#editMaDe').value;
    if(!maDeId) return;

    // Lấy tất cả Checkbox đang được check
    const checkedBoxes = document.querySelectorAll('#editCheckboxContainer input[type="checkbox"]:checked');
    const checkedIds = Array.from(checkedBoxes).map(cb => cb.value);
    
    const tongSoCau = checkedIds.length;
    const soCauBocRa = parseInt($('#editSoCauHoi').value || 0);

    // FIX: Ràng buộc logic Số câu phải làm <= Số câu có trong list
    if (soCauBocRa > tongSoCau) {
        showToast(`Lỗi: Số câu bốc ra làm (${soCauBocRa}) không được lớn hơn tổng số câu đã chọn (${tongSoCau})!`, 'error');
        $('#editSoCauHoi').focus();
        return; // Dừng lại không cho lưu
    }

    const payload = {
        maDeId: maDeId,
        mon: $('#editMon').value,
        khoi: $('#editKhoi').value,
        chuDeOnTap: $('#editChuDe').value, 
        thoiLuong: parseInt($('#editThoiLuong').value || 0), 
        danhSachId: checkedIds.join(', '), 
        ghiChu: $('#editGhiChu').value,
        soCauHoi: soCauBocRa, 
        tongSoCau: tongSoCau, 
        hieuLuc: $('#editEnable').value
    };

    // Có Spinner hoạt họa (Chặn tương tác khi đang lưu)
    toggleLoading(true, "Đang lưu hệ thống...");
    try {
        const res = await callAPI('updateMaDe', payload);
        toggleLoading(false);
        if(res && res.success) {
            showToast('Lưu cấu hình đề thi thành công!', 'success'); // Toast xanh
            closeEditModal();
            loadTatCaDe(); // Tự động load lại bảng để thấy kết quả
        } else {
            showToast(res.error || 'Lỗi khi lưu', 'error'); // Toast đỏ
        }
    } catch (e) {
        toggleLoading(false);
        showToast('Lỗi kết nối mạng', 'error');
    }
}

// XÓA ĐỀ THI
function deleteTest(btnElement, testID) {
    const cnfBtn = document.getElementById('btnConfirmDelete');
    if (cnfBtn) {
        const iconBox = document.getElementById('customDeleteModal').querySelector('.rounded-full');
        iconBox.className = "w-12 h-12 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-4 text-xl";
        iconBox.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';

        cnfBtn.innerText = "Xóa Đề";
        cnfBtn.className = "flex-1 py-2.5 rounded-2xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-[0_4px_15px_rgba(244,63,94,0.4)] transition-all transform hover:-translate-y-0.5";
    }

    showDeleteConfirmModal(async () => {
        toggleLoading(true, "Đang xóa đề khỏi hệ thống...");
        try {
            // FIX: Gọi chính xác API 'deleteMaDe' và key 'maDeId' khớp với Google Sheet
            const res = await callAPI('deleteMaDe', { maDeId: testID });
            toggleLoading(false);
            
            if(res && res.success) {
                showToast('Đã xóa đề thành công!', 'success');
                
                // Hiệu ứng xóa Card
                const card = btnElement.closest('.flex-col');
                if (card) {
                    card.style.transform = 'scale(0.9)';
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.remove();
                        const grid = $('#testGrid');
                        if (grid.children.length === 0) {
                            grid.classList.add('hidden');
                            $('#emptyState').classList.remove('hidden');
                        }
                    }, 300);
                }
            } else {
                showToast(res.error || 'Lỗi khi xóa', 'error');
            }
        } catch (e) {
            toggleLoading(false);
            showToast('Lỗi kết nối mạng!', 'error');
        }
    }, testID);
}

// =========================================================================
// LOGIC MODAL NHÂN BẢN ĐỀ THI (COPY MODAL)
// =========================================================================

let currentCopyTestId = ''; // Biến toàn cục lưu ID đang được chọn để copy

function closeCopyModal() {
    const modal = document.getElementById('copyTestModal');
    const modalBox = modal.querySelector('div > div');
    modal.classList.add('opacity-0');
    modalBox.classList.remove('scale-100');
    modalBox.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// Mở Modal thay vì gọi thẳng API như cũ
function duplicateTest(testID) {
    currentCopyTestId = testID;
    
    // Reset checkbox
    $('#cbCopyQuestions').checked = false;
    $('#copyTargetId').innerText = testID;
    
    const modal = document.getElementById('copyTestModal');
    const modalBox = modal.querySelector('div > div');
    modal.classList.remove('hidden');
    void modal.offsetWidth; 
    modal.classList.remove('opacity-0');
    modalBox.classList.remove('scale-95');
    modalBox.classList.add('scale-100');
}

// Bấm nút "Thực hiện" trên Modal Copy
async function executeCopyTest() {
    const copyQuestions = $('#cbCopyQuestions').checked;
    
    closeCopyModal();
    toggleLoading(true, copyQuestions ? "Đang nhân bản Đề và toàn bộ Câu hỏi..." : "Đang nhân bản Đề thi...");
    
    try {
        // Gọi API MỚI HOÀN TOÀN: duplicateTestAndQuestions
        const res = await callAPI('duplicateTestAndQuestions', { 
            testID: currentCopyTestId, 
            copyQuestions: copyQuestions 
        });
        
        toggleLoading(false);
        if (res && res.success) {
            showToast(`Nhân bản thành công! Mã đề mới: ${res.newTestId}`, 'success');
            loadTatCaDe(); // Tải lại danh sách để hiện đề mới
        } else {
            showToast(res.error || 'Lỗi khi nhân bản', 'error');
        }
    } catch (e) {
        toggleLoading(false);
        showToast('Lỗi kết nối mạng!', 'error');
    }
}



