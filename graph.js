import cytoscape from "cytoscape";
import expandCollapse from "cytoscape-expand-collapse";
import fcose from "cytoscape-fcose";
import {
    solutionGeneration,
    showPopupWindow,
    getAllSolutions,
    getBestSolutions,
    showGenerationInfo,
    hideGenerationInfo,
    closeSocketConnection,
} from "./form";

cytoscape.use(expandCollapse);
cytoscape.use(fcose);

// Elementos do grafo
let solution = null;
let microservices = null;
let graph = null;
const edgeSeparationMultiplier = 100;

// HTML containers
const selectionContainer = document.getElementById("selection-container");
const functionalityListContainer = document.getElementById("func-list-container");
const changesDiv = document.getElementById("changed-microservices-div");
const windowDiv = document.getElementById("window-overlay-info");
const splitWindowDiv = document.getElementById("window-overlay-split");
const symbolGuide = document.getElementById("symbol-guide");
const mousePopUp = document.getElementById("mouse-pop-up");
const stepForm = document.getElementById("step-form");
const metricContainer = document.getElementById("metrics-container");

// HTML text
const selectionName = document.getElementById("selection-name");
const callsText = document.getElementById("calls-h2");
const componentsText = document.getElementById("comp-h2");
const functionalitiesText = document.getElementById("func-h2");
const windowHeader = document.getElementById("window-header");
const windowSplitHeader = document.getElementById("window-split-header");
const functionalitiesHeader = document.getElementById("functionalities-header");
const componentsHeader = document.getElementById("components-header");
const splitComponentsHeader = document.getElementById("split-components-header");
const frozenListHeader = document.getElementById("frozen-microservices-header");
const splitListHeader = document.getElementById("split-microservices-header");
const joinedListHeader = document.getElementById("joined-microservices-header");
const splitMsLabelA = document.getElementById("msA-label");
const splitMsLabelB = document.getElementById("msB-label");

// HTML lists
const functionalityList = document.getElementById("func-list");
const frozenList = document.getElementById("frozen-microservices-list");
const splitList = document.getElementById("split-microservices-list");
const joinedList = document.getElementById("joined-microservices-list");
const windowFunctionalityList = document.getElementById("functionalities-list-window");
const splitFunctionalityList = document.getElementById("functionalities-list-split");
const windowComponentList = document.getElementById("components-list-window");
const dropabbleListA = document.getElementById("droppable-list-A");
const dropabbleListB = document.getElementById("droppable-list-B");

// HTML buttons
const freezeBtn = document.getElementById("freeze-btn");
const splitBtn = document.getElementById("split-btn");
const moveBtn = document.getElementById("move-btn");
const joinBtn = document.getElementById("join-btn");
const detailsBtn = document.getElementById("details-btn");
const windowCloseBtn = document.getElementById("window-close-btn");
const splitCloseBtn = document.getElementById("window-split-close-btn");
const splitAcceptBtn = document.getElementById("window-split-accept-btn");
const resetBtn = document.getElementById("reset");
const applyBtn = document.getElementById("apply-btn");
const multSelectBtn = document.getElementById("mult-select-btn");
const changeSolutionAllBtn = document.getElementById("change-solution-all-btn");
const changeSolutionBestBtn = document.getElementById("change-solution-best-btn");
const stopInteractionBtn = document.getElementById("stop-interaction-btn");

// HTML other
const metricShowIcon = document.getElementById("down-arrow");
const editIcon = document.getElementById("edit-icon");

// Elementos auxiliáres
let changedNames = new Array();
let frozenMicroservicesIndex = new Array();
let unfrozenMicroservicesIndex = new Array();
let splitMicroservices = new Array();
let joinedMicroservices = new Array();
let currSplitComponents = new Array();
let currFunctionalities = new Map();
let currComponents = new Array();
let selectedElement = null;
let draggedItem = null;
let selectedListItems = new Set();
let multipleSelectionNodes = new Array();
let timeoutId = null;

let isMoving = false;
let componentsMovedToA = new Array();
let componentsMovedToB = new Array();
let movedList = new Array();

// Observador para a adição e remoção de nós na lista de divisão e movimentação
const splitListObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.target.interactive === false) {
            continue;
        }
        if (mutation.type === "childList" && mutation.removedNodes.length > 0) {
            for (const node of mutation.removedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (isMoving) {
                        if (componentsMovedToB.includes(node.data)) {
                            componentsMovedToB.splice(componentsMovedToB.indexOf(node.data), 1);
                        }
                        componentsMovedToA.push(node.data);
                    } else {
                        if (currSplitComponents.includes(node.data)) {
                            currSplitComponents.splice(currSplitComponents.indexOf(node.data), 1);
                        }
                    }
                }
            }
        } else if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (isMoving) {
                        if (componentsMovedToA.includes(node.data)) {
                            componentsMovedToA.splice(componentsMovedToA.indexOf(node.data), 1);
                        }
                        componentsMovedToB.push(node.data);
                    } else {
                        if (!currSplitComponents.includes(node.data)) {
                            currSplitComponents.push(node.data);
                        }
                    }
                }
            }
        }
    }
});

splitListObserver.observe(dropabbleListB, { childList: true });

function setColor4CompoundEdge(e) {
    const collapsedEdges = e.data("collapsedEdges");
    if (doElemsMultiTypes(collapsedEdges)) {
        return "#b3b3b3";
    }
    return collapsedEdges[0].style("line-color");
}

function setTargetArrowShape(e) {
    const collapsedEdges = e.data("collapsedEdges");
    const shapes = {};
    for (let i = 0; i < collapsedEdges.length; i++) {
        shapes[collapsedEdges[0].style("target-arrow-shape")] = true;
    }
    delete shapes["none"];
    if (Object.keys(shapes).length < 1) {
        if (collapsedEdges.sources().length > 1) {
            return collapsedEdges[0].style("source-arrow-shape");
        }
        return "none";
    }
    return Object.keys(shapes)[0];
}

function setSourceArrowShape(e) {
    const collapsedEdges = e.data("collapsedEdges");
    const shapes = {};
    for (let i = 0; i < collapsedEdges.length; i++) {
        shapes[collapsedEdges[0].style("source-arrow-shape")] = true;
    }
    delete shapes["none"];
    if (Object.keys(shapes).length < 1) {
        if (collapsedEdges.sources().length > 1) {
            return collapsedEdges[0].style("target-arrow-shape");
        }
        return "none";
    }
    return Object.keys(shapes)[0];
}

function doElemsMultiTypes(elems) {
    const classDict = {};
    for (let i = 0; i < elems.length; i++) {
        classDict[elems[i].data("edgeType")] = true;
    }
    return Object.keys(classDict).length > 1;
}

