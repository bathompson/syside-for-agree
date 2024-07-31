import * as vscode from "vscode";

class ConfigurationOption {
    private wc: vscode.WorkspaceConfiguration;
    name: string;
    description: string;
    isDir: boolean;
    valueRequired: boolean;
    fileExtension?: string;

    public value() {
        return this.wc.get(this.name);
    }

    public update(value: any, target?: vscode.ConfigurationTarget) {
        this.wc.update(this.name, value, target);
    }

    public isSet(): boolean {
        return this.wc.get(this.name) !== null;
    }

    constructor(
        wc: vscode.WorkspaceConfiguration,
        name: string,
        description: string,
        isDir: boolean,
        valueRequired: boolean,
        fileExtension?: string
    ) {
        this.wc = wc;
        this.name = name;
        this.description = description;
        this.isDir = isDir;
        this.valueRequired = valueRequired;
        if (fileExtension) {
            this.fileExtension = fileExtension;
        }
    }
}

export class Options implements Iterable<ConfigurationOption> {
    private optionMap: Map<string, ConfigurationOption>;

    public get(optionName: string): ConfigurationOption {
        const val = this.optionMap.get(optionName);
        if (val) {
            return val;
        }
        throw new Error("Invalid option name provided");
    }

    public addOption(
        configSection: string,
        configName: string,
        configDescription: string,
        valueIsDir: boolean,
        valueRequired: boolean,
        fileExtension?: string
    ): void {
        if (this.optionMap.has(configName)) {
            throw new Error(`Config with name ${configName} is already in the config map.`);
        }
        let rec: ConfigurationOption;
        if (fileExtension) {
            rec = new ConfigurationOption(
                vscode.workspace.getConfiguration(configSection),
                configName,
                configDescription,
                valueIsDir,
                valueRequired,
                fileExtension
            );
        } else {
            rec = new ConfigurationOption(
                vscode.workspace.getConfiguration(configSection),
                configName,
                configDescription,
                valueIsDir,
                valueRequired
            );
        }

        this.optionMap.set(rec.name, rec);
    }

    constructor() {
        this.optionMap = new Map();
    }

    [Symbol.iterator](): Iterator<ConfigurationOption> {
        return this.optionMap.values()[Symbol.iterator]();
    }
}
