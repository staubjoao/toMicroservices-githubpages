export class Solution {
    metric = new String();
    metrics = new Map();
    microservices = new Map();
    interactive = new Boolean();
    index = new Number();

    constructor(metric, metrics, microservices, interactable = false) {
        this.metric = metric;
        this.metrics = metrics;
        this.microservices = microservices;
        this.interactive = interactable;
    }

    getExternalComponents(sourceMicroservice, targetMicroservice) {
        const externalComponentNames = new Array();
        this.microservices.get(sourceMicroservice).externalDependencies[targetMicroservice].forEach((d) => {
            if (!externalComponentNames.includes(d.targetComponent)) {
                externalComponentNames.push(d.targetComponent);
            }
        });

        const components = new Array();

        this.microservices.get(targetMicroservice).components.forEach((c) => {
            if (externalComponentNames.includes(c.name)) {
                components.push(c);
            }
        });

        return components;
    }

    getComponentsOfFunctionality(microservice, functionality) {
        const components = new Array();
        this.microservices.get(microservice).components.forEach((c) => {
            if (c.functionalities.includes(functionality) && !components.includes(c)) {
                components.push(c);
            }
        });
        return components;
    }

    getFunctionalitiesOfComponents(components) {
        const functionalities = new Array();
        components.forEach((c) => {
            c.functionalities.forEach((f) => {
                if (!functionalities.includes(f)) {
                    functionalities.push(f);
                }
            });
        });

        const functionalitiesPercentages = new Map();
        components.forEach((c) => {
            c.functionalities.forEach((f) => {
                if (functionalities.includes(f)) {
                    if (!functionalitiesPercentages[f]) {
                        functionalitiesPercentages[f] = 0;
                    }
                    functionalitiesPercentages[f]++;
                }
            });
        });

        for (const f in functionalitiesPercentages) {
            functionalitiesPercentages[f] = (functionalitiesPercentages[f] / components.length) * 100;
        }

        const sortedFunctionalities = new Map(
            [...Object.entries(functionalitiesPercentages)].sort((a, b) => b[1] - a[1])
        );

        return sortedFunctionalities;
    }

    maxComponentsPerMicroservice() {
        let max = 0;
        this.microservices.forEach((microservice) => {
            if (microservice.components.length > max) {
                max = microservice.components.length;
            }
        });
        return max;
    }

    minComponentsPerMicroservice() {
        let min = Infinity;
        this.microservices.forEach((microservice) => {
            if (microservice.components.length < min) {
                min = microservice.components.length;
            }
        });
        return min === Infinity ? 0 : min;
    }
}

export class Microservice {
    id = new String();
    name = new String();
    components = new Array();
    freeze = new Boolean();
    externalDependencies = new Map();

    constructor(id, name, components, freeze, externalDependencies = {}) {
        this.id = id;
        this.name = name;
        this.components = components;
        this.freeze = freeze;
        this.externalDependencies = externalDependencies;
    }

    addExternalDependency(dependency) {
        if (!this.externalDependencies[dependency.targetMicroservice]) {
            this.externalDependencies[dependency.targetMicroservice] = new Array();
        }
        this.externalDependencies[dependency.targetMicroservice].push(dependency);
    }

    getFunctionalitiesWithPercentages() {
        const functionalities = new Map();
        this.components.forEach((c) => {
            c.functionalities.forEach((f) => {
                if (!functionalities[f]) {
                    functionalities[f] = 0;
                }
                functionalities[f]++;
            });
        });

        for (const f in functionalities) {
            functionalities[f] = (functionalities[f] / this.components.length) * 100;
        }

        const sortedFunctionalities = new Map([...Object.entries(functionalities)].sort((a, b) => b[1] - a[1]));

        return sortedFunctionalities;
    }

    getFunctionalities() {
        const functionalities = new Array();
        this.components.forEach((c) => {
            c.functionalities.forEach((f) => {
                if (!functionalities.includes(f)) {
                    functionalities.push(f);
                }
            });
        });
        return functionalities;
    }
}

export class Component {
    id = new String();
    name = new String();
    functionalities = new Array();
    dependencies = new Array();

    constructor(id, name, functionalities, dependencies) {
        this.id = id;
        this.name = name;
        this.functionalities = functionalities;
        this.dependencies = dependencies;
    }
}

export class Dependency {
    targetComponent = new String();
    targetMicroservice = new String();

    constructor(targetComponent, targetMicroservice) {
        this.targetComponent = targetComponent;
        this.targetMicroservice = targetMicroservice;
    }
}