function activateAccordions() {
    const acc = document.getElementsByClassName("accordion");

    for (let i = 0; i < acc.length; i++) {
        acc[i].addEventListener("click", function () {
            // Fecha todos os outros painéis
            for (let j = 0; j < acc.length; j++) {
                if (acc[j] !== this) {
                    acc[j].classList.remove("active");
                    acc[j].nextElementSibling.style.maxHeight = null;
                }
            }

            // Alterna o painel atual
            this.classList.toggle("active");
            let panel = this.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    }
}

// Ajusta a altura máxima de uma lista com base na altura do primeiro item
function adjustListHeight(list) {
    let items = list.getElementsByTagName("li");
    if (items.length > 0) {
        const itemHeight = items[0].offsetHeight;
        list.style.maxHeight = itemHeight * 3 + "px";
    }
}

// Muda a opacidade de uma cor HSLA
function changeHslaOpacity(hsla, opacity) {
    return hsla.replace("1)", opacity + ")");
}

// Monta uma lista de funcionalidades
function buildFuncList(list, htmlList, onClick = null, generalListOnClick = null, hasPercentages = true) {
    htmlList.innerHTML = "";

    if (generalListOnClick) {
        const listItem = document.createElement("li");
        listItem.textContent = "All";
        htmlList.appendChild(listItem);
        listItem.addEventListener("click", generalListOnClick);
    }

    if (hasPercentages) {
        list.forEach((f, i) => {
            const listItem = document.createElement("li");
            listItem.textContent = `${i} (${f.toFixed(2)}%)`;
            htmlList.appendChild(listItem);
            if (onClick) {
                listItem.addEventListener("click", onClick);
            }
        });
    } else {
        list.forEach((f) => {
            const listItem = document.createElement("li");
            listItem.textContent = f;
            htmlList.appendChild(listItem);
            if (onClick) {
                listItem.addEventListener("click", onClick);
            }
        });
    }
}

// Monta uma lista de componentes
function buildComponentList(list, htmlList, onClick = null, draggable = false, appendData = false) {
    htmlList.innerHTML = "";
    list.forEach((c) => {
        const listItem = document.createElement("li");
        listItem.textContent = c.name;
        htmlList.appendChild(listItem);
        if (appendData) {
            listItem.data = c;
        }

        if (onClick) {
            listItem.addEventListener("click", onClick);
        }

        if (draggable) {
            listItem.setAttribute("draggable", true);
            listItem.addEventListener("dragstart", (e) => {
                draggedItem = listItem;
                setTimeout(() => {
                    selectedListItems.forEach((item) => {
                        item.classList.remove("selected");
                    });
                    selectedListItems.clear();
                    listItem.style.display = "none"; // esconde enquanto arrasta
                }, 0);
            });
            listItem.addEventListener("dragend", (e) => {
                setTimeout(() => {
                    listItem.style.display = "block"; // mostra de novo ao soltar
                    draggedItem = null;
                    selectedListItems.forEach((item) => {
                        item.classList.remove("selected");
                    });
                    selectedListItems.clear();
                }, 0);
            });
            listItem.addEventListener("click", (e) => {
                if (e.shiftKey) {
                    if (selectedListItems.has(listItem)) {
                        selectedListItems.delete(listItem);
                        listItem.classList.remove("selected");
                    } else {
                        selectedListItems.add(listItem);
                        listItem.classList.add("selected");
                    }
                } else if (e.ctrlKey || e.metaKey) {
                    const items = Array.from(listItem.parentNode.children);
                    let startIndex = items.indexOf(selectedListItems.values().next().value);
                    let endIndex = items.indexOf(listItem);

                    if (startIndex > endIndex) {
                        [startIndex, endIndex] = [endIndex, startIndex];
                    }

                    for (let i = startIndex; i <= endIndex; i++) {
                        const item = items[i];
                        item.classList.add("selected");
                        if (!selectedListItems.has(item)) {
                            selectedListItems.add(item);
                        }
                    }
                } else {
                    selectedListItems.forEach((item) => {
                        item.classList.remove("selected");
                    });
                    selectedListItems.clear();
                    selectedListItems.add(listItem);
                    listItem.classList.add("selected");
                }
            });
            listItem.setAttribute("ondragstart", "event.dataTransfer.setData('text/plain', null);"); // Para Firefox
        }
    });
}

// Atualizar a lista de microsserviços congelados
function updateFrozenList() {
    frozenListHeader.style.display = "block";
    if (frozenMicroservicesIndex.length === 0) {
        frozenListHeader.style.display = "none";
        frozenList.innerHTML = "";
    } else {
        changesDiv.style.display = "block";
        frozenList.innerHTML = "";
        for (const m of frozenMicroservicesIndex) {
            const listItem = document.createElement("li");
            listItem.textContent = graph.$("#" + `microservice${m}`).data("name");
            frozenList.appendChild(listItem);
        }
    }

    if (splitMicroservices.length === 0) {
        splitListHeader.style.display = "none";
        splitList.innerHTML = "";
    }
    if (joinedMicroservices.length === 0) {
        joinedListHeader.style.display = "none";
        joinedList.innerHTML = "";
    }
    if (splitMicroservices.length === 0 && frozenMicroservicesIndex.length === 0 && joinedMicroservices.length === 0) {
        changesDiv.style.display = "none";
    }
}

// Atualizar a lista de microsserviços divididos
function updateSplitList(microserviceName = null) {
    if (microserviceName) {
        if (currSplitComponents.length === 0) {
            splitMicroservices = splitMicroservices.filter((m) => m.nameMicroservice !== microserviceName);
            graph.$("#" + microserviceName).removeClass("split");
        } else {
            const obj = {
                nameMicroservice: microserviceName,
                componentsList: currSplitComponents,
            };

            const index = splitMicroservices.findIndex((m) => m.nameMicroservice === microserviceName);
            if (index !== -1) {
                splitMicroservices[index] = obj;
            } else {
                splitMicroservices.push(obj);
            }
        }
    }

    splitListHeader.style.display = "block";
    if (splitMicroservices.length === 0) {
        splitList.innerHTML = "";
        splitListHeader.style.display = "none";
    } else {
        changesDiv.style.display = "block";
        splitList.innerHTML = "";
        for (const m of splitMicroservices) {
            const node = graph.$("#" + m.nameMicroservice);
            const listItem = document.createElement("li");
            listItem.textContent = `${node.data("name")} (${m.componentsList.length})`;
            splitList.appendChild(listItem);
            node.addClass("split");
        }
    }

    if (frozenMicroservicesIndex.length === 0) {
        frozenListHeader.style.display = "none";
        frozenList.innerHTML = "";
    }
    if (joinedMicroservices.length === 0) {
        joinedListHeader.style.display = "none";
        joinedList.innerHTML = "";
    }
    if (frozenMicroservicesIndex.length === 0 && splitMicroservices.length === 0 && joinedMicroservices.length === 0) {
        changesDiv.style.display = "none";
    }
}

// Atualizar a lista de microsserviços unidos
function updateJoinedList() {
    joinedListHeader.style.display = "block";
    if (joinedMicroservices.length === 0) {
        joinedList.innerHTML = "";
        joinedListHeader.style.display = "none";
    } else {
        changesDiv.style.display = "block";
        joinedList.innerHTML = "";
        for (const m of joinedMicroservices) {
            const sourceNode = graph.$("#" + m.source);
            const targetNode = graph.$("#" + m.target);
            const listItem = document.createElement("li");
            listItem.textContent = `${sourceNode.data("name")} >< ${targetNode.data("name")}`;
            joinedList.appendChild(listItem);
        }
    }

    if (frozenMicroservicesIndex.length === 0) {
        frozenListHeader.style.display = "none";
        frozenList.innerHTML = "";
    }
    if (splitMicroservices.length === 0) {
        splitListHeader.style.display = "none";
        splitList.innerHTML = "";
    }
    if (frozenMicroservicesIndex.length === 0 && splitMicroservices.length === 0 && joinedMicroservices.length === 0) {
        changesDiv.style.display = "none";
    }
}

// Atualizar a lista de movimentações entre microsserviços
function updateMovedList(nameMsA, nameMsB) {
    // Verificar métodos movidos de volta
    const originalComponentsA = microservices.get(nameMsA).components;
    const originalComponentsB = microservices.get(nameMsB).components;
    componentsMovedToA = componentsMovedToA.filter((c) => {
        return !originalComponentsA.includes(c);
    });
    componentsMovedToB = componentsMovedToB.filter((c) => {
        return !originalComponentsB.includes(c);
    });

    if (componentsMovedToA.length !== 0) {
        const obj = {
            source: nameMsB,
            target: nameMsA,
            componentsList: componentsMovedToA,
        };

        const index = movedList.findIndex((m) => m.source === nameMsB && m.target === nameMsA);
        if (index !== -1) {
            movedList[index] = obj;
        } else {
            movedList.push(obj);
        }
    } else {
        movedList = movedList.filter((item) => item.source !== nameMsB && item.target !== nameMsA);
    }

    if (componentsMovedToB.length !== 0) {
        const obj = {
            source: nameMsA,
            target: nameMsB,
            componentsList: componentsMovedToB,
        };

        const index = movedList.findIndex((m) => m.source === nameMsA && m.target === nameMsB);
        if (index !== -1) {
            movedList[index] = obj;
        } else {
            movedList.push(obj);
        }
    } else {
        movedList = movedList.filter((item) => item.source !== nameMsA && item.target !== nameMsB);
    }

    // Atualizar ícones de movimentação
    microservices.forEach((m) => {
        const indexOut = movedList.findIndex((item) => item.source === m.id);
        const indexIn = movedList.findIndex((item) => item.target === m.id);

        if (indexOut !== -1) {
            graph.$("#" + m.id).addClass("out");
        } else {
            graph.$("#" + m.id).removeClass("out");
        }

        if (indexIn !== -1) {
            graph.$("#" + m.id).addClass("in");
        } else {
            graph.$("#" + m.id).removeClass("in");
        }
    });

    console.log(movedList);
}

// Verificar se algum microsserviço está congelado e atualizar a lista
function checkFrozen(microservices) {
    microservices.forEach((m) => {
        if (m.freeze) {
            const node = graph.$("#" + m.id);
            node.addClass("frozen");
            if (!frozenMicroservicesIndex) {
                frozenMicroservicesIndex = new Array();
            }
            frozenMicroservicesIndex.push(node.data("index"));
        }
    });

    updateFrozenList();
}

// Verifica as restrições de ações com base nos nós selecionados
function verifyRestrictions(node1, node2 = null) {
    moveBtn.disabled = true;
    joinBtn.disabled = true;
    freezeBtn.disabled = true;
    splitBtn.disabled = true;

    if (node1.hasClass("frozen") || node2?.hasClass("frozen")) {
        freezeBtn.disabled = false;
    } else if (node1.hasClass("split") || node2?.hasClass("split")) {
        splitBtn.disabled = false;
    } else if (node1.hasClass("out") || node1.hasClass("in") || node2?.hasClass("out") || node2?.hasClass("in")) {
        moveBtn.disabled = false;
    } else if (
        !joinedMicroservices.some((m) => m.source === node1.data("id") && m.target === node2?.data("id")) &&
        (joinedMicroservices.some((m) => m.source === node1.data("id") || m.target === node1.data("id")) ||
            joinedMicroservices.some((m) => m.source === node2?.data("id") || m.target === node2?.data("id")))
    ) {
        joinBtn.disabled = true;
    } else if (node1.hasClass("join") || node2?.hasClass("join")) {
        moveBtn.disabled = true;
        joinBtn.disabled = false;
    } else {
        moveBtn.disabled = false;
        joinBtn.disabled = false;
        freezeBtn.disabled = false;
        splitBtn.disabled = false;
    }
}

// Ao clicar para exibir ou ocultar as métricas
metricShowIcon.addEventListener("click", function () {
    metricContainer.style.display = metricContainer.style.display === "none" ? "block" : "none";
    metricShowIcon.style.transform = metricContainer.style.display === "none" ? "rotate(0deg)" : "rotate(180deg)";
});

// Ao clicar no botão de detalhes
detailsBtn.addEventListener("click", function () {
    if (selectedElement == null || selectedElement.isParent()) return;

    windowDiv.style.display = "flex";

    if (selectedElement.data("source")) {
        const sourceId = selectedElement.data("source");
        const targetId = selectedElement.data("target");
        windowHeader.textContent = graph.$("#" + sourceId).data("name") + " → " + graph.$("#" + targetId).data("name");
    } else {
        windowHeader.textContent = selectedElement.data("name");
    }

    windowHeader.style.backgroundColor = changeHslaOpacity(selectedElement.data("color"), 0.3);
    windowHeader.style.color = "#000";

    windowComponentList.innerHTML = "";

    const listItemFunc = function (event) {
        for (const child of windowFunctionalityList.children) {
            child.classList.remove("selected");
        }
        event.target.classList.toggle("selected");

        const functionalityName = event.target.textContent.split(" ")[0];
        if (functionalityName === undefined) return;

        const components = new Array();

        for (const c of currComponents) {
            if (c.functionalities.includes(functionalityName)) {
                components.push(c);
            }
        }

        buildComponentList(components, windowComponentList);
        componentsHeader.textContent = `Methods (${components.length})`;
    };

    const generalListFunc = function (event) {
        for (const child of windowFunctionalityList.children) {
            child.classList.remove("selected");
        }
        event.target.classList.toggle("selected");

        buildComponentList(currComponents, windowComponentList);
        componentsHeader.textContent = `Methods (${currComponents.length})`;
    };

    buildFuncList(currFunctionalities, windowFunctionalityList, listItemFunc, generalListFunc);

    functionalitiesHeader.textContent = `Functionalities (${currFunctionalities.size})`;

    windowFunctionalityList.children[0].click();
});

// Ao clicar no botão de dividir
splitBtn.addEventListener("click", function () {
    if (selectedElement == null || selectedElement.isParent()) return;

    splitWindowDiv.style.display = "flex";

    windowSplitHeader.textContent = `Split ${selectedElement.data("name")}`;
    windowSplitHeader.style.backgroundColor = changeHslaOpacity(selectedElement.data("color"), 0.3);

    dropabbleListA.innerHTML = "";
    dropabbleListB.innerHTML = "";

    splitMsLabelA.textContent = selectedElement.data("name");

    isMoving = false;

    // Obter componentes em divisão
    currSplitComponents = new Array();
    splitMicroservices.find((m) => {
        if (m.nameMicroservice === selectedElement.data("id")) {
            currSplitComponents = m.componentsList;
        }
    });

    const listItemFunc = function (event) {
        for (const child of splitFunctionalityList.children) {
            child.classList.remove("selected");
        }
        event.target.classList.toggle("selected");

        const functionalityName = event.target.textContent.split(" ")[0];
        if (functionalityName === undefined) return;

        splitComponentsHeader.textContent = `Methods (${functionalityName})`;

        // Filtrar componentes da lista B
        const filteredComponentsB = currSplitComponents.filter((c) => {
            return c.functionalities.includes(functionalityName);
        });

        // Filtrar componentes da lista A
        const filteredComponentsA = currComponents.filter((c) => {
            return !currSplitComponents.includes(c) && c.functionalities.includes(functionalityName);
        });

        dropabbleListB.interactive = false;

        buildComponentList(filteredComponentsA, dropabbleListA, null, true, true);
        buildComponentList(filteredComponentsB, dropabbleListB, null, true, true);

        setTimeout(() => {
            dropabbleListB.interactive = true;
        }, 0);
    };

    const generalListFunc = function (event) {
        for (const child of splitFunctionalityList.children) {
            child.classList.remove("selected");
        }
        event.target.classList.toggle("selected");

        splitComponentsHeader.textContent = `Methods (All)`;

        // filtrar componentes que não estão na lista B
        const filteredComponents = currComponents.filter((c) => {
            return !currSplitComponents.includes(c);
        });

        dropabbleListB.interactive = false;

        buildComponentList(filteredComponents, dropabbleListA, null, true, true);
        buildComponentList(currSplitComponents, dropabbleListB, null, true, true);

        setTimeout(() => {
            dropabbleListB.interactive = true;
        }, 0);
    };

    buildFuncList(currFunctionalities, splitFunctionalityList, listItemFunc, generalListFunc);

    splitFunctionalityList.children[0].click();
});

// Ao clicar no botão de mover
moveBtn.addEventListener("click", function () {
    const nodeA = multipleSelectionNodes[0];
    const nodeB = multipleSelectionNodes[1];

    splitWindowDiv.style.display = "flex";

    windowSplitHeader.textContent = `Move methods between ${nodeA.data("name")} and ${nodeB.data("name")}`;
    windowSplitHeader.style.backgroundColor = changeHslaOpacity(selectedElement.data("color"), 0.3);

    splitMsLabelA.textContent = nodeA.data("name");
    splitMsLabelB.textContent = nodeB.data("name");

    dropabbleListA.innerHTML = "";
    dropabbleListB.innerHTML = "";

    let componentsA = microservices.get(nodeA.data("id")).components;
    let componentsB = microservices.get(nodeB.data("id")).components;

    isMoving = true;

    // Filtrar componentes movidos
    componentsMovedToA = new Array();
    componentsMovedToB = new Array();
    movedList.forEach((m) => {
        if (m.source === nodeA.data("id")) {
            componentsA = componentsA.filter((c) => !m.componentsList.includes(c));
        } else if (m.source === nodeB.data("id")) {
            componentsB = componentsB.filter((c) => !m.componentsList.includes(c));
        }

        if (m.source === nodeA.data("id") && m.target === nodeB.data("id")) {
            componentsMovedToB = m.componentsList;
        } else if (m.source === nodeB.data("id") && m.target === nodeA.data("id")) {
            componentsMovedToA = m.componentsList;
        }
    });

    const listItemFunc = function (event) {
        for (const child of splitFunctionalityList.children) {
            child.classList.remove("selected");
        }
        event.target.classList.toggle("selected");

        const functionalityName = event.target.textContent.split(" ")[0];
        if (functionalityName === undefined) return;

        splitComponentsHeader.textContent = `Methods (${functionalityName})`;

        // Filtrar componentes da lista A
        const filteredComponentsA = componentsA.filter((c) => {
            return c.functionalities.includes(functionalityName) && !componentsMovedToB.includes(c);
        });

        componentsMovedToA.forEach((c) => {
            if (c.functionalities.includes(functionalityName)) {
                filteredComponentsA.push(c);
            }
        });

        // Filtrar componentes da lista B
        const filteredComponentsB = componentsB.filter((c) => {
            return c.functionalities.includes(functionalityName) && !componentsMovedToA.includes(c);
        });

        componentsMovedToB.forEach((c) => {
            if (c.functionalities.includes(functionalityName)) {
                filteredComponentsB.push(c);
            }
        });

        dropabbleListB.interactive = false;

        buildComponentList(filteredComponentsA, dropabbleListA, null, true, true);
        buildComponentList(filteredComponentsB, dropabbleListB, null, true, true);

        setTimeout(() => {
            dropabbleListB.interactive = true;
        }, 0);
    };

    const generalListFunc = function (event) {
        for (const child of splitFunctionalityList.children) {
            child.classList.remove("selected");
        }
        event.target.classList.toggle("selected");

        splitComponentsHeader.textContent = `Methods (All)`;

        // filtrar componentes da lista A
        const filteredComponentsA = componentsA.filter((c) => {
            return !componentsMovedToB.includes(c);
        });

        componentsMovedToA.forEach((c) => {
            if (!filteredComponentsA.includes(c)) {
                filteredComponentsA.push(c);
            }
        });

        // filtrar componentes da lista B
        const filteredComponentsB = componentsB.filter((c) => {
            return !componentsMovedToA.includes(c);
        });

        componentsMovedToB.forEach((c) => {
            if (!filteredComponentsB.includes(c)) {
                filteredComponentsB.push(c);
            }
        });

        dropabbleListB.interactive = false;

        buildComponentList(filteredComponentsA, dropabbleListA, null, true, true);
        buildComponentList(filteredComponentsB, dropabbleListB, null, true, true);

        setTimeout(() => {
            dropabbleListB.interactive = true;
        }, 0);
    };

    // Concatenar funcionalidades
    const functionalities = microservices.get(nodeA.id()).getFunctionalities();
    microservices
        .get(nodeB.id())
        .getFunctionalities()
        .forEach((f) => {
            if (!functionalities.includes(f)) {
                functionalities.push(f);
            }
        });

    buildFuncList(functionalities, splitFunctionalityList, listItemFunc, generalListFunc, false);

    splitFunctionalityList.children[0].click();
});

// Ao clicar no botão de juntar
joinBtn.addEventListener("click", function () {
    const nodeA = multipleSelectionNodes[0];
    const nodeB = multipleSelectionNodes[1];

    if (nodeA.hasClass("join") && nodeB.hasClass("join")) {
        joinedMicroservices = joinedMicroservices.filter((m) => {
            return (
                !(m.source === nodeA.data("id") && m.target === nodeB.data("id")) &&
                !(m.source === nodeB.data("id") && m.target === nodeA.data("id"))
            );
        });

        nodeA.removeClass("join");
        nodeB.removeClass("join");
    } else {
        joinedMicroservices.push({
            source: nodeA.data("id"),
            target: nodeB.data("id"),
        });

        nodeA.addClass("join");
        nodeB.addClass("join");
    }

    console.log(joinedMicroservices);

    verifyRestrictions(nodeA, nodeB);
    updateJoinedList();
});

// Para elementos de arrastar e soltar
document.querySelectorAll(".droppable-list").forEach((list) => {
    list.addEventListener("dragover", (e) => {
        e.preventDefault(); // permite soltar
    });

    list.addEventListener("drop", (e) => {
        if (draggedItem) {
            list.appendChild(draggedItem);
        }
    });
});

// Ao clicar no botão de mover para a lista B
document.getElementById("move-to-b").addEventListener("click", () => {
    const selected = dropabbleListA.querySelectorAll("li.selected");
    if (selected.length > 0) {
        selected.forEach((item) => {
            dropabbleListB.appendChild(item);
            item.classList.remove("selected");
        });
    } else {
        const selectedItem = dropabbleListA.children[0];
        if (selectedItem) {
            dropabbleListB.appendChild(selectedItem);
            selectedItem.classList.remove("selected");
        }
    }
});

// Ao clicar no botão de mover para a lista A
document.getElementById("move-to-a").addEventListener("click", () => {
    const selected = dropabbleListB.querySelectorAll("li.selected");
    if (selected.length > 0) {
        selected.forEach((item) => {
            dropabbleListA.appendChild(item);
            item.classList.remove("selected");
        });
    } else {
        const selectedItem = dropabbleListB.children[0];
        if (selectedItem) {
            dropabbleListA.appendChild(selectedItem);
            selectedItem.classList.remove("selected");
        }
    }
});

// Ao clicar no botão de congelar/descongelar
freezeBtn.addEventListener("click", function () {
    if (selectedElement == null || selectedElement.isParent()) return;

    // Caso nenhum microsserviço tenha sido adicionado
    if (!frozenMicroservicesIndex) {
        frozenMicroservicesIndex = new Array();
    }

    // Adicionar ou remover microserviço congelado
    if (frozenMicroservicesIndex.includes(selectedElement.data("index"))) {
        selectedElement.removeClass("frozen");
        frozenMicroservicesIndex = frozenMicroservicesIndex.filter((m) => m !== selectedElement.data("index"));
        unfrozenMicroservicesIndex.push(selectedElement.data("index"));
        freezeBtn.textContent = "Freeze";
    } else {
        selectedElement.addClass("frozen");
        frozenMicroservicesIndex.push(selectedElement.data("index"));
        unfrozenMicroservicesIndex = unfrozenMicroservicesIndex.filter((m) => m !== selectedElement.data("index"));
        freezeBtn.textContent = "Unfreeze";
    }

    updateFrozenList();

    verifyRestrictions(selectedElement);
});

// Ao clicar no botão de fechar a janela de detalhes
windowCloseBtn.addEventListener("click", function () {
    windowDiv.style.display = "none";
});

// Ao clicar fora da janela de detalhes
windowDiv.addEventListener("click", function (event) {
    if (event.target === windowDiv) {
        windowDiv.style.display = "none";
    }
});

// Ao clicar no botão de fechar a janela de divisão
splitCloseBtn.addEventListener("click", function () {
    splitWindowDiv.style.display = "none";
});

// Ao clicar no botão de confirmar na janela de divisão
splitAcceptBtn.addEventListener("click", function () {
    if (isMoving) {
        const nodeA = multipleSelectionNodes[0];
        const nodeB = multipleSelectionNodes[1];
        updateMovedList(nodeA.data("id"), nodeB.data("id"));
    } else {
        if (currSplitComponents.length == microservices.get(selectedElement.data("id")).components.length) {
            mousePopUp.style;
            showMousePopUp(this, `${selectedElement.data("name")} cannot be left empty.`);
            return;
        } else {
            updateSplitList(selectedElement.data("id"));
        }
    }
    verifyRestrictions(selectedElement);
    splitWindowDiv.style.display = "none";
});

// Ao clicar fora da janela de divisão
splitWindowDiv.addEventListener("click", function (event) {
    if (event.target === splitWindowDiv) {
        splitAcceptBtn.click();
    }
});

// Eventos para mudança do nome de nó
selectionName.addEventListener("blur", function (event) {
    if (this.textContent !== "") {
        selectedElement.data("name", this.textContent);
        selectedElement.data(
            "label",
            `${this.textContent} (${microservices.get(selectedElement.data("id")).components.length})`
        );
        updateFrozenList();
        updateSplitList();
        changedNames = changedNames.filter((c) => c.id !== selectedElement.data("id"));
        changedNames.push({
            id: selectedElement.data("id"),
            name: this.textContent,
        });
    }
});

selectionName.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        this.blur();
    }
});

