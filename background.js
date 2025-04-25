// background.js
let currentAgendaData = null;
let currentStudentList = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "savePdf") {
        const { url, filename } = message;
        chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: true
        });
    } else if (message.action === "openPopupWithData") {
        currentAgendaData = message.agendaData;
        currentStudentList = message.students;
        chrome.action.openPopup();
    } else if (message.action === "requestStudentData") {
        sendResponse([currentStudentList, currentAgendaData]);
        currentAgendaData = null;
        currentStudentList = null;
    } else if (message.action === "openPopup") {
        chrome.action.openPopup();
    }
});

