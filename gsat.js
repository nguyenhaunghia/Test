// ==================== LOGIC GIÁM SÁT HỌC TẬP ====================
let allUsers = [];
let allLogs = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireLogin()) return; // Hàm từ script.js
    
    const role = (currentUser.Permissions || '').toLowerCase();
    const obj = (currentUser.Object || '').toLowerCase();
    const isGV = obj.includes('giáo viên') || obj.includes('gv') || role.includes('admin') || role.includes('giáo viên');
    if (!isGV) {
        showToast("Bạn không có quyền truy cập trang này!", "error");
        setTimeout(() => chuyenTrang('index'), 1500);
        return;
    }

    initDateDropdown();
    await loadInitialData();
});

function initDateDropdown() {
    const select = document.getElementById('dateSelect');
    select.innerHTML = '';
    const today = new Date();
    
    for (let i = 0; i <= 15; i++) {
        let d = new Date(today);
        d.setDate(d.getDate() - i);
        
        let day = String(d.getDate()).padStart(2, '0');
        let month = String(d.getMonth() + 1).padStart(2, '0');
        let year = d.getFullYear();
        let dateStr = `${day}/${month}/${year}`;
        
        let label = i === 0 ? `Hôm nay - ${dateStr}` : (i === 1 ? `Hôm qua - ${dateStr}` : dateStr);
        select.innerHTML += `<option value="${dateStr}">${label}</option>`;
    }
}

async function loadInitialData() {
    toggleLoading(true, "Đang tải dữ liệu gốc...");
    try {
        const res = await callAPI('getGiamSatData', { date: document.getElementById('dateSelect').value });
        toggleLoading(false);
        if (res.success) {
            allUsers = res.users || (res.data && res.data.users) || [];
            allLogs = res.logs || (res.data && res.data.logs) || [];
            
            const classes = [...new Set(allUsers.map(u => u.ClassID).filter(Boolean))].sort();
            const classSelect = document.getElementById('classSelect');
            classSelect.innerHTML = '<option value="">-- Lớp --</option>';
            classes.forEach(c => classSelect.innerHTML += `<option value="${c}">Lớp ${c}</option>`);
        } else {
            showToast(res.error || "Lỗi tải dữ liệu", "error");
        }
    } catch (e) {
        console.error("Lỗi Frontend:", e);
        showToast("Lỗi kết nối máy chủ", "error");
        toggleLoading(false);
    }
}

async function fetchDataGiamSat() {
    const classID = document.getElementById('classSelect').value;
    const dateStr = document.getElementById('dateSelect').value;
    
    if (!classID) return showToast("Vui lòng chọn lớp để giám sát!", "warning");
    
    toggleLoading(true, `Đang xử lý dữ liệu lớp ${classID}...`);
    
    // 1. Tải log của ngày
    const res = await callAPI('getGiamSatData', { date: dateStr });
    if(res.success) {
        allUsers = res.users || (res.data && res.data.users) || [];
        allLogs = res.logs || (res.data && res.data.logs) || [];
    }
    
    const classStudents = allUsers.filter(u => u.ClassID === classID);
    const studentIDs = classStudents.map(u => String(u.UserID).trim().toUpperCase());
    
    // 2. MƯỢN API ĐỂ TẠO TỪ ĐIỂN MAP: MÃ ĐỀ -> TÊN BÀI (TestTopic)
    let testMap = {};
    try {
        const sampleUserID = classStudents.length > 0 ? classStudents[0].UserID : currentUser.UserID;
        const taskRes = await callAPI('getNhiemVuHocSinh', { UserID: sampleUserID, ClassID: classID });
        if (taskRes && taskRes.success && taskRes.data) {
            taskRes.data.forEach(t => {
                const tid = String(t.TestID || t.TopicID || t.Code || t.maDe || '').trim().toUpperCase();
                const tname = t.TestTopics || t.Topic || t.chuDe || 'Nhiệm vụ học tập';
                if (tid) testMap[tid] = tname;
            });
        }
    } catch (e) { console.warn("Không thể tải map tên bài", e); }

    const classLogs = allLogs.filter(log => studentIDs.includes(String(log.UserID).trim().toUpperCase()));

    // =========================================================================
    // ĐỔ DỮ LIỆU RA CÁC TAB 
    // =========================================================================
    renderTabAuth(classStudents, classLogs);
    renderTabTests(classStudents, classLogs, 'SUBMIT_TN', 'tn-tbody', 'tn', testMap);
    renderTabTests(classStudents, classLogs, 'SUBMIT_TH', 'tl-tbody', 'tl', testMap);
    
    // TAB MỚI: TỔNG HỢP SỐ LIỆU
    renderTabTongHop(classStudents, classLogs);
    // =========================================================================
    
    toggleLoading(false);
    showToast(`Đã tải xong dữ liệu giám sát ngày ${dateStr}`, "success");
}

