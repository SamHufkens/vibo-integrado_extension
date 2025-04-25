// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const studentGoalsDiv = document.getElementById('student-goals');
    const mainGoalsDiv = document.getElementById('main-goals')
    const generateButton = document.getElementById('submit_button');
    let students = [];
    let agendaData;

    // Request data from the background script
    chrome.runtime.sendMessage({ action: "requestStudentData" }, (response) => {
        students = response[0] || [];
        agendaData = response[1];

        if (!response || !response[1] || !response[0] || response[0].length === 0) {
            return;
        }


        generateButton.style.display = 'inline-flex'

        if (students.length > 0) {
            const header = document.createElement('h2')
            header.textContent = 'Individuele Doelen'
            studentGoalsDiv.appendChild(header)

            students.forEach(studentName => {

                const label = document.createElement('label');
                label.textContent = `${studentName}: `;
                label.className = 'individual_goal_label'

                const input = document.createElement('input');
                input.type = 'text';
                input.id = `goal-${studentName.replace(/\s+/g, '-')}`; // Sanitize ID
                input.className = 'individual_goal'
                input.placeholder = 'Optioneel'


                studentGoalsDiv.appendChild(label);
                studentGoalsDiv.appendChild(input);
                studentGoalsDiv.appendChild(document.createElement('br'));
            });
        } else {
            console.error('Geen studenten gevonden.');
        }

        if (agendaData["goals"].length > 0) {
            const header = document.createElement('h2')
            header.textContent = 'Hoofdoelen'
            mainGoalsDiv.appendChild(header)

            agendaData["goals"].forEach((goal, index) => {

                const label = document.createElement('label')
                label.htmlFor = `main-goal-${index}`

                const checkbox = document.createElement("input")
                checkbox.type = "checkbox"
                checkbox.id = `goal-${index}`
                checkbox.name = "goals"
                checkbox.value = goal

                label.appendChild(checkbox)
                label.appendChild(document.createTextNode(` ${goal}`));
                
                mainGoalsDiv.appendChild(label);
                mainGoalsDiv.appendChild(document.createElement("br")); // Add line break for spacing
            })
        } else {
           console.error('Geen hoofdoelen gevonden.');
        }
    });

    generateButton.addEventListener('click', async () => {
        const individualGoals = {};
        const selectedGoals = []

        const oldError = document.getElementById("error");
        if (oldError) oldError.remove();

        students.forEach(studentName => {
            const inputId = `goal-${studentName.replace(/\s+/g, '-')}`;
            const inputElement = document.getElementById(inputId);
            individualGoals[studentName] = inputElement ? inputElement.value.trim() : '';
        });

        const checkboxes = mainGoalsDiv.querySelectorAll('input[type="checkbox"][name="goals"]')
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedGoals.push(checkbox.value)
            }
        })

        const selectedAgendaData = { ...agendaData, goals: selectedGoals };

        if (selectedGoals.length > 0) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "generateIndividualPdfs",
                        studentGoals: individualGoals,
                        agendaData: selectedAgendaData
                    });
                } else {
                    console.error("No active tab found to send generateIndividualPdfs message to.");
                }
            });
        } else {
            const errorTag = document.createElement("p");
            errorTag.textContent = "Je moet minstens 1 doel aanduiden.";
            errorTag.id = "error";
            mainGoalsDiv.appendChild(errorTag);
        }

       
    });
});