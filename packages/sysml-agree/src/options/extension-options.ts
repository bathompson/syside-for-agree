import { WorkspaceConfiguration, ConfigurationTarget, workspace } from "vscode";

/**
 * This class manages a single extension configuration option. It allows you to retrieve the option value, update the value, and ensure the value is set.
 */
class ConfigurationOption {
    private wc: string;
    name: string;
    description: string;
    isDir: boolean;
    valueRequired: boolean;
    fileExtensions?: string[];

    /**
     *
     * @returns The current value of the option
     */
    public value() {
        return workspace.getConfiguration(this.wc).get(this.name);
    }
    /**
     *
     * @param value The new value of the option
     * @param target The target scope of the change (workspace folder, workspace, global)
     */
    public update(value: any, target?: ConfigurationTarget): Thenable<void> {
        return workspace.getConfiguration(this.wc).update(this.name, value, target);
    }

    /**
     *
     * @returns A boolean representing if the option has a non-null value. NOTE: May need to add undefined as well.
     */
    public isSet(): boolean {
        return workspace.getConfiguration(this.wc).get(this.name) !== null;
    }

    /**
     *
     * @param wc The workspace configuration this option belongs to
     * @param name The name of the configuration as it appears in this extensions package.json
     * @param description A textual discription of what this option contains. Useful for printing
     * @param isDir Does the value of this configuration point to a directory?
     * @param valueRequired Is this value of this configuration required to run operations in this extension (You only need to set to true if the value can be null or undefined)
     * @param fileExtensions If the configuration option points to a file, you may put an array of valid file extensions.
     */
    constructor(
        wc: string,
        name: string,
        description: string,
        isDir: boolean,
        valueRequired: boolean,
        fileExtensions?: string[]
    ) {
        this.wc = wc;
        this.name = name;
        this.description = description;
        this.isDir = isDir;
        this.valueRequired = valueRequired;
        if (fileExtensions) {
            this.fileExtensions = fileExtensions;
        }
    }
}

/**
 * This class contains and manages the configuration options for a single configuration schema (the left side of the dot in a configuration name from package.json) for an extension.
 */
export class ExtensionOptions implements Iterable<ConfigurationOption> {
    private optionMap: Map<string, ConfigurationOption>;
    private configSection: string;

    /**
     *
     * @param key The name of the configuration option to retrieve (the left side of the dot in a configuration name from package.json)
     * @returns A ConfigurationOption object for the requested configuration option
     */
    public get(key: string): ConfigurationOption {
        const val = this.optionMap.get(key);
        if (val) {
            return val;
        }
        throw new Error("Invalid option name provided");
    }

    /**
     *
     * @param key The name of the configuration option (the left side of the dot in a configuration name from package.json)
     * @param configDescription A textual description of the config option. Useful for printing
     * @param valueIsDir Does the value of this configuration point to a directory?
     * @param valueRequired Is this value of this configuration required to run operations in this extension (You only need to set to true if the value can be null or undefined)
     * @param fileExtensions If the configuration option points to a file, you may put an array of valid file extensions.
     */
    public addOption(
        name: string,
        configDescription: string,
        valueIsDir: boolean,
        valueRequired: boolean,
        fileExtensions?: string[]
    ): void {
        if (this.optionMap.has(name)) {
            throw new Error(`Option with name ${name} is already in this option set`);
        }

        let rec: ConfigurationOption;
        if (fileExtensions) {
            rec = new ConfigurationOption(
                this.configSection,
                name,
                configDescription,
                valueIsDir,
                valueRequired,
                fileExtensions
            );
        } else {
            rec = new ConfigurationOption(
                this.configSection,
                name,
                configDescription,
                valueIsDir,
                valueRequired
            );
        }

        this.optionMap.set(name, rec);
    }

    /**
     *
     * @param configSection The config section (left side of the dot in a configuration name from package.json) that this set of options represents
     */
    constructor(configSection: string) {
        this.optionMap = new Map();
        this.configSection = configSection;
    }

    /**
     *
     * @returns An iterator to loop over all stored configuration options.
     */
    [Symbol.iterator](): Iterator<ConfigurationOption> {
        return this.optionMap.values()[Symbol.iterator]();
    }
}
