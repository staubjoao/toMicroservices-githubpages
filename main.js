import { loadGraph, reloadGraph, checkSolutionChanges } from "./graph";
import { Solution, Microservice, Component, Dependency } from "./classes";

let allMetrics = new Array();
let json = null;
let currObjFunc = null;
const loadingDiv = document.getElementById("loading");

function readSingleFromJson(url = null) {
    try {
        if (url) {
            const request = new XMLHttpRequest();
            request.open("GET", url, false);
            request.send(null);

            if (request.status !== 200) {
                throw new Error("Erro ao carregar arquivo de soluções.");
            }

            json = JSON.parse(request.responseText);
        }

        document.getElementById("obj-func-div").style.display = "none";

        allMetrics = new Array();
        const solution = new Solution();

        solution.index = json.indexSolution;
        solution.metric = json.metric;
        solution.metrics = json.metrics;
        solution.interactive = json.interactive;

        // Capturar microservices
        solution.microservices = new Map();
        json.microservices.forEach((m) => {
            const components = [];
            const externalDependencies = new Map();
            m.components.forEach((c) => {
                // Capturar funcionalidades
                const functionalities = [];
                c.functionalities.forEach((f) => {
                    functionalities.push(f);
                });

                // Capturar dependências
                const dependencies = [];
                c.dependencies.forEach((d) => {
                    if (!d.targetMicroservice.includes("microservice")) {
                        console.error(
                            'Erro ao carregar dependência: microserviço não encontrado "' + d.targetMicroservice + '"'
                        );
                        return;
                    }

                    const dependency = new Dependency(d.targetComponent, d.targetMicroservice);

                    // Caso a dependência seja externa
                    if (d.targetMicroservice != m.id) {
                        if (!externalDependencies[dependency.targetMicroservice]) {
                            externalDependencies[dependency.targetMicroservice] = new Array();
                        }

                        externalDependencies[dependency.targetMicroservice].push(dependency);
                    }

                    dependencies.push(dependency);
                });

                components.push(new Component(c.id, c.name, functionalities, dependencies));
            });

            solution.microservices.set(
                m.id,
                new Microservice(m.id, m.name, components, m.freeze, externalDependencies)
            );
        });

        for (const metric of json.metrics) {
            allMetrics.push(metric.name);
        }

        console.log(solution);
        return solution;
    } catch (error) {
        alert("Erro ao carregar solução. Verifique o console.");
        console.error("Erro ao carregar solução:", error);
    }

    return null;
}

function readBestFromJson(metricIndex = 0, url = null) {
    try {
        if (url) {
            const request = new XMLHttpRequest();
            request.open("GET", url, false);
            request.send(null);

            if (request.status !== 200) {
                throw new Error("Erro ao carregar arquivo de soluções.");
            }

            json = JSON.parse(request.responseText);
        }

        document.getElementById("obj-func-div").style.display = "block";

        allMetrics = new Array();
        const solution = new Solution();
        let idx = 0;

        json.forEach((s) => {
            allMetrics.push(s.metric);
            if (idx != metricIndex) {
                idx++;
                return;
            }

            solution.index = s.indexSolution;
            solution.metric = s.metric;
            solution.metrics = s.metrics;
            solution.interactive = s.interactive;

            // Capturar microservices
            solution.microservices = new Map();
            s.microservices.forEach((m) => {
                const components = [];
                const externalDependencies = new Map();
                m.components.forEach((c) => {
                    // Capturar funcionalidades
                    const functionalities = [];
                    c.functionalities.forEach((f) => {
                        functionalities.push(f);
                    });

                    // Capturar dependências
                    const dependencies = [];
                    c.dependencies.forEach((d) => {
                        if (!d.targetMicroservice.includes("microservice")) {
                            console.error(
                                'Erro ao carregar dependência: microserviço não encontrado "' +
                                    d.targetMicroservice +
                                    '"'
                            );
                            return;
                        }

                        const dependency = new Dependency(d.targetComponent, d.targetMicroservice);

                        // Caso a dependência seja externa
                        if (d.targetMicroservice != m.id) {
                            if (!externalDependencies[dependency.targetMicroservice]) {
                                externalDependencies[dependency.targetMicroservice] = new Array();
                            }

                            externalDependencies[dependency.targetMicroservice].push(dependency);
                        }

                        dependencies.push(dependency);
                    });

                    components.push(new Component(c.id, c.name, functionalities, dependencies));
                });

                solution.microservices.set(
                    m.id,
                    new Microservice(m.id, m.name, components, m.freeze, externalDependencies)
                );
            });

            idx++;
        });

        console.log(solution);
        return solution;
    } catch (error) {
        alert("Erro ao carregar solução. Verifique o console.");
        console.error("Erro ao carregar solução:", error);
    }

    return null;
}