selectionName.addEventListener("input", function () {
    const maxChars = 20;
    if (this.textContent.length > maxChars) {
        this.textContent = this.textContent.slice(0, maxChars);
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(this);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    }
});

editIcon.addEventListener("click", function () {
    selectionName.focus();
});

// Ao clicar no botão de seleção múltipla
multSelectBtn.addEventListener("click", function () {
    this.classList.toggle("active");
});

// Ao clicar no botão de aplicar mudanças
applyBtn.addEventListener("click", async function () {
    showPopupWindow("Please enter the next interaction step size", "", false, false, true);
});

// Ao clicar na legenda de símbolos
symbolGuide.addEventListener("click", function () {
    document.querySelectorAll(".guide-elem-container").forEach((content) => {
        content.style.display = content.style.display === "none" ? "flex" : "none";
    });
});

// Ao clicar no botão de enviar interação
stepForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    console.log(frozenMicroservicesIndex);
    const apiUrl = "http://localhost:8080/ngsaiii/interation";

    // Filtrar lista de split para apenas ids
    const splitDetailsList = splitMicroservices.map((m) => {
        return {
            nameMicroservice: m.nameMicroservice,
            idVertexList: m.componentsList.map((c) => c.id),
        };
    });

    // Filtrar lista de moved para apenas ids
    const moveDetailsList = movedList.map((m) => {
        return {
            sourceMicroservice: m.source,
            destinationMicroservice: m.target,
            idVertexList: m.componentsList.map((c) => c.id),
        };
    });

    // Criar lista de microserviços unidos
    const microserviceJoinDetails = joinedMicroservices.map((m) => {
        return {
            nameMicroservice1: m.source,
            nameMicroservice2: m.target,
            idVertexListMicroservice1: microservices.get(m.source).components.map((c) => c.id),
            idVertexListMicroservice2: microservices.get(m.target).components.map((c) => c.id),
        };
    });

    const jsonMessage = {
        generation: solutionGeneration,
        microservicesFreeze: frozenMicroservicesIndex || [],
        microservicesUnfreeze: unfrozenMicroservicesIndex || [],
        splitDetailsList: splitDetailsList || [],
        moveDetailsList: moveDetailsList || [],
        microserviceJoinDetails: microserviceJoinDetails || [],
        changedNames: changedNames || [],
        nextStep: Number(document.getElementById("step").value),
    };

    console.log("Sending POST Request:", jsonMessage);

    try {
        showPopupWindow("Waiting Server Response", "", true, false);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(jsonMessage),
        });

        if (!response.ok) {
            throw new Error(`Request Error: ${response.status}`);
        }

        const result = await response.json();
        console.log("Server Response:", result);
    } catch (error) {
        console.error("POST Request Error:", error);
    }
});

