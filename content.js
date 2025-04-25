// content.js
console.log("This extension is active (version 3)");

const subjectMap = {
    "LOG": "LOGISTIEK",
    "Verdieping": "VERDIEPING LOGISTIEK",
    "OND": "ONDERHOUD",
    "VOE": "VOEDING"
}

const targetNode = document.body;
const config = { childList: true, subtree: true };

const formatDate = function(dateString) {
    const monthNames = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];
    const [year, month, day] = dateString.split("-").map(Number)
    return `${day} ${monthNames[month - 1]} ${year}`;
}

const savePdf = async (pdfBytes, studentName, date) => {
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const filename = `${studentName}_${date}.pdf`

    chrome.runtime.sendMessage({ action: "savePdf", url: url, filename: filename });
};

const generateTemplate = async function(studentName, agendaItem, individualGoal = "") {
    const {PDFDocument} = window.PDFLib;
    const templateUrl = chrome.runtime.getManifest().web_accessible_resources[0].resources[0];
    const fullTemplateUrl = chrome.runtime.getURL(templateUrl);
    const templateBytes = await fetch(fullTemplateUrl).then(res => res.arrayBuffer())

    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    form.getTextField('name').setText(studentName);
    form.getTextField('date').setText(agendaItem['date']);
    form.getTextField('task1').setText(agendaItem['subject']);

    const goalsToSet = [...(agendaItem.goals || [])];
    if (individualGoal) {
        goalsToSet.push(individualGoal);
    }

    goalsToSet.forEach((goal, index) => {
        const goalFieldName = 'goal' + (index + 1);
        if (form.getTextField(goalFieldName)) {
            form.getTextField(goalFieldName).setText(goal);
        }
    });

    form.getTextField('class').setText(agendaItem['group']);
    form.getTextField('subject').setText(agendaItem['course']);

    form.flatten();

    const modifiedPdfBytes = await pdfDoc.save();
    await savePdf(modifiedPdfBytes, studentName, agendaItem['date'])
}

const callback = function (mutationsList, observer) {
    for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(addedNode => {
                if (addedNode.nodeType === 1) {
                    const iframe = addedNode.querySelector('#create_agenda_iframe');
                    if (iframe) {
                        iframe.addEventListener('load', () => {
                            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
                            const saveButtons = iframeDocument.querySelectorAll('.asBtn')
                            if(saveButtons.length > 0) {
                                saveButtons.forEach(button => {
                                    button.addEventListener('click', async () => {
                                        const agendaItem = {}
                                        // subject
                                        const subjectElement = iframeDocument.getElementById('agenda_onderwerp');
                                        const subject = subjectElement ? subjectElement.value.trim() : "";
                                        if (subject) agendaItem["subject"] = subject; else console.log("No subject specified");

                                        // students
                                        const selectedStudentCheckboxes = iframeDocument.querySelectorAll('input[name="contact_id[]"]:checked');
                                        const selectedStudents = Array.from(selectedStudentCheckboxes).map(checkBox => checkBox.nextElementSibling.textContent.trim());
                                        if (selectedStudents.length > 0) agendaItem["students"] = selectedStudents; else console.log("No students selected");

                                        // goals
                                        const selectedGoalCheckboxes = iframeDocument.querySelectorAll('input[name="concretisering_id[]"]:checked');
                                        const selectedGoals = Array.from(selectedGoalCheckboxes).map(checkBox => checkBox.nextElementSibling.textContent.trim());
                                        if (selectedGoals.length > 0) agendaItem["goals"] = selectedGoals; else console.log("No goals selected");

                                        // class group
                                        const selectedGroupElement = iframeDocument.getElementById('select_groep_id');
                                        const group = selectedGroupElement ? selectedGroupElement.options[selectedGroupElement.selectedIndex].text.trim() : "";
                                        if (group) agendaItem["group"] = group; else console.log("No group selected");

                                        // course
                                        const selectedCourseElement = iframeDocument.getElementById('select_vak_id');
                                        const course = selectedCourseElement ? selectedCourseElement.options[selectedCourseElement.selectedIndex].text.trim() : "";
                                        if (course) {
                                            if (course in subjectMap) agendaItem["course"] = subjectMap[course];
                                        } else console.log("No course selected");

                                        // date
                                        const dateInputElement = iframeDocument.getElementById('agenda_datum');
                                        const dateValue = dateInputElement ? dateInputElement.value.trim() : "";
                                        if (dateValue) agendaItem["date"] = formatDate(dateValue); else console.log("No date specified");

                                        console.log("Extracted agenda item:", agendaItem);

                                        if (
                                            agendaItem["subject"] &&
                                            agendaItem["students"] && agendaItem["students"].length > 0 &&
                                            agendaItem["goals"] && agendaItem["goals"].length > 0 &&
                                            agendaItem["group"] &&
                                            agendaItem["date"] &&
                                            agendaItem["course"]
                                        ) {
                                            chrome.runtime.sendMessage({
                                                action: "openPopupWithData",
                                                agendaData: agendaItem,
                                                students: agendaItem.students
                                            });
                                        } else {
                                            console.log("Not all agenda items are available. Template generation skipped.");
                                        }
                                    })
                                })
                            }
                        });
                    }
                }
            });
        }
    }
};

const observer = new MutationObserver(callback);
observer.observe(targetNode, config);

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log(message)
    if (message.action === "generateIndividualPdfs") {
        const agendaData = message.agendaData;
        const studentGoals = message.studentGoals;

        if (!agendaData && !studentGoals) {
            console.error("No agenda data or students found for individual PDF generation.");
        }

        for (const studentName of agendaData.students) {
            const individualGoal = studentGoals[studentName] || "";
            await generateTemplate(studentName, agendaData, individualGoal);
        }
    }
});