function generateDistinctColors(count) {
    const colors = [];
    const step = 360 / count;

    for (let i = 0; i < count; i++) {
        const hue = (i * step) % 360;
        const saturation = 80;
        const lightness = 10 + Math.random() * 40;

        colors.push(`hsla(${hue}, ${saturation}%, ${lightness}%, 1)`);
    }

    return colors;
}

function calcNodeSize(numComponents, maxComponents, minComponents) {
    const minOut = 50; // Tamanho em pixels do menor nó
    const maxOut = 100; // Tamanho em pixels do maior nó
    const minIn = minComponents;
    const maxIn = maxComponents;

    numComponents = Math.max(minIn, Math.min(numComponents, maxIn));

    return minOut + ((numComponents - minIn) * (maxOut - minOut)) / (maxIn - minIn);
}

function createGraph(solution, randomColors = false) {
    const graph = [];

    const colors = randomColors
        ? generateDistinctColors(solution.microservices.size)
        : [
              "hsla(43.2, 80%, 36.72742378550487%, 1)",
              "hsla(288, 80%, 15.49783843355276%, 1)",
              "hsla(86.40000000000003, 80%, 36.62667817863684%, 1)",
              "hsla(302.40000000000003, 80%, 36.5293793208598%, 1)",
              "hsla(14.4, 80%, 30.61245697383402%, 1)",
              "hsla(129.60000000000002, 80%, 41.91332535237474%, 1)",
              "hsla(259.2, 80%, 48.71053645742908%, 1)",
              "hsla(345.6, 80%, 44.450133224435405%, 1)",
              "hsla(43.19999999999999, 80%, 19.96530133485055%, 1)",
              "hsla(129.6, 80%, 12.602668385688132%, 1)",
              "hsla(244.8, 80%, 22.692134078898913%, 1)",
              "hsla(115.19999999999999, 80%, 31.464243212818694%, 1)",
              "hsla(57.60000000000002, 80%, 18.185963309230377%, 1)",
              "hsla(28.80000000000001, 80%, 45.79757270989273%, 1)",
              "hsla(28.8, 80%, 17.298082198057607%, 1)",
              "hsla(216, 80%, 29.589018033459354%, 1)",
              "hsla(86.4, 80%, 21.756781937505288%, 1)",
              "hsla(273.6, 80%, 28.14839313230271%, 1)",
              "hsla(230.4, 80%, 20.57950109752884%, 1)",
              "hsla(201.6, 80%, 12.293658402924583%, 1)",
              "hsla(57.6, 80%, 45.31730845081078%, 1)",
              "hsla(14.400000000000034, 80%, 48.01081867354428%, 1)",
              "hsla(72, 80%, 39.638827854397285%, 1)",
              "hsla(0, 80%, 26.535316384972376%, 1)",
              "hsla(100.8, 80%, 21.264912076819165%, 1)",
              "hsla(331.20000000000005, 80%, 29.433134189990355%, 1)",
              "hsla(0, 80%, 11.33705945889738%, 1)",
              "hsla(244.80000000000007, 80%, 29.06448392235191%, 1)",
              "hsla(144, 80%, 23.61424926243039%, 1)",
              "hsla(273.6, 80%, 34.67917076250731%, 1)",
              "hsla(158.39999999999998, 80%, 38.03775683577528%, 1)",
              "hsla(302.4, 80%, 43.70216964645975%, 1)",
              "hsla(187.20000000000005, 80%, 17.5740646769947%, 1)",
              "hsla(201.60000000000002, 80%, 41.55869498099498%, 1)",
              "hsla(72, 80%, 21.426444056625222%, 1)",
              "hsla(259.20000000000005, 80%, 46.73793153977702%, 1)",
              "hsla(230.39999999999998, 80%, 18.759325686829253%, 1)",
              "hsla(345.6, 80%, 31.794798157957096%, 1)",
              "hsla(316.8, 80%, 42.18192709730357%, 1)",
              "hsla(316.80000000000007, 80%, 18.18465946629462%, 1)",
              "hsla(172.80000000000007, 80%, 49.70335950013963%, 1)",
              "hsla(331.2, 80%, 17.958046622890755%, 1)",
              "hsla(100.80000000000001, 80%, 17.15923894261283%, 1)",
              "hsla(115.2, 80%, 20.983892780069013%, 1)",
              "hsla(288, 80%, 34.514770579731106%, 1)",
              "hsla(172.8, 80%, 37.3710425621169%, 1)",
              "hsla(144, 80%, 38.597936376988756%, 1)",
              "hsla(216, 80%, 22.036789442205247%, 1)",
              "hsla(187.20000000000002, 80%, 35.99447420287541%, 1)",
              "hsla(158.4, 80%, 22.85666983122546%, 1)",
          ];

    let idx = 0;

    const maxComponents = solution.maxComponentsPerMicroservice();
    const minComponents = solution.minComponentsPerMicroservice();

    solution.microservices.forEach((microservice) => {
        const color = colors[idx % colors.length];

        // Adicionar microservices (nós)
        graph.push({
            data: {
                id: `${microservice.id}`,
                name: `${microservice.name}`,
                label: `${microservice.name} (${microservice.components.length})`,
                color: color,
                index: idx,
                size: calcNodeSize(microservice.components.length, maxComponents, minComponents),
            },
            group: "nodes",
        });

        // Adicionar dependências externas (arestas)
        Object.keys(microservice.externalDependencies).forEach((m) => {
            const dependencyArr = microservice.externalDependencies[m];
            const sourceColor = colors[parseInt(m.split("microservice")[1]) % colors.length];
            graph.push({
                data: {
                    id: `${m}_${microservice.id}`,
                    source: `${m}`,
                    target: `${microservice.id}`,
                    edgeType: "type1",
                    weight: dependencyArr.length,
                    color: sourceColor,
                },
                group: "edges",
            });
        });

        idx++;
    });

    return graph;
}

