// ==================== LOGIC TỔNG HỢP THỐNG KÊ ====================

let globalData = { students: [], missions: [], results: [] };

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireLogin()) return; 

    const role = (currentUser.Permissions || '').toLowerCase();
    const obj = (currentUser.Object || '').toLowerCase();
    const isGV = obj.includes('giáo viên') || obj.includes('gv') || role.includes('admin') || role.includes('giáo viên');
    
    if (!isGV) {
        showToast("Bạn không có quyền truy cập trang này!", "error");
        setTimeout(() => chuyenTrang('index'), 1500);
        return;
    }
    await loadClassList();
});

async function loadClassList() {
    toggleLoading(true, "Đang kết nối hệ thống...");
    try {
        const res = await callAPI('getDistinctLop', {});
        if (res.success && res.data) {
            const select = document.getElementById('classSelect');
            res.data.sort().forEach(c => {
                select.innerHTML += `<option value="${c}">Lớp ${c}</option>`;
            });
        }
    } catch (e) {
        console.error("Lỗi lấy danh sách lớp:", e);
    } finally {
        toggleLoading(false);
    }
}

function parseDateInput(dateStr) {
    if (!dateStr) return new Date(8640000000000000); 
    return new Date(dateStr);
}

async function fetchThongKe() {
    const classID = document.getElementById('classSelect').value;
    if (!classID) {
        showToast("Vui lòng chọn lớp!", "warning");
        return;
    }

    toggleLoading(true, `Đang tải dữ liệu lớp ${classID}...`);
    try {
        const res = await callAPI('getThongKeLop', { classID: classID });
        if (!res.success) throw new Error(res.error);

        globalData.students = res.students || [];
        globalData.missions = res.missions || [];
        globalData.results = res.results || [];

        populateTestFilter();
        renderTable();

        showToast(`Đã tải thống kê lớp ${classID}`, "success");
    } catch (e) {
        console.error("Lỗi:", e);
        showToast("Có lỗi xảy ra khi xử lý dữ liệu", "error");
    } finally {
        toggleLoading(false);
    }
}

function populateTestFilter() {
    const testSelect = document.getElementById('testSelect');
    testSelect.innerHTML = '<option value="">-- Tất cả nhiệm vụ --</option>';
    
    const uniqueTests = [];
    const testIds = new Set();
    globalData.missions.forEach(m => {
        if (!testIds.has(m.TestID)) {
            testIds.add(m.TestID);
            uniqueTests.push({ id: m.TestID, name: m.TestName });
        }
    });

    uniqueTests.forEach(t => {
        testSelect.innerHTML += `<option value="${t.id}">[${t.id}] ${t.name}</option>`;
    });

    testSelect.style.display = 'block'; 
}