// Ao clicar no botão de ver todas as soluções
changeSolutionAllBtn.addEventListener("click", async function () {
    if (confirm("Are you sure you want to change the solution?")) {
        getAllSolutions();
        changeSolutionBestBtn.disabled = false;
    }
});

// Ao clicar no botão de ver as melhores soluções
changeSolutionBestBtn.addEventListener("click", async function () {
    if (confirm("Are you sure you want to change the solution?")) {
        getBestSolutions();
        this.disabled = true;
    }
});

// Ao clicar no botão de parar a interação
stopInteractionBtn.addEventListener("click", function () {
    if (confirm("Are you sure you want to stop the interaction?")) {
        stopInteraction();
        closeSocketConnection();
    }
});

// Função para mostrar o balão de aviso no mouse
function showMousePopUp(targetElem, message) {
    mousePopUp.textContent = message;

    const rect = targetElem.getBoundingClientRect();

    const popUpWidth = mousePopUp.offsetWidth;
    const x = rect.left + rect.width / 2 - popUpWidth / 2;
    const y = rect.top - mousePopUp.offsetHeight - 10;

    const left = Math.max(0, Math.min(x, window.innerWidth - popUpWidth));
    const top = Math.max(0, y);

    mousePopUp.style.left = left + "px";
    mousePopUp.style.top = top + "px";

    mousePopUp.style.opacity = 1;

    mousePopUp.style.backgroundColor = "#C70000";

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
        mousePopUp.style.opacity = 0;
    }, 3000);
}

