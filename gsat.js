// ==================== LOGIC GIÁM SÁT HỌC TẬP ====================
let allUsers = [];
let allLogs = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireLogin()) return;
    
    const role = (currentUser.Permissions || '').toLowerCase();
    const obj = (currentUser.Object || '').toLowerCase();
    const isGV = obj.includes('giáo viên') || obj.includes('gv') || role.includes('admin') || role.includes('giáo viên');
    if (!isGV) {
        showToast("Bạn không có quyền truy cập trang này!", "error");
        setTimeout(() => chuyenTrang('00_Index'), 1500);
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

    renderTabAuth(classStudents, classLogs);
    // Truyền testMap vào hàm render
    renderTabTests(classStudents, classLogs, 'SUBMIT_TN', 'tn-tbody', 'tn', testMap);
    renderTabTests(classStudents, classLogs, 'SUBMIT_TL', 'tl-tbody', 'tl', testMap);
    
    toggleLoading(false);
    showToast(`Đã tải xong dữ liệu giám sát ngày ${dateStr}`, "success");
}

function renderTabAuth(students, logs) {
    const tbody = document.getElementById('auth-tbody');
    tbody.innerHTML = '';
    
    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">Không có học sinh nào.</td></tr>`;
        return;
    }

    students.forEach((st, index) => {
        const myLogs = logs.filter(l => String(l.UserID).trim().toUpperCase() === String(st.UserID).trim().toUpperCase());
        const logins = myLogs.filter(l => l.Event === 'LOGIN').length;
        const logouts = myLogs.filter(l => l.Event === 'LOGOUT').length;
        
        let statusHtml = `<span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-bold">An toàn</span>`;
        let trClass = "hover:bg-slate-50 transition-colors";
        
        if (logins > logouts) {
            statusHtml = `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[11px] font-bold animate-pulse"><i class="fas fa-exclamation-circle"></i> Chưa đăng xuất</span>`;
            trClass = "bg-red-50 hover:bg-red-100 transition-colors";
        } else if (logins === 0 && logouts === 0) {
            statusHtml = `<span class="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[11px] font-bold">Chưa HĐ</span>`;
            trClass = "opacity-60 hover:opacity-100 hover:bg-slate-50 transition-all";
        }

        tbody.innerHTML += `
            <tr class="${trClass}">
                <td class="px-4 py-3 text-center font-bold text-slate-400">${index + 1}</td>
                <td class="px-4 py-3 font-mono font-bold text-slate-700">${st.UserID}</td>
                <td class="px-4 py-3 font-medium text-slate-800">${st.FullName}</td>
                <td class="px-4 py-3 text-center font-bold text-indigo-600">${logins}</td>
                <td class="px-4 py-3 text-center font-bold text-slate-500">${logouts}</td>
                <td class="px-4 py-3 text-center">${statusHtml}</td>
            </tr>
        `;
    });
}

// Hàm render bảng cho Trắc Nghiệm và Tự Luận (Bổ sung tham số testMap)
function renderTabTests(students, logs, eventType, tbodyId, tabPrefix, testMap) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';

    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-500">Không có học sinh nào.</td></tr>`;
        return;
    }

    const submitLogs = logs.filter(l => l.Event === eventType);

    students.forEach((st, index) => {
        const mySubmits = submitLogs.filter(l => String(l.UserID).trim().toUpperCase() === String(st.UserID).trim().toUpperCase());
        const total = mySubmits.length;

        let statusBadge = total > 0 
            ? `<span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[11px] font-bold shadow-sm">${total} bài</span>`
            : `<span class="bg-slate-100 text-slate-400 px-3 py-1 rounded-lg text-[11px] font-bold">0</span>`;
            
        let rowClass = total > 0 ? "hover:bg-indigo-50/50 cursor-pointer transition-colors" : "opacity-60";
        let toggleAction = total > 0 ? `onclick="toggleDetail('${st.UserID}', '${tabPrefix}')"` : "";
        let toggleIcon = total > 0 ? `<i id="icon-${tabPrefix}-${st.UserID}" class="fas fa-chevron-down text-slate-400"></i>` : "-";

        let mainRow = `
            <tr class="${rowClass} border-b border-slate-100" ${toggleAction}>
                <td class="px-4 py-3 text-center font-bold text-slate-400">${index + 1}</td>
                <td class="px-4 py-3 font-mono font-bold text-slate-700">${st.UserID}</td>
                <td class="px-4 py-3 font-medium text-slate-800">${st.FullName}</td>
                <td class="px-4 py-3 text-center">${statusBadge}</td>
                <td class="px-4 py-3 text-center">${toggleIcon}</td>
            </tr>
        `;

        let detailRow = '';
        if (total > 0) {
            // RENDER LẠI CHI TIẾT: Hiển thị TestTopic nổi bật, Mã đề làm phụ
            let detailRowsHtml = mySubmits.map(sub => {
                const tIdStr = String(sub.Note || '').trim().toUpperCase();
                const tName = testMap[tIdStr] || 'Bài tập / Kiểm tra (Đã kết thúc)';
                
                return `
                <div class="flex items-center justify-between py-2.5 border-b border-slate-100/50 last:border-0 gap-3">
                    <div class="flex flex-col">
                        <span class="text-[12.5px] font-bold text-slate-800">${tName}</span>
                        <span class="text-[10px] font-mono font-bold text-indigo-500 mt-0.5"><i class="fas fa-hashtag text-indigo-300 mr-1"></i>${sub.Note || 'N/A'}</span>
                    </div>
                    <span class="text-[11px] text-slate-500 whitespace-nowrap bg-slate-50 px-2 py-1 rounded-md border border-slate-100"><i class="far fa-clock mr-1"></i>${sub.Time}</span>
                </div>
                `;
            }).join('');

            detailRow = `
                <tr id="detail-${tabPrefix}-${st.UserID}" class="hidden bg-indigo-50/30">
                    <td colspan="5" class="px-4 py-3">
                        <div class="bg-white border border-indigo-100 rounded-xl p-4 shadow-inner max-w-lg ml-auto mr-4">
                            <h5 class="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center"><i class="fas fa-list-ul mr-2"></i>Lịch sử nộp chi tiết:</h5>
                            ${detailRowsHtml}
                        </div>
                    </td>
                </tr>
            `;
        }

        tbody.innerHTML += mainRow + detailRow;
    });
}

function toggleDetail(studentId, tabPrefix) {
    const detailRow = document.getElementById(`detail-${tabPrefix}-${studentId}`);
    const icon = document.getElementById(`icon-${tabPrefix}-${studentId}`);
    
    if (detailRow.classList.contains('hidden')) {
        detailRow.classList.remove('hidden');
        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
        icon.classList.add('text-indigo-600');
    } else {
        detailRow.classList.add('hidden');
        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        icon.classList.remove('text-indigo-600');
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