function renderTable() {
    const tbody = document.getElementById('dataTable');
    tbody.innerHTML = '';

    if (globalData.students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-slate-400 font-semibold">Lớp này không có học sinh nào.</td></tr>`;
        document.getElementById('dashboardWidgets').style.display = 'none';
        return;
    }

    const selectedTestID = document.getElementById('testSelect').value;
    let globalTotal = 0, globalDone = 0, globalPending = 0, globalFailed = 0;
    let sttHS = 1;
    const now = new Date();

    globalData.students.forEach(st => {
        let stMissions = globalData.missions.filter(m => String(m.UserID).trim() === String(st.UserID).trim());
        if (selectedTestID) {
            stMissions = stMissions.filter(m => String(m.TestID).trim() === String(selectedTestID).trim());
        }

        let stTotal = stMissions.length;
        let stDone = 0, stPending = 0, stFailed = 0;

        if (stTotal === 0) return; 

        // Nhóm theo Môn: Ưu tiên lấy dứt khoát SubjectName
        const groupedMissions = stMissions.reduce((acc, m) => {
            const subjName = m.SubjectName || m.Subject || 'Tên môn trống (Check lại API)'; 
            const groupKey = m.SubjectID || subjName; 
            if (!acc[groupKey]) acc[groupKey] = { name: subjName, list: [] };
            acc[groupKey].list.push(m);
            return acc;
        }, {});

        let detailRowsHTML = '';

        for (const [groupKey, groupData] of Object.entries(groupedMissions)) {
            
            let missionsOfSubj = groupData.list;
            let subjectName = groupData.name;

            // Sắp xếp: TN -> TL -> Date
            missionsOfSubj.sort((a, b) => {
                const isTNa = String(a.TestID).toUpperCase().startsWith("TN") ? 0 : 1;
                const isTNb = String(b.TestID).toUpperCase().startsWith("TN") ? 0 : 1;
                if (isTNa !== isTNb) return isTNa - isTNb;
                const dateA = new Date(a.End || a.Start || 0).getTime();
                const dateB = new Date(b.End || b.Start || 0).getTime();
                return dateA - dateB;
            });

            // Tiêu đề môn: Chỉ hiển thị Icon + SubjectName (nhấn mạnh bằng màu, bỏ màu nền)
            detailRowsHTML += `
                <div class="mt-5 mb-3 first:mt-0 pb-2 border-b border-slate-200">
                    <span class="text-sm font-black text-[#00b5e2] uppercase"><i class="fas fa-book mr-2"></i>${subjectName}</span>
                </div>
            `;

            missionsOfSubj.forEach(m => {
                globalTotal++;

                const stResults = globalData.results.filter(r => 
                    String(r.UserID).trim() === String(st.UserID).trim() && 
                    String(r.TestID).trim() === String(m.TestID).trim()
                );

                const isTL = String(m.TestID).trim().toUpperCase().startsWith("TL");
                const endDate = parseDateInput(m.End);    
                const isExpired = now > endDate;          

                let isComplete = false;
                let displayStats = "";

                if (isTL) {
                    const submittedFilesCount = stResults.length; 
                    isComplete = submittedFilesCount > 0;
                    
                    displayStats = `
                        <div class="flex items-center justify-center py-1 px-4 text-[12px] min-w-[90px]" title="Số file Tự luận đã nộp / Yêu cầu">
                            <i class="fas fa-file-upload text-[#00b5e2] mr-2"></i> 
                            <span class="${isComplete ? 'text-[#10b981]' : 'text-[#fb7185]'} font-bold">${submittedFilesCount}</span><span class="text-slate-400 text-[11px]">/1</span>
                        </div>
                    `;
                } else {
                    const reqCount = Number(m.Count) || 0;
                    const reqAvg = Number(m.AverageScore) || 0;
                    const reqMax = Number(m.MaxScore) || 0;

                    const actualCount = stResults.length;
                    const actualMax = actualCount > 0 ? Math.max(...stResults.map(r => Number(r.Correct) || 0)) : 0;
                    const actualAvg = actualCount > 0 ? (stResults.reduce((sum, r) => sum + (Number(r.Correct) || 0), 0) / actualCount) : 0;

                    let isCountPass = reqCount === 0 || actualCount >= reqCount;
                    let isAvgPass = reqAvg === 0 || actualAvg >= reqAvg;
                    let isMaxPass = reqMax === 0 || actualMax >= reqMax;

                    if (actualCount > 0 && isCountPass && isAvgPass && isMaxPass) {
                        isComplete = true;
                    }

                    let valCount = reqCount > 0 ? `<span class="${isCountPass ? 'text-[#10b981]' : 'text-[#fb7185]'} font-bold">${actualCount}</span><span class="text-slate-400 text-[11px]">/${reqCount}</span>` : `<span class="text-slate-300">-</span>`;
                    let htmlCount = `<div class="w-[75px] flex items-center justify-center gap-1.5" title="Lượt làm / Yêu cầu"><i class="fas fa-redo text-slate-400 text-[10px]"></i>${valCount}</div>`;

                    let valAvg = reqAvg > 0 ? `<span class="${isAvgPass ? 'text-[#10b981]' : 'text-[#fb7185]'} font-bold">${actualAvg.toFixed(1)}</span><span class="text-slate-400 text-[11px]">/${reqAvg}</span>` : `<span class="text-slate-300">-</span>`;
                    let htmlAvg = `<div class="w-[85px] flex items-center justify-center gap-1.5" title="Điểm TB / Yêu cầu"><i class="fas fa-chart-line text-slate-400 text-[10px]"></i>${valAvg}</div>`;

                    let valMax = reqMax > 0 ? `<span class="${isMaxPass ? 'text-[#10b981]' : 'text-[#fb7185]'} font-bold">${actualMax}</span><span class="text-slate-400 text-[11px]">/${reqMax}</span>` : `<span class="text-slate-300">-</span>`;
                    let htmlMax = `<div class="w-[75px] flex items-center justify-center gap-1.5" title="Điểm Max / Yêu cầu"><i class="fas fa-star text-slate-400 text-[10px]"></i>${valMax}</div>`;

                    displayStats = `<div class="flex items-center py-1 divide-x divide-slate-200 text-[12px]">
                        ${htmlCount}
                        ${htmlAvg}
                        ${htmlMax}
                    </div>`;
                }

                let statusIcon = "";
                if (isComplete) {
                    statusIcon = `<i class="fas fa-check-circle text-xl text-[#10b981] drop-shadow-sm" title="Hoàn thành"></i>`;
                    stDone++; globalDone++;
                } else if (isExpired) {
                    statusIcon = `<i class="fas fa-times-circle text-xl text-[#fb7185] drop-shadow-sm" title="Không đạt / Trễ hạn"></i>`;
                    stFailed++; globalFailed++;
                } else {
                    statusIcon = `<i class="fas fa-hourglass-half text-xl text-[#f59e0b] drop-shadow-sm" title="Đang thực hiện"></i>`;
                    stPending++; globalPending++;
                }

                let deadlineStr = 'Vô hạn';
                if (m.End) {
                    const d = new Date(m.End);
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mm = String(d.getMinutes()).padStart(2, '0');
                    const DD = String(d.getDate()).padStart(2, '0');
                    const MM = String(d.getMonth() + 1).padStart(2, '0');
                    deadlineStr = `${hh}:${mm} ${DD}-${MM}`;
                }

                detailRowsHTML += `
                    <div class="flex flex-col xl:flex-row xl:items-center justify-between py-1 border-b border-dashed border-slate-100 last:border-0 gap-3 hover:bg-slate-50 transition-colors px-2 rounded">
                        
                        <div class="flex items-center flex-1 gap-3 min-w-0">
                            <span class="text-[14px] font-bold text-[#004c6d] truncate">${m.TestName}</span>
                            <span class="text-[11px] font-mono font-bold text-[#00b5e2] flex-shrink-0">
                                <i class="fas ${isTL ? 'fa-file-alt' : 'fa-list-ol'} mr-1"></i>${m.TestID}
                            </span>
                        </div>

                        <div class="flex items-center gap-4 text-[12px] flex-shrink-0 justify-end">
                            <div class="w-[120px] flex items-center justify-center gap-1.5 text-slate-500 font-semibold px-2 py-1" title="Hạn chót">
                                <i class="far fa-clock text-[#00b5e2]"></i> ${deadlineStr}
                            </div>
                            ${displayStats}
                            <div class="w-8 flex justify-center">${statusIcon}</div>
                        </div>
                    </div>
                `;
            }); 
        }

        let rowClass = "hover:bg-[#f0f9ff] cursor-pointer transition-colors border-b border-slate-100";
        let toggleAction = `onclick="toggleStudentDetail('${st.UserID}')"`;

        let htmlTotal = `<span class="font-black text-[#00b5e2] text-base">${stTotal}</span>`;
        let htmlDone = stDone > 0 ? `<span class="font-black text-[#10b981] text-base">${stDone}</span>` : `<span class="font-semibold text-slate-300">-</span>`;
        let htmlPending = stPending > 0 ? `<span class="font-black text-[#f59e0b] text-base">${stPending}</span>` : `<span class="font-semibold text-slate-300">-</span>`;
        let htmlFailed = stFailed > 0 ? `<span class="font-black text-[#fb7185] text-base">${stFailed}</span>` : `<span class="font-semibold text-slate-300">-</span>`;

        let mainRow = `
            <tr class="${rowClass}" ${toggleAction}>
                <td class="px-4 py-4 text-center font-bold text-slate-400">${sttHS++}</td>
                <td class="px-4 py-4">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-[#004c6d] text-[1.05rem]">${st.FullName}</span>
                        <span class="text-slate-300 font-bold">-</span>
                        <span class="text-sm font-mono text-[#00b5e2]">${st.UserID}</span>
                    </div>
                </td>
                <td class="px-4 py-4 text-center">${htmlTotal}</td>
                <td class="px-4 py-4 text-center">${htmlDone}</td>
                <td class="px-4 py-4 text-center">${htmlPending}</td>
                <td class="px-4 py-4 text-center">${htmlFailed}</td>
                <td class="px-4 py-4 text-center">
                    <i id="icon-st-${st.UserID}" class="fas fa-chevron-down text-[#00b5e2] bg-[#e0f2fe] p-2 rounded-lg transition-transform"></i>
                </td>
            </tr>
        `;

        let detailRow = `
            <tr id="detail-st-${st.UserID}" class="hidden bg-white">
                <td colspan="7" class="px-2 py-4 sm:px-8">
                    <div class="bg-white border border-[#bae6fd] rounded-2xl p-5 shadow-sm relative">
                        <div class="absolute -top-2 right-8 w-4 h-4 bg-white border-t border-l border-[#bae6fd] transform rotate-45"></div>
                        <div class="flex flex-col gap-1">
                            ${detailRowsHTML}
                        </div>
                    </div>
                </td>
            </tr>
        `;

        tbody.innerHTML += mainRow + detailRow;
    });

    document.getElementById('dashboardWidgets').style.display = 'flex';
    document.getElementById('widgetTotal').innerText = globalTotal;
    document.getElementById('widgetDone').innerText = globalDone;
    document.getElementById('widgetPending').innerText = globalPending;
    document.getElementById('widgetFailed').innerText = globalFailed;

    if (globalTotal === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-slate-400 font-semibold">Không tìm thấy dữ liệu phù hợp với bộ lọc.</td></tr>`;
    }
}

function toggleStudentDetail(studentId) {
    const detailRow = document.getElementById(`detail-st-${studentId}`);
    const icon = document.getElementById(`icon-st-${studentId}`);
    
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