// CẬP NHẬT MÀU SẮC CHO BẢNG TRẠNG THÁI ĐĂNG NHẬP
function renderTabAuth(students, logs) {
    const tbody = document.getElementById('auth-tbody');
    tbody.innerHTML = '';
    
    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500 font-medium">Không có học sinh nào.</td></tr>`;
        return;
    }

    students.forEach((st, index) => {
        const myLogs = logs.filter(l => String(l.UserID).trim().toUpperCase() === String(st.UserID).trim().toUpperCase());
        const logins = myLogs.filter(l => l.Event === 'LOGIN').length;
        const logouts = myLogs.filter(l => l.Event === 'LOGOUT').length;
        
        let statusHtml = `<span class="bg-[#d1fae5] text-[#10b981] border border-[#a7f3d0] px-3 py-1 rounded-full text-[11px] font-bold">An toàn</span>`;
        let trClass = "hover:bg-[#f0f9ff] transition-colors";
        
        if (logins > logouts) {
            statusHtml = `<span class="bg-[#ffe4e6] text-[#e11d48] border border-[#fecdd3] px-3 py-1 rounded-full text-[11px] font-bold animate-pulse"><i class="fas fa-exclamation-circle"></i> Chưa đăng xuất</span>`;
            trClass = "bg-[#fff1f2] hover:bg-[#ffe4e6] transition-colors";
        } else if (logins === 0 && logouts === 0) {
            statusHtml = `<span class="bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1 rounded-full text-[11px] font-bold">Chưa HĐ</span>`;
            trClass = "opacity-60 hover:opacity-100 hover:bg-slate-50 transition-all";
        }

        tbody.innerHTML += `
            <tr class="${trClass} border-b border-slate-100/50">
                <td class="px-4 py-3 text-center font-bold text-slate-400">${index + 1}</td>
                <td class="px-4 py-3 font-mono font-bold text-[#004c6d]">${st.UserID}</td>
                <td class="px-4 py-3 font-semibold text-slate-700">${st.FullName}</td>
                <td class="px-4 py-3 text-center font-black text-[#00b5e2] text-base">${logins}</td>
                <td class="px-4 py-3 text-center font-bold text-slate-400">${logouts}</td>
                <td class="px-4 py-3 text-center">${statusHtml}</td>
            </tr>
        `;
    });
}

// CẬP NHẬT MÀU SẮC CHO BẢNG TIẾN ĐỘ THI
function renderTabTests(students, logs, eventType, tbodyId, tabPrefix, testMap) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';

    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-500 font-medium">Không có học sinh nào.</td></tr>`;
        return;
    }

    const submitLogs = logs.filter(l => l.Event === eventType);

    students.forEach((st, index) => {
        const mySubmits = submitLogs.filter(l => String(l.UserID).trim().toUpperCase() === String(st.UserID).trim().toUpperCase());
        const total = mySubmits.length;

        let statusBadge = total > 0 
            ? `<span class="bg-gradient-to-r from-[#10b981] to-[#059669] text-white px-3 py-1 rounded-lg text-[11px] font-bold shadow-sm">${total} bài</span>`
            : `<span class="bg-slate-100 text-slate-400 border border-slate-200 px-3 py-1 rounded-lg text-[11px] font-bold">0</span>`;
            
        let rowClass = total > 0 ? "hover:bg-[#f0f9ff] cursor-pointer transition-colors" : "opacity-60";
        let toggleAction = total > 0 ? `onclick="toggleDetail('${st.UserID}', '${tabPrefix}')"` : "";
        let toggleIcon = total > 0 ? `<i id="icon-${tabPrefix}-${st.UserID}" class="fas fa-chevron-down text-[#00b5e2] bg-[#e0f2fe] p-1.5 rounded-md"></i>` : "-";

        let mainRow = `
            <tr class="${rowClass} border-b border-slate-100/80" ${toggleAction}>
                <td class="px-4 py-3 text-center font-bold text-slate-400">${index + 1}</td>
                <td class="px-4 py-3 font-mono font-bold text-[#004c6d]">${st.UserID}</td>
                <td class="px-4 py-3 font-semibold text-slate-700">${st.FullName}</td>
                <td class="px-4 py-3 text-center">${statusBadge}</td>
                <td class="px-4 py-3 text-center">${toggleIcon}</td>
            </tr>
        `;

        let detailRow = '';
        if (total > 0) {
            let detailRowsHtml = mySubmits.map(sub => {
                const tIdStr = String(sub.Note || '').trim().toUpperCase();
                const tName = testMap[tIdStr] || 'Bài tập / Kiểm tra (Đã kết thúc)';
                
                return `
                <div class="flex items-center justify-between py-3 border-b border-[#e0f2fe] last:border-0 gap-3">
                    <div class="flex flex-col">
                        <span class="text-[12.5px] font-bold text-[#004c6d]">${tName}</span>
                        <span class="text-[10px] font-mono font-bold text-[#00b5e2] mt-0.5"><i class="fas fa-hashtag text-[#bae6fd] mr-1"></i>${sub.Note || 'N/A'}</span>
                    </div>
                    <span class="text-[11px] text-[#004c6d] font-semibold whitespace-nowrap bg-white px-2.5 py-1 rounded-md border border-[#bae6fd] shadow-sm"><i class="far fa-clock mr-1 text-[#00b5e2]"></i>${sub.Time}</span>
                </div>
                `;
            }).join('');

            detailRow = `
                <tr id="detail-${tabPrefix}-${st.UserID}" class="hidden bg-[#f0f9ff]">
                    <td colspan="5" class="px-4 py-3">
                        <div class="bg-white border border-[#bae6fd] rounded-xl p-4 shadow-sm max-w-lg ml-auto mr-4 relative">
                            <div class="absolute -top-2 right-6 w-4 h-4 bg-white border-t border-l border-[#bae6fd] transform rotate-45"></div>
                            <h5 class="text-[10px] font-bold text-[#00b5e2] mb-3 uppercase tracking-wider flex items-center"><i class="fas fa-list-ul mr-2"></i>Chi tiết các lần nộp:</h5>
                            ${detailRowsHtml}
                        </div>
                    </td>
                </tr>
            `;
        }

        tbody.innerHTML += mainRow + detailRow;
    });
}

