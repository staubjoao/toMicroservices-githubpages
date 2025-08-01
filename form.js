import { load } from "./main.js";

export let solutionGeneration = new Number(0);
let socket = null;
let numberOfMicroservices = new Number(0);
let crossoverProbability = new Number(0);
let crossoverRatio = new Number(0);
let executions = new Number(0);
let interactive = new Boolean(false);
let generations = new Number(0);
let firstStep = new Number(0);
let selectedTableIndex = new Number(0);
let resultJson = null;

export function showGenerationInfo(curGeneration = null, curSolutionIndex = null) {
    document.getElementById("gen-info-div").style.display = "flex";
    const genText = document.getElementById("generation-b");
    const solText = document.getElementById("solution-index-b");

    if (curGeneration === null) {
        genText.style.display = "none";
    } else {
        genText.style.display = "block";
        genText.textContent = `Generation: ${curGeneration}`;
    }

    if (curGeneration === null || curSolutionIndex === null) {
        document.getElementById("gen-info-hr").style.display = "none";
    } else {
        document.getElementById("gen-info-hr").style.display = "block";
    }

    if (curSolutionIndex === null) {
        solText.style.display = "none";
    } else {
        solText.style.display = "block";
        solText.textContent = `Solution Index: ${curSolutionIndex}`;
    }
}

export function hideGenerationInfo() {
    document.getElementById("gen-info-div").style.display = "none";
}

export function showPopupWindow(
    text1,
    text2,
    showSpinner = true,
    enableSolutionBtn = true,
    showStepInput = false,
    showInteractionTypeBtns = false
) {
    document.getElementById("pop-up-btn").disabled = !enableSolutionBtn;
    document.getElementById("pop-up-text").innerText = text1;
    document.getElementById("pop-up-text-2").innerText = text2;

    if (enableSolutionBtn) {
        document.getElementById("pop-up-btn").style.display = "block";
    } else {
        document.getElementById("pop-up-btn").style.display = "none";
    }

    if (showSpinner) {
        document.getElementById("pop-up-spinner").style.display = "flex";
    } else {
        document.getElementById("pop-up-spinner").style.display = "none";
    }

    if (showStepInput) {
        document.getElementById("step-form").style.display = "flex";
    } else {
        document.getElementById("step-form").style.display = "none";
    }

    if (showInteractionTypeBtns) {
        document.getElementById("interaction-type-div").style.display = "flex";
    } else {
        document.getElementById("interaction-type-div").style.display = "none";
    }

    document.getElementById("window-overlay-pop-up").style.display = "flex";
}

export function hidePopupWindow() {
    document.getElementById("pop-up-btn").disabled = true;
    document.getElementById("window-overlay-pop-up").style.display = "none";
}

export function showInputFormWindow() {
    document.getElementById("window-overlay-form").style.display = "flex";
}

export function hideInputFormWindow() {
    document.getElementById("window-overlay-form").style.display = "none";
}

export function showTableWindow() {
    hideInputFormWindow();
    document.getElementById("window-overlay-table").style.display = "block";

    const tableBody = document.getElementById("table-body");

    const formatNumber = (num) => {
        return parseFloat(num.toFixed(4));
    };

    tableBody.innerHTML = "";
    resultJson.candidates.forEach((candidate) => {
        const row = document.createElement("tr");
        row.index = candidate.index;

        row.innerHTML = `
            <td>${candidate.index}</td>
            <td>${candidate.microservices}</td>
            <td>${formatNumber(candidate.metrics[0].value)}</td>
            <td>${formatNumber(candidate.metrics[1].value)}</td>
            <td>${formatNumber(candidate.metrics[2].value)}</td>
            <td>${formatNumber(candidate.metrics[3].value)}</td>
            <td>${formatNumber(candidate.metrics[4].value)}</td>
        `;

        row.addEventListener("click", function (event) {
            selectedTableIndex = this.index;

            for (const tr of tableBody.children) {
                for (const td of tr.children) {
                    td.classList.remove("selected");
                }
            }

            for (const td of this.children) {
                td.classList.toggle("selected");
            }
        });

        tableBody.appendChild(row);
    });

    // Destaca os melhores candidatos
    let tableColumnOffset = 2;
    for (const name in resultJson.bestCandidates) {
        const tableIndex = resultJson.bestCandidates[name];
        const selectedRow = tableBody.children[tableIndex];

        if (selectedRow) {
            for (const td of selectedRow.children) {
                if (!td.classList.contains("best-candidate")) {
                    td.classList.add("best-candidate");
                }
            }
            selectedRow.children[tableColumnOffset].classList.add("best-metric");
        }

        tableColumnOffset++;
    }

    tableBody.children[0].click();
}

export function hideTableWindow() {
    document.getElementById("window-overlay-table").style.display = "none";
}

export async function getAllSolutions() {
    const apiUrl = "http://localhost:8080/solutions/all-candidates/" + solutionGeneration;

    resultJson = await getSomeData(apiUrl);
    hidePopupWindow();
    showTableWindow();
}

export async function getBestSolutions() {
    const apiUrl = "http://localhost:8080/ngsaiii/graph/" + solutionGeneration;

    resultJson = await getSomeData(apiUrl);
    showPopupWindow("Solution Generated", `Generation: ${solutionGeneration}`, false, true);
    document.getElementById("change-solution-best-btn").disabled = true;
}