function setMetrics(solution) {
    solution.metrics.forEach((value) => {
        const metricName = value.name.split(".").at(-1);
        const metricElement = document.getElementById(metricName);
        if (metricElement) {
            metricElement.innerHTML = metricName + ": " + "<br>" + value.value;
        }
    });
}

function loadSolutionSelection() {
    const slctElement = document.getElementById("slct");
    slctElement.innerHTML = "";
    for (let i = 0; i < allMetrics.length; i++) {
        const optionItem = document.createElement("option");
        optionItem.value = i;
        optionItem.text = allMetrics[i];
        slctElement.appendChild(optionItem);
    }
}

export function load(jsonData) {
    try {
        document.getElementsByClassName("fleft")[0].style.display = "block";
        document.getElementsByClassName("fright")[0].style.display = "block";

        // Verifica se é a primeira vez que o JSON é carregado
        if (json) {
            console.log("Grafo já carregado, mudando solução.");
            json = jsonData;
            changeSolution(null, true);
            loadSolutionSelection();
            return;
        }

        // Carregar solução inicial
        json = jsonData;
        const solution = json[0] ? readBestFromJson() : readSingleFromJson();
        if (!solution) return;
        setMetrics(solution);
        loadGraph(createGraph(solution), solution);
        loadSolutionSelection();

        loadingDiv.style.display = "none";
        document.getElementById("symbol-guide").style.display = "block";
    } catch (error) {
        alert("Erro ao carregar solução. Verifique o console.");
        console.error("Erro ao carregar solução:", error);
    }
}

function changeSolution(event, resetVis = false) {
    // Se houver alterações, pergunta ao usuário se deseja continuar
    if (checkSolutionChanges() && resetVis == false) {
        if (!confirm("Your changes will be lost. Do you want to continue?")) {
            event.target.value = currObjFunc;
            return;
        } else {
            currObjFunc = event.target.value;
        }
    }

    loadingDiv.style.display = "block";
    document.getElementById("selection-container").style.display = "none";

    // Carregar nova solução
    const metricIndex = document.getElementById("slct").value;
    const solution = json[0] ? readBestFromJson(metricIndex) : readSingleFromJson();
    if (!solution) return;
    setMetrics(solution);
    reloadGraph(createGraph(solution), solution, resetVis);

    loadingDiv.style.display = "none";
}

document.getElementById("slct").addEventListener("focus", function () {
    currObjFunc = document.getElementById("slct").value;
});

document.getElementById("slct").addEventListener("change", function (event) {
    changeSolution(event, false);
});