// =========================================================================
// HÀM MỚI: RENDER TAB TỔNG HỢP SỐ LIỆU
// =========================================================================
function renderTabTongHop(students, logs) {
    const tbody = document.getElementById('tonghop-tbody');
    if (!tbody) return; // Bảo vệ an toàn
    
    tbody.innerHTML = '';

    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500 font-medium">Không có học sinh nào.</td></tr>`;
        return;
    }

    students.forEach((st, index) => {
        // Lọc log của riêng học sinh này
        const myLogs = logs.filter(l => String(l.UserID).trim().toUpperCase() === String(st.UserID).trim().toUpperCase());
        
        // 1. Phân tích trạng thái đăng nhập
        const logins = myLogs.filter(l => l.Event === 'LOGIN').length;
        const logouts = myLogs.filter(l => l.Event === 'LOGOUT').length;
        
        let statusHtml = `<span class="text-[#10b981] font-bold"><i class="fas fa-check-circle mr-1"></i> An toàn</span>`;
        if (logins > logouts) {
            statusHtml = `<span class="text-[#e11d48] font-bold animate-pulse"><i class="fas fa-exclamation-triangle mr-1"></i> Đang Online</span>`;
        } else if (logins === 0 && logouts === 0) {
            statusHtml = `<span class="text-slate-400 font-bold"><i class="fas fa-minus-circle mr-1"></i> Chưa HĐ</span>`;
        }

        // 2. Đếm số lượng bài Trắc nghiệm và Tự luận
        const tnTotal = myLogs.filter(l => l.Event === 'SUBMIT_TN').length;
        const tlTotal = myLogs.filter(l => l.Event === 'SUBMIT_TH').length;

        // Trang trí badge số liệu: Có nộp thì hiện viền màu, không nộp hiện dấu gạch ngang
        const tnBadge = tnTotal > 0 
            ? `<span class="bg-[#e0f2fe] border border-[#bae6fd] text-[#0284c7] px-2.5 py-1 rounded-md font-bold shadow-sm">${tnTotal} bài</span>` 
            : `<span class="text-slate-300">-</span>`;
            
        const tlBadge = tlTotal > 0 
            ? `<span class="bg-[#fce7f3] border border-[#fbcfe8] text-[#db2777] px-2.5 py-1 rounded-md font-bold shadow-sm">${tlTotal} bài</span>` 
            : `<span class="text-slate-300">-</span>`;

        // 3. Đổ dữ liệu ra dòng
        tbody.innerHTML += `
            <tr class="hover:bg-[#f0f9ff] transition-colors border-b border-slate-100/50">
                <td class="px-4 py-3 text-center font-bold text-slate-400">${index + 1}</td>
                <td class="px-4 py-3 font-mono font-bold text-[#004c6d]">${st.UserID}</td>
                <td class="px-4 py-3 font-semibold text-slate-700">${st.FullName}</td>
                <td class="px-4 py-3 text-center">${statusHtml}</td>
                <td class="px-4 py-3 text-center">${tnBadge}</td>
                <td class="px-4 py-3 text-center">${tlBadge}</td>
            </tr>
        `;
    });
}

function toggleDetail(studentId, tabPrefix) {
    const detailRow = document.getElementById(`detail-${tabPrefix}-${studentId}`);
    const icon = document.getElementById(`icon-${tabPrefix}-${studentId}`);
    
    if (detailRow.classList.contains('hidden')) {
        detailRow.classList.remove('hidden');
        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
        icon.classList.add('bg-[#00b5e2]', 'text-white');
        icon.classList.remove('text-[#00b5e2]', 'bg-[#e0f2fe]');
    } else {
        detailRow.classList.add('hidden');
        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        icon.classList.remove('bg-[#00b5e2]', 'text-white');
        icon.classList.add('text-[#00b5e2]', 'bg-[#e0f2fe]');
    }
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.remove('hidden');
    btn.classList.add('active');
}

function toggleLoading(show, text = "Đang tải...") {
    const el = document.getElementById('loading');
    if (!el) return;
    if (show) { 
        document.getElementById('loadingText').innerText = text; 
        el.style.display = 'flex'; el.style.opacity = '1'; 
    } else { 
        el.style.opacity = '0'; setTimeout(() => el.style.display = 'none', 300); 
    }
}