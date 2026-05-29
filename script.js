document.addEventListener("DOMContentLoaded", function () {
    const defaultStartDate = new Date(2026, 3, 10); // April 10, 2026
    const duration = 20; 
    const dailyAmount = 650;
    const today = new Date(); 
    const totalCommitteesTarget = 13; 
    const rowsPerPage = 5;
    let currentPage = 1;
    let showSkippedMode = false; // Toggle state for hidden skipped dates

    const memberTotalSlots = {
        "Amna": 1,
        "Bakhtawar": 1,
        "Junaid": 5,
        "Ami": 6
    };

    let savedAllocations = JSON.parse(localStorage.getItem('committee_allocations')) || {};
    let savedNotes = JSON.parse(localStorage.getItem('committee_notes')) || {};
    let manualDates = JSON.parse(localStorage.getItem('committee_manual_dates')) || {}; 
    let savedChecklists = JSON.parse(localStorage.getItem('committee_daily_checks')) || {};
    
    // Globally track skipped dates
    let globalSkippedDates = JSON.parse(localStorage.getItem('committee_global_skipped_dates')) || [];

    let memberAvailableSlots = { ...memberTotalSlots };
    Object.values(savedAllocations).forEach(name => {
        if (memberAvailableSlots[name] !== undefined) {
            memberAvailableSlots[name]--;
        }
    });

    const tableBody = document.getElementById("committeeTableBody");
    const activeTitleText = document.getElementById("activeTitleText");
    const expectedCollectionText = document.getElementById("expectedCollectionText");
    const actualCollectionText = document.getElementById("actualCollectionText");
    const checklistHeaderTitle = document.getElementById("checklistHeaderTitle");
    const checklistGridBoxes = document.getElementById("checklistGridBoxes");
    
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");
    const pageIndicator = document.getElementById("pageIndicator");

    // Dynamic Header Layout Fix (Flexbox Alignment)
    const headerWrapper = checklistHeaderTitle.parentElement;
    headerWrapper.style.display = "flex";
    headerWrapper.style.justifyContent = "space-between";
    headerWrapper.style.alignItems = "center";
    headerWrapper.style.flexWrap = "wrap";
    headerWrapper.style.gap = "8px";
    headerWrapper.style.marginBottom = "12px";

    let toggleBtn = document.getElementById("toggleSkippedBtn");
    if (!toggleBtn) {
        toggleBtn = document.createElement("button");
        toggleBtn.id = "toggleSkippedBtn";
        toggleBtn.style.cssText = `
            font-size: 0.75rem; 
            padding: 6px 10px; 
            background: #f1f5f9; 
            border: 1px solid #cbd5e1; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 600; 
            color: #475569;
            margin-left: auto;
            transition: all 0.2s ease;
        `;
        toggleBtn.textContent = "⚙️ Manage Skipped";
        headerWrapper.insertBefore(toggleBtn, checklistGridBoxes);
    }

    toggleBtn.addEventListener("click", function() {
        showSkippedMode = !showSkippedMode;
        toggleBtn.textContent = showSkippedMode ? "👁️ Show Active Grid" : "⚙️ Manage Skipped";
        toggleBtn.style.background = showSkippedMode ? "#fef08a" : "#f1f5f9";
        updateChecklistUI();
    });

    let allCommitteesData = [];
    let nextCalculatedStartDate = new Date(defaultStartDate);
    let activeCommitteeNum = null;

    const formatDateMobile = (date) => {
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const formatDateToInput = (date) => {
        let d = new Date(date), month = '' + (d.getMonth() + 1), day = '' + d.getDate(), year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
    };

    const isDateSkipped = (dateObj) => {
        const checkStr = formatDateToInput(dateObj);
        return globalSkippedDates.includes(checkStr);
    };

    function getDropdownOptions(currentSelectedName) {
        let optionsHtml = `<option value="">Select...</option>`;
        for (const [name, slotsLeft] of Object.entries(memberAvailableSlots)) {
            if (slotsLeft > 0 || name === currentSelectedName) {
                optionsHtml += `<option value="${name}">${name} (${slotsLeft})</option>`;
            } else {
                optionsHtml += `<option value="${name}" disabled>${name} (0)</option>`;
            }
        }
        return optionsHtml;
    }

    function generateNoteCellContent(id, text) {
        return text && text.trim() !== "" ? 
            `<div class="note-container" data-id="${id}"><span class="note-text">${text}</span><span class="delete-note-btn">❌</span></div>` : 
            `<div class="note-container" data-id="${id}"><span class="add-note-placeholder">+ Note</span></div>`;
    }

    // 1. Generate Timeline Sequences
    for (let committeeNo = 1; committeeNo <= totalCommitteesTarget; committeeNo++) {
        let cStart = manualDates[committeeNo] && manualDates[committeeNo].start ? new Date(manualDates[committeeNo].start) : new Date(nextCalculatedStartDate);
        
        while (isDateSkipped(cStart)) {
            cStart.setDate(cStart.getDate() + 1);
        }

        let dateSequence = [];
        let runningDate = new Date(cStart);
        
        while (dateSequence.length < duration) {
            if (!isDateSkipped(runningDate)) {
                dateSequence.push(new Date(runningDate));
            }
            runningDate.setDate(runningDate.getDate() + 1);
        }

        let cEnd = new Date(dateSequence[dateSequence.length - 1]);
        let status = "Remaining";
        let rowStyleClass = "row-remaining";
        
        const targetToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const compStart = new Date(cStart.getFullYear(), cStart.getMonth(), cStart.getDate());
        const compEnd = new Date(cEnd.getFullYear(), cEnd.getMonth(), cEnd.getDate());
        
        const isCurrent = (targetToday >= compStart && targetToday <= compEnd);

        if (isCurrent) {
            status = "ACTIVE";
            rowStyleClass = "row-active";
            activeCommitteeNum = committeeNo;
        } else if (targetToday > compEnd) {
            status = "Completed";
            rowStyleClass = "row-completed";
        }

        allCommitteesData.push({
            no: committeeNo,
            start: cStart,
            end: cEnd,
            isCurrent: isCurrent,
            status: status,
            rowStyleClass: rowStyleClass,
            allowDropdown: (status === "Completed") || (isCurrent && Math.ceil((cEnd.getTime() - today.getTime()) / (1000 * 3600 * 24)) <= 5),
            dates: dateSequence
        });

        nextCalculatedStartDate = new Date(cEnd);
        nextCalculatedStartDate.setDate(nextCalculatedStartDate.getDate() + 1);
    }

    if (!activeCommitteeNum) {
        activeCommitteeNum = 1; 
    }

    // 2. Checklist UI Engine
    function updateChecklistUI() {
        checklistGridBoxes.innerHTML = "";
        
        if (!savedChecklists[activeCommitteeNum]) {
            savedChecklists[activeCommitteeNum] = Array(duration).fill(false);
        }
        
        const activeChecks = savedChecklists[activeCommitteeNum];
        const currentActiveData = allCommitteesData.find(c => c.no === activeCommitteeNum);
        
        let tickCount = 0;
        let activeElapsedDaysValid = 0;
        const targetToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // Manage Skipped View Mode
        if (showSkippedMode) {
            checklistHeaderTitle.textContent = `🗑️ Skipped Dates`;
            
            if (globalSkippedDates.length === 0) {
                checklistGridBoxes.innerHTML = `<div style="grid-column: span 4; font-size:0.85rem; color:#94a3b8; text-align:center; padding:20px;">Koi bhi date skip nahi hui.</div>`;
            } else {
                globalSkippedDates.forEach((skippedDateKey) => {
                    const cleanDateObj = new Date(skippedDateKey);
                    const boxDiv = document.createElement("div");
                    boxDiv.className = `day-box`;
                    boxDiv.style.borderColor = "#fca5a5";
                    boxDiv.style.background = "#fef2f2";
                    boxDiv.dataset.datekey = skippedDateKey;

                    boxDiv.innerHTML = `
                        <div class="day-num" style="color:#b91c1c;">Skipped</div>
                        <div class="day-date" style="color:#ef4444;">${formatDateMobile(cleanDateObj)}</div>
                        <div class="skip-action-btn" style="background:#fef08a; color:#a16207; margin-top:4px;">Undo Skip</div>
                    `;
                    checklistGridBoxes.appendChild(boxDiv);
                });
            }
            return; 
        }

        // Normal Checklist View Mode
        checklistHeaderTitle.textContent = `📆 Cash Saved Checklist (Committee #${activeCommitteeNum})`;

        for (let dayIdx = 0; dayIdx < duration; dayIdx++) {
            const isChecked = activeChecks[dayIdx];
            if (isChecked) tickCount++;

            const dayDateObj = currentActiveData ? currentActiveData.dates[dayIdx] : null;
            const dateStringDisplay = dayDateObj ? formatDateMobile(dayDateObj) : `Day ${dayIdx + 1}`;
            const rawInputDateString = dayDateObj ? formatDateToInput(dayDateObj) : "";

            if (dayDateObj && targetToday >= new Date(dayDateObj.getFullYear(), dayDateObj.getMonth(), dayDateObj.getDate())) {
                activeElapsedDaysValid++;
            }

            const boxDiv = document.createElement("div");
            boxDiv.className = `day-box ${isChecked ? 'checked' : ''}`;
            boxDiv.dataset.dayindex = dayIdx;
            boxDiv.dataset.datekey = rawInputDateString;

            boxDiv.innerHTML = `
                <div class="day-num">Day ${dayIdx + 1}</div>
                <div class="day-date">${dateStringDisplay}</div>
                <input type="checkbox" ${isChecked ? 'checked' : ''} />
                ${isChecked ? '' : `<div class="skip-action-btn">Skip Date</div>`}
            `;
            checklistGridBoxes.appendChild(boxDiv);
        }

        if (currentActiveData) {
            activeTitleText.textContent = `No. ${currentActiveData.no} (${formatDateMobile(currentActiveData.start)} - ${formatDateMobile(currentActiveData.end)})`;
            const expectedAmount = activeElapsedDaysValid * dailyAmount;
            expectedCollectionText.textContent = `Should Be Saved: ${expectedAmount.toLocaleString()} PKR (${activeElapsedDaysValid}/${duration} Days passed)`;
        }

        const manualActualPoolTotal = tickCount * dailyAmount;
        actualCollectionText.textContent = `Actually Ticked: ${manualActualPoolTotal.toLocaleString()} PKR (${tickCount} Days Saved)`;
    }

    // Checklist Click Interceptor
    checklistGridBoxes.addEventListener("click", function(e) {
        const box = e.target.closest(".day-box");
        if (!box) return;

        const index = parseInt(box.dataset.dayindex);
        const targetDateKey = box.dataset.datekey;
        const isSkipBtn = e.target.classList.contains("skip-action-btn");
        
        if (isSkipBtn && targetDateKey) {
            if (!showSkippedMode && savedChecklists[activeCommitteeNum][index]) return;

            if (globalSkippedDates.includes(targetDateKey)) {
                globalSkippedDates = globalSkippedDates.filter(date => date !== targetDateKey);
            } else {
                globalSkippedDates.push(targetDateKey);
            }
            
            localStorage.setItem('committee_global_skipped_dates', JSON.stringify(globalSkippedDates));
            window.location.reload();
            return;
        }

        if (showSkippedMode) return;

        const checkbox = box.querySelector('input[type="checkbox"]');
        if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
        }

        savedChecklists[activeCommitteeNum][index] = checkbox.checked;
        localStorage.setItem('committee_daily_checks', JSON.stringify(savedChecklists));
        
        updateChecklistUI();
    });

    updateChecklistUI();

    // 3. Paginated Render View Table
    function renderTablePage(page) {
        tableBody.innerHTML = "";
        const startIndex = (page - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, totalCommitteesTarget);

        for (let i = startIndex; i < endIndex; i++) {
            const data = allCommitteesData[i];
            const savedName = savedAllocations[data.no] || "";
            const savedNote = savedNotes[data.no] || "";

            let givenToCellContent = `<span style="color:#cbd5e1;">-</span>`;
            if (savedName) {
                givenToCellContent = `<span class="assigned-name">${savedName}</span>`;
            } else if (data.allowDropdown) {
                givenToCellContent = `<select class="givenToSelect" data-id="${data.no}">${getDropdownOptions("")}</select>`;
            }

            const row = `
                <tr class="${data.rowStyleClass}">
                    <td style="font-weight:700; text-align:center;">${data.no}</td>
                    <td>
                        <div style="margin-bottom: 2px;">
                            <span class="editable-date date-start" data-id="${data.no}" data-raw="${formatDateToInput(data.start)}">${formatDateMobile(data.start)}</span>
                        </div>
                        <div>
                            <span class="editable-date date-end" data-id="${data.no}" data-raw="${formatDateToInput(data.end)}">${formatDateMobile(data.end)}</span>
                        </div>
                    </td>
                    <td>${givenToCellContent}</td>
                    <td class="note-td" data-id="${data.no}">
                        ${generateNoteCellContent(data.no, savedNote)}
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        }

        const totalPages = Math.ceil(totalCommitteesTarget / rowsPerPage);
        pageIndicator.textContent = `${page} / ${totalPages}`;
        prevBtn.disabled = (page === 1);
        nextBtn.disabled = (page === totalPages);
    }

    prevBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderTablePage(currentPage); } });
    nextBtn.addEventListener("click", () => { const totalPages = Math.ceil(totalCommitteesTarget / rowsPerPage); if (currentPage < totalPages) { currentPage++; renderTablePage(currentPage); } });

    renderTablePage(currentPage);

    // Table Interactions
    tableBody.addEventListener('change', function (e) {
        if (e.target.classList.contains('givenToSelect')) {
            const selectEl = e.target;
            const id = selectEl.dataset.id;
            const selectedName = selectEl.value;

            if (selectedName) {
                memberAvailableSlots[selectedName]--;
                savedAllocations[id] = selectedName;
                localStorage.setItem('committee_allocations', JSON.stringify(savedAllocations));

                const parentTd = selectEl.parentElement;
                parentTd.innerHTML = `<span class="assigned-name">${selectedName}</span>`;
                document.querySelectorAll('.givenToSelect').forEach(dropdown => { dropdown.innerHTML = getDropdownOptions(""); });
            }
        }
    });

    tableBody.addEventListener('dblclick', function (e) {
        const target = e.target;
        if (target.classList.contains('editable-date')) {
            const currentId = target.dataset.id;
            const rawValue = target.dataset.raw;
            const parentTd = target.parentElement;
            const isStart = target.classList.contains('date-start');
            const targetClass = isStart ? 'input-date-start' : 'input-date-end';

            parentTd.innerHTML = `<input type="date" class="${targetClass}" data-id="${currentId}" value="${rawValue}" autofocus />`;
            parentTd.querySelector('input').focus();
        }

        if (target.classList.contains('note-text')) {
            const id = target.parentElement.dataset.id;
            const parentTd = target.parentElement.parentElement;
            const currentVal = savedNotes[id] || "";

            parentTd.innerHTML = `<input type="text" class="noteDynamicInput" data-id="${id}" value="${currentVal}" autofocus />`;
            parentTd.querySelector('input').focus();
        }
    });

    tableBody.addEventListener('click', function (e) {
        if (e.target.classList.contains('add-note-placeholder')) {
            const id = e.target.parentElement.dataset.id;
            const parentTd = e.target.parentElement.parentElement;
            
            parentTd.innerHTML = `<input type="text" class="noteDynamicInput" data-id="${id}" value="" placeholder="Type..." autofocus />`;
            parentTd.querySelector('input').focus();
        }

        if (e.target.classList.contains('delete-note-btn')) {
            const id = e.target.parentElement.dataset.id;
            const parentTd = e.target.parentElement.parentElement;

            delete savedNotes[id];
            localStorage.setItem('committee_notes', JSON.stringify(savedNotes));
            parentTd.innerHTML = generateNoteCellContent(id, "");
        }
    });

    function processDateUpdate(inputEl, isStartField) {
        const id = inputEl.dataset.id;
        const newDateVal = inputEl.value;

        if (newDateVal) {
            if (!manualDates[id]) manualDates[id] = {};
            if (isStartField) {
                manualDates[id].start = newDateVal;
            } else {
                manualDates[id].end = newDateVal;
            }
            localStorage.setItem('committee_manual_dates', JSON.stringify(manualDates));
            window.location.reload();
        }
    }

    function saveNoteFromInput(inputEl) {
        const id = inputEl.dataset.id;
        const value = inputEl.value.trim();
        const parentTd = inputEl.parentElement;

        if (value !== "") { savedNotes[id] = value; } else { delete savedNotes[id]; }
        localStorage.setItem('committee_notes', JSON.stringify(savedNotes));
        parentTd.innerHTML = generateNoteCellContent(id, value);
    }

    tableBody.addEventListener('focusout', function (e) {
        const target = e.target;
        if (target.classList.contains('noteDynamicInput')) saveNoteFromInput(target);
        if (target.classList.contains('input-date-start')) processDateUpdate(target, true);
        if (target.classList.contains('input-date-end')) processDateUpdate(target, false);
    });

    tableBody.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            const target = e.target;
            if (target.classList.contains('noteDynamicInput')) saveNoteFromInput(target);
            if (target.classList.contains('input-date-start')) processDateUpdate(target, true);
            if (target.classList.contains('input-date-end')) processDateUpdate(target, false);
        }
    });
});