export function closeSocketConnection() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
    } else {
        console.log("WebSocket connection is not open.");
    }
}

async function getSomeData(apiUrl) {
    showPopupWindow("Waiting Server Response", `Generation: ${solutionGeneration}`, true, false);

    try {
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            throw new Error(`Request error: ${response.status}`);
        }
        const responseJson = await response.json();
        console.log("Server Response:", responseJson);
        return responseJson;
    } catch (error) {
        console.error("GET Request Error:", error);
        alert("Request error. Check console.");
    }
    return null;
}

async function startWebSocket() {
    try {
        socket = new WebSocket("ws://localhost:8080/ws");
        document.getElementById("submit-button").disabled = true;

        socket.onopen = function () {
            document.getElementById("submit-button").disabled = true;
            console.log("Connected to WebSocket Server!");
            sendMessage();
            hideInputFormWindow();
            showPopupWindow("Connected to WebSocket Server", "Waiting Server Response", true, false);
        };

        socket.onmessage = function (event) {
            try {
                if (event.data.includes("generation")) {
                    solutionGeneration = parseFloat(event.data.split(":")[1]);
                    showPopupWindow(
                        `Solutions Generated\nGeneration: ${solutionGeneration}`,
                        "Which solutions would you like to see?",
                        false,
                        false,
                        false,
                        true
                    );
                }
                console.log(`message from server: ${event.data}`);
            } catch (e) {
                alert("Server Message Error. Check console.");
                console.error("Server Message Error:", e);
            }
        };

        socket.onclose = function () {
            document.getElementById("submit-button").disabled = false;
            console.log("Connection terminated");
        };

        return socket;
    } catch (error) {
        console.error("WebSocket Connection Error:", error);
        alert("WebSocket Connection Error. Check console.");

        return null;
    }
}

async function sendMessage() {
    const jsonMessage = {
        numberOfMicroservices: Number(numberOfMicroservices),
        executions: Number(executions),
        crossoverProbability: parseFloat(crossoverProbability),
        crossoverFraction: parseFloat(crossoverRatio),
        interactive: Boolean(interactive),
        generations: Number(generations),
        firstStep: Number(firstStep),
    };

    try {
        const response = await fetch("http://localhost:8080/ngsaiii/start", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(jsonMessage),
        });

        if (!response.ok) {
            throw new Error(`Request Error: ${response.status}`);
        }

        const result = await response.text();
        console.log("Server Response:", result);
    } catch (error) {
        console.error("Request Error:", error);
        alert("Request Error. Check console.");
    }
}

document.getElementById("interact-checkbox").addEventListener("change", function () {
    if (this.checked) {
        document.getElementById("generations-div").style.display = "block";
        document.getElementById("first-step-div").style.display = "block";
    } else {
        document.getElementById("generations-div").style.display = "none";
        document.getElementById("first-step-div").style.display = "none";
    }
});

document.getElementById("input-form").addEventListener("submit", function (event) {
    event.preventDefault();

    // const inputLog = document.getElementById("log-entrada").value;
    numberOfMicroservices = Math.floor(document.getElementById("num-ms").value);
    crossoverProbability = document.getElementById("prob").value;
    crossoverRatio = document.getElementById("frac").value;
    executions = document.getElementById("executions").value;
    interactive = document.getElementById("interact-checkbox").checked;
    generations = document.getElementById("generations").value;
    firstStep = document.getElementById("first-step").value;

    startWebSocket();
});

document.getElementById("file-load-btn").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const jsonData = JSON.parse(e.target.result);
            if (!jsonData) throw new Error("Invalid JSON file.");
            console.log("JSON file loaded:", jsonData);

            load(jsonData);
            hideInputFormWindow();
            hideGenerationInfo();
        } catch (error) {
            console.error("Could not load JSON file:", error);
            alert("Could not load JSON file. Check console.");
        }
    };
    reader.readAsText(file);
});

document.getElementById("pop-up-btn").addEventListener("click", function () {
    load(resultJson, true);
    hidePopupWindow();
});

document.getElementById("get-all-btn").addEventListener("click", getAllSolutions);

document.getElementById("get-best-btn").addEventListener("click", getBestSolutions);

document.getElementById("table-confirm-btn").addEventListener("click", async function () {
    resultJson = await getSomeData(`http://localhost:8080/solutions/${solutionGeneration}/${selectedTableIndex}`);
    hideTableWindow();
    showPopupWindow("Solution Generated", `Generation: ${solutionGeneration}`, false, true);
    document.getElementById("change-solution-best-btn").disabled = false;
});

document.getElementById("save-btn").addEventListener("click", async function () {
    if (!confirm("Do you want to save the solution?") || !resultJson) {
        return;
    }

    resultJson.interactive = false;
    const jsonString = JSON.stringify(resultJson, null, 2);

    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: `solution_generation_${solutionGeneration}.json`,
            types: [
                {
                    description: "JSON Files",
                    accept: { "application/json": [".json"] },
                },
            ],
        });

        const writableStream = await fileHandle.createWritable();
        await writableStream.write(jsonString);
        await writableStream.close();
    } catch (error) {
        console.error("Error saving file:", error);
    }
});