// Função para parar a interação
function stopInteraction() {
    solution.interactive = false;
    reloadGraph(graph.json().elements, solution);
}

// Função inicial para carregar o grafo de uma solução
export function loadGraph(graphElements, newSolution) {
    if (graph) graph.destroy();
    solution = newSolution;
    microservices = newSolution.microservices;

    showGenerationInfo(solutionGeneration, solution.index);

    if (!solution.interactive) {
        applyBtn.style.display = "none";
        stopInteractionBtn.style.display = "none";
        changeSolutionAllBtn.style.display = "none";
        changeSolutionBestBtn.style.display = "none";
        hideGenerationInfo();
    }

    const layout = {
        name: "fcose",
        nodeSeparation: 200 + Math.log2(microservices.size) * edgeSeparationMultiplier,
        edgeElasticity: 0.1,
        idealEdgeLength: 200 + Math.log2(microservices.size) * edgeSeparationMultiplier,
        randomize: false,
        fit: true,
        animate: true,
    };

    const svgSplit = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <line x1="50" y1="0" x2="50" y2="100" stroke="white" stroke-width="8"/>
    </svg>`;
    const svgDown = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <path d="M50 100 L30 80 L70 80 Z" fill="white" />
    </svg>`;
    const svgUp = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <path d="M50 0 L30 20 L70 20 Z" fill="white" />
    </svg>`;
    const svgUpDown = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <path d="M50 100 L30 80 L70 80 Z" fill="white" />
        <path d="M50 0 L30 20 L70 20 Z" fill="white" />
    </svg>`;
    const svgJoin = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <path d="M50 80 L30 100 L70 100 Z" fill="white" />
        <path d="M50 20 L30 0 L70 0 Z" fill="white" />
    </svg>`;

    const encodedSplit = encodeURIComponent(svgSplit.trim());
    const encodedUp = encodeURIComponent(svgUp.trim());
    const encodedDown = encodeURIComponent(svgDown.trim());
    const encodedUpDown = encodeURIComponent(svgUpDown.trim());
    const encodedJoin = encodeURIComponent(svgJoin.trim());

    const splitNodeImgUrl = `url("data:image/svg+xml,${encodedSplit}")`;
    const upNodeImgUrl = `url("data:image/svg+xml,${encodedUp}")`;
    const downNodeImgUrl = `url("data:image/svg+xml,${encodedDown}")`;
    const upDownNodeImgUrl = `url("data:image/svg+xml,${encodedUpDown}")`;
    const joinNodeImgUrl = `url("data:image/svg+xml,${encodedJoin}")`;

    // Cria o grafo
    graph = window.cy = cytoscape({
        container: document.getElementById("cy"),
        ready: function () {
            this.layout(layout).run();
        },
        style: [
            {
                selector: "node",
                style: {
                    label: "data(label)",
                    "text-valign": "center",
                    "text-halign": "center",
                    "font-size": 18,
                    color: "#000",
                    "text-outline-width": "3px",
                    "text-outline-color": "#fff",
                    "background-color": "data(color)",
                    "border-style": "solid",
                    "border-width": 3,
                    "border-color": "#fff",
                    width: "data(size)",
                    height: 50,
                    shape: "roundrectangle",
                },
            },
            {
                selector: ":parent",
                style: {
                    "background-opacity": 0.333,
                },
            },
            {
                selector: "node.cy-expand-collapse-collapsed-node",
                style: {
                    "background-color": "darkblue",
                    shape: "roundrectangle",
                },
            },
            {
                selector: "edge",
                style: {
                    width: 2,
                    "line-color": "#ad1a66",
                    "curve-style": "bezier",
                    label: "data(weight)",
                    "text-outline-width": "2px",
                    "text-outline-color": "#fff",
                    "font-size": 16,
                },
            },
            {
                selector: ":selected",
                style: {
                    "overlay-color": "#6c727d",
                    "overlay-opacity": 0.3,
                },
            },
            {
                selector: ".multiselect",
                style: {
                    "overlay-color": "#c1c7fd",
                    "overlay-opacity": 0.5,
                },
            },
            {
                selector: 'edge[edgeType="type1"]',
                style: {
                    width: 2,
                    "line-color": "data(color)",
                    "target-arrow-shape": "triangle",
                    width: function (edge) {
                        const n = 2 + edge.data("weight") * 0.3;
                        return 2 + Math.log2(n) + "px";
                    },
                    "target-arrow-color": "data(color)",
                },
            },
            {
                selector: "edge.cy-expand-collapse-collapsed-edge",
                style: {
                    "text-outline-color": "#ffffff",
                    "text-outline-width": "2px",
                    label: (e) => {
                        return e.data("collapsedEdges").length;
                    },
                    width: function (edge) {
                        const n = edge.data("collapsedEdges").length;
                        return 2 + Math.log2(n) + "px";
                    },
                    "line-style": "dashed",
                    "line-color": setColor4CompoundEdge.bind(this),
                    "target-arrow-color": setColor4CompoundEdge.bind(this),
                    "target-arrow-shape": setTargetArrowShape.bind(this),
                    "source-arrow-shape": setSourceArrowShape.bind(this),
                    "source-arrow-color": setColor4CompoundEdge.bind(this),
                },
            },
            {
                selector: ".frozen",
                style: {
                    "background-color": "#7ec0ee",
                    "overlay-color": "#7ec0ee",
                    "overlay-opacity": 0.5,
                },
            },
            {
                selector: ".frozen:selected",
                style: {
                    "overlay-color": "#6c727d",
                    "overlay-opacity": 0.3,
                },
            },
            {
                selector: ".split",
                style: {
                    "background-image": splitNodeImgUrl,
                    "background-fit": "contain",
                    "background-clip": "node",
                },
            },
            {
                selector: ".out",
                style: {
                    "background-image": upNodeImgUrl,
                    "background-fit": "contain",
                    "background-clip": "none",
                },
            },
            {
                selector: ".in",
                style: {
                    "background-image": downNodeImgUrl,
                    "background-fit": "contain",
                    "background-clip": "none",
                },
            },
            {
                selector: ".out.in",
                style: {
                    "background-image": upDownNodeImgUrl,
                    "background-fit": "contain",
                    "background-clip": "none",
                },
            },
            {
                selector: ".join",
                style: {
                    "background-image": joinNodeImgUrl,
                    "background-fit": "contain",
                    "background-clip": "none",
                },
            },
        ],
        elements: graphElements,
    });

    // Ao clicar em um nó
    graph.on("tap", "node", function (evt) {
        selectedElement = evt.target;
        if (selectedElement.isParent()) return;

        if (evt.originalEvent.shiftKey || multSelectBtn.classList.contains("active")) {
            if (multipleSelectionNodes.includes(selectedElement)) {
                selectedElement.removeClass("multiselect");
                multipleSelectionNodes = multipleSelectionNodes.filter((n) => n !== selectedElement);
            } else {
                multipleSelectionNodes.push(selectedElement);
                selectedElement.addClass("multiselect");
            }

            if (multipleSelectionNodes.length > 2) {
                const firstNode = multipleSelectionNodes[0];
                firstNode.removeClass("multiselect");
                multipleSelectionNodes = multipleSelectionNodes.filter((n) => n !== firstNode);
            }
        } else {
            multipleSelectionNodes = new Array();
            for (const node of graph.nodes()) {
                node.removeClass("multiselect");
            }
        }

        // Diminuir a opacidade de todos os nós
        graph.nodes().style("opacity", 0.2);
        graph.nodes().style("z-index", 0);
        graph.edges().style("opacity", 0.2);
        graph.edges().style("z-index", 0);

        // Restaurar a opacidade do nó clicado
        selectedElement.style("opacity", 1);

        // Restaurar a opacidade dos vizinhos diretos
        selectedElement.neighborhood("node").style("opacity", 1);
        selectedElement.style("z-index", 1);
        selectedElement.connectedEdges().style("opacity", 1);
        selectedElement.connectedEdges().style("z-index", 1);

        // Quando dois nós são selecionados ao mesmo tempo
        if (multipleSelectionNodes.length == 2) {
            moveBtn.style.display = "none";
            joinBtn.style.display = "none";
            splitBtn.style.display = "none";
            freezeBtn.style.display = "none";
            callsText.style.display = "none";
            functionalitiesText.style.display = "none";
            functionalityListContainer.style.display = "none";
            componentsText.style.display = "none";
            detailsBtn.style.display = "none";
            selectionContainer.style.display = "block";

            selectionContainer.style.backgroundColor = changeHslaOpacity(selectedElement.data("color"), 0.3);
            selectionName.textContent =
                multipleSelectionNodes[0].data("name") + " → " + multipleSelectionNodes[1].data("name");
            selectionName.contentEditable = false;
            editIcon.style.display = "none";

            if (solution.interactive) {
                moveBtn.style.display = "block";
                joinBtn.style.display = "block";
            }

            multipleSelectionNodes[0].neighborhood("node").style("opacity", 1);
            multipleSelectionNodes[0].style("z-index", 1);
            multipleSelectionNodes[0].connectedEdges().style("opacity", 1);
            multipleSelectionNodes[0].connectedEdges().style("z-index", 1);

            verifyRestrictions(multipleSelectionNodes[0], multipleSelectionNodes[1]);

            return;
        }

        // Exibir informações do nó selecionado
        selectionContainer.style.display = "block";
        selectionContainer.style.backgroundColor = changeHslaOpacity(selectedElement.data("color"), 0.3);
        selectionName.textContent = selectedElement.data("name");
        selectionName.contentEditable = true;
        editIcon.style.display = "block";
        callsText.style.display = "block";
        componentsText.style.display = "block";
        functionalitiesText.style.display = "block";
        functionalityListContainer.style.display = "block";
        functionalityList.style.display = "block";

        // Exibir botão de congelar/descongelar
        if (solution.interactive) {
            splitBtn.style.display = "flex";
            freezeBtn.style.display = "flex";
            if (frozenMicroservicesIndex && selectedElement.hasClass("frozen")) {
                freezeBtn.textContent = "Unfreeze";
            } else {
                freezeBtn.textContent = "Freeze";
            }
        } else {
            freezeBtn.style.display = "none";
            splitBtn.style.display = "none";
        }

        moveBtn.style.display = "none";
        joinBtn.style.display = "none";
        detailsBtn.style.display = "block";

        const m = microservices.get(selectedElement.id());
        if (m === undefined) return;

        callsText.style.display = "none";

        currComponents = m.components;
        componentsText.textContent = `Methods: ${currComponents.length}`;

        // Montar lista de funcionalidades
        currFunctionalities = m.getFunctionalitiesWithPercentages();
        buildFuncList(currFunctionalities, functionalityList);
        functionalitiesText.textContent = `Functionalities: ${currFunctionalities.size}`;

        // Ajustar altura máxima da lista de funcionalidades
        adjustListHeight(functionalityList);

        verifyRestrictions(selectedElement);
    });

    // Ao clicar em uma aresta
    graph.on("tap", "edge", function (evt) {
        selectedElement = evt.target;

        // Diminuir a opacidade de todos os nós
        graph.nodes().style("opacity", 0.2);
        graph.nodes().style("z-index", 0);
        graph.edges().style("opacity", 0.2);
        graph.edges().style("z-index", 0);

        // Restaurar a opacidade da aresta clicada e seus nós conectados
        selectedElement.style("opacity", 1);
        selectedElement.style("z-index", 1);
        selectedElement.connectedNodes().style("opacity", 1);
        selectedElement.connectedNodes().style("z-index", 1);

        // Se aresta for composta por outras arestas, não exibe informações
        if (selectedElement.hasClass("cy-expand-collapse-collapsed-edge")) return;

        // Exibir informações da aresta selecionada
        const sourceId = selectedElement.data("source");
        const targetId = selectedElement.data("target");
        selectionContainer.style.display = "block";
        selectionContainer.style.backgroundColor = changeHslaOpacity(selectedElement.data("color"), 0.3);
        selectionName.textContent = graph.$("#" + sourceId).data("name") + " → " + graph.$("#" + targetId).data("name");
        selectionName.contentEditable = false;
        editIcon.style.display = "none";
        functionalityListContainer.style.display = "block";
        functionalityList.style.display = "block";

        freezeBtn.style.display = "none";
        splitBtn.style.display = "none";
        moveBtn.style.display = "none";
        joinBtn.style.display = "none";
        detailsBtn.style.display = "block";

        const m = microservices.get(selectedElement.data("source"));
        if (m === undefined) return;

        callsText.style.display = "block";
        callsText.textContent = `Calls: ${selectedElement.data("weight")}`;

        currComponents = solution.getExternalComponents(selectedElement.data("target"), selectedElement.data("source"));
        componentsText.textContent = `Called Methods: ${currComponents.length}`;

        // Montar lista de funcionalidades
        currFunctionalities = solution.getFunctionalitiesOfComponents(currComponents);
        buildFuncList(currFunctionalities, functionalityList);
        functionalitiesText.textContent = `Functionalities: ${currFunctionalities.size}`;

        // Ajustar altura máxima da lista de funcionalidades
        adjustListHeight(functionalityList);
    });

    // Clicou no fundo do grafo
    graph.on("tap", function (event) {
        if (event.target === graph) {
            selectedElement = null;
            graph.nodes().style("opacity", 1);
            graph.edges().style("opacity", 1);
            selectionContainer.style.display = "none";
            multipleSelectionNodes = new Array();
            for (const node of graph.nodes()) {
                node.removeClass("multiselect");
            }
        }
    });

    // Clicou no botão de reajustar o grafo
    resetBtn.addEventListener("click", function () {
        graph.layout(layout).run();
    });

    checkFrozen(microservices);
}

// Função para recarregar o grafo com uma nova solução
export function reloadGraph(graphElements, newSolution, reset = false) {
    solution = newSolution;
    microservices = newSolution.microservices;
    changedNames = new Array();
    frozenMicroservicesIndex = new Array();
    unfrozenMicroservicesIndex = new Array();
    currSplitComponents = new Array();
    splitMicroservices = new Array();
    currFunctionalities = new Map();
    currComponents = new Array();
    selectedElement = null;
    draggedItem = null;
    selectedListItems = new Set();

    if (!graph) {
        loadGraph(graphElements, newSolution);
        return;
    }

    if (reset) {
        graph.destroy();
        loadGraph(graphElements, newSolution);
        return;
    }

    showGenerationInfo(solutionGeneration, solution.index);

    if (!solution.interactive) {
        applyBtn.style.display = "none";
        stopInteractionBtn.style.display = "none";
        changeSolutionAllBtn.style.display = "none";
        changeSolutionBestBtn.style.display = "none";
        hideGenerationInfo();
    }

    const layout = {
        name: "fcose",
        nodeSeparation: 200 + Math.log2(microservices.size) * edgeSeparationMultiplier,
        edgeElasticity: 0.1,
        idealEdgeLength: 200 + Math.log2(microservices.size) * edgeSeparationMultiplier,
        randomize: false,
        fit: true,
        animate: true,
    };

    graph.json({ elements: graphElements });

    graph.nodes().removeClass("frozen");
    graph.nodes().removeClass("split");
    graph.nodes().style("opacity", 1);
    graph.edges().style("opacity", 1);
    selectionContainer.style.display = "none";

    resetBtn.addEventListener("click", function () {
        graph.layout(layout).run();
    });

    checkFrozen(microservices);
    updateSplitList();
}

// Verifica se foi realizada uma ação na solução
export function checkSolutionChanges() {
    if (
        frozenMicroservicesIndex.length > 0 ||
        unfrozenMicroservicesIndex.length > 0 ||
        splitMicroservices.length > 0 ||
        movedList.length > 0 ||
        changedNames.length > 0
    ) {
        return true;
    } else {
        return false;
    }
}
