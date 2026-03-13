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
    
    // Render Header chung của hệ thống (nếu có hàm renderGlobalHeader trong script.js)
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
        // Gọi API lấy toàn bộ list Test (Cần đảm bảo backend bạn có API này)
        const res = await callAPI('getTestList', { _t: new Date().getTime() });
        if (res && res.success) {
            allTests = res.data || [];
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
        const totalQ = test.Total || test.NumberQuestions || 0;
        const duration = test.Duration || 0;
        const isEnable = String(test.Enable).toLowerCase() === 'yes';
        const timeUpdate = test.TimeUpdate ? test.TimeUpdate.substring(0, 16) : 'Chưa cập nhật';

        // Badge trạng thái
        const statusBadge = isEnable 
            ? `<span class="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-md border border-emerald-200"><i class="fas fa-check-circle mr-1"></i>Hoạt động</span>`
            : `<span class="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-md border border-slate-200"><i class="fas fa-lock mr-1"></i>Đã khóa</span>`;

        const card = document.createElement('div');
        card.className = 'glass-panel p-5 test-card flex flex-col h-full relative overflow-hidden group';
        card.innerHTML = `
            <div class="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-100 to-transparent opacity-50 rounded-bl-full z-0"></div>
            
            <div class="flex justify-between items-start mb-3 z-10">
                <span class="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">${testID}</span>
                ${statusBadge}
            </div>
            
            <h3 class="text-lg font-bold text-[#004c6d] mb-1 line-clamp-2 leading-snug z-10" title="${topic}">${topic}</h3>
            <div class="text-[12px] text-slate-500 font-medium mb-4 flex items-center gap-2 z-10">
                <i class="fas fa-book-open text-blue-300"></i> Môn: <span class="text-[#00b5e2]">${mon}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-3 mb-5 z-10">
                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center"><i class="fas fa-cubes"></i></div>
                    <div>
                        <div class="text-[10px] text-slate-400 uppercase font-bold">Câu hỏi</div>
                        <div class="text-sm font-bold text-slate-700">${totalQ}</div>
                    </div>
                </div>
                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center"><i class="fas fa-stopwatch"></i></div>
                    <div>
                        <div class="text-[10px] text-slate-400 uppercase font-bold">Thời gian</div>
                        <div class="text-sm font-bold text-slate-700">${duration}p</div>
                    </div>
                </div>
            </div>

            <div class="text-[11px] text-slate-400 mb-4 z-10 mt-auto"><i class="far fa-clock mr-1"></i> Cập nhật: ${timeUpdate}</div>
            
            <div class="flex items-center gap-2 border-t border-slate-100 pt-4 z-10">
                <button onclick="editTest('${testID}')" class="flex-1 py-2 bg-blue-50 hover:bg-[#00b5e2] text-[#00b5e2] hover:text-white rounded-lg text-sm font-bold transition-colors">
                    <i class="fas fa-pen mr-1"></i> Sửa
                </button>
                <button onclick="duplicateTest('${testID}')" class="flex-1 py-2 bg-indigo-50 hover:bg-indigo-500 text-indigo-500 hover:text-white rounded-lg text-sm font-bold transition-colors">
                    <i class="fas fa-copy mr-1"></i> Nhân bản
                </button>
                <button onclick="deleteTest('${testID}')" class="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-colors" title="Xóa đề này">
                    <i class="fas fa-trash-alt"></i>
                </button>
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
// CÁC HÀM XỬ LÝ NÚT BẤM (CẦN BACKEND HỖ TRỢ ĐỂ CHẠY THẬT)
// =========================================================================

function editTest(testID) {
    // Tạm thời hiển thị Toast. Về sau có thể làm Modal hoặc chuyển sang trang Sửa đề riêng.
    showToast(`Đang mở giao diện sửa đề: ${testID}...`, 'info');
    // window.open(`suade.html?id=${testID}`, '_blank');
}

function duplicateTest(testID) {
    if(!confirm(`Bạn muốn NHÂN BẢN đề thi ${testID} không?`)) return;
    
    toggleLoading(true, "Đang nhân bản đề...");
    // Gọi API duplicateTest ở Backend (Bạn cần viết hàm này trong Code.gs)
    callAPI('duplicateTest', { TestID: testID }).then(res => {
        toggleLoading(false);
        if(res && res.success) {
            showToast('Nhân bản thành công!', 'success');
            loadTatCaDe(); // Tải lại danh sách
        } else {
            showToast(res.error || 'Lỗi nhân bản', 'error');
        }
    }).catch(e => { toggleLoading(false); showToast('Lỗi kết nối', 'error'); });
}

function deleteTest(testID) {
    if(!confirm(`⚠️ CẢNH BÁO: Bạn có chắc muốn XÓA VĨNH VIỄN đề thi ${testID} không?`)) return;

    toggleLoading(true, "Đang xóa đề...");
    // Gọi API deleteTest ở Backend (Bạn cần viết hàm này trong Code.gs)
    callAPI('deleteTest', { TestID: testID }).then(res => {
        toggleLoading(false);
        if(res && res.success) {
            showToast('Đã xóa đề thành công!', 'success');
            loadTatCaDe(); // Tải lại danh sách
        } else {
            showToast(res.error || 'Lỗi khi xóa', 'error');
        }
    }).catch(e => { toggleLoading(false); showToast('Lỗi kết nối', 'error'); });
}