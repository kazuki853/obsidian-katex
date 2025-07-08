import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	renderMath,
	loadMathJax,
} from "obsidian";
import { renderToString } from "katex";

interface KatexPluginSettings {
	override_math: boolean;
}

const DEFAULT_SETTINGS: KatexPluginSettings = {
	override_math: false,
};

export default class KatexPlugin extends Plugin {
	settings: KatexPluginSettings;
	private originalTex2chtml: any;
	private dom_parser = new DOMParser();

	async onload() {
		await this.loadSettings();
		await loadMathJax();
		// @ts-ignore
		if (!globalThis.MathJax) {
			throw new Error("MathJax is not loaded.");
		}
		this.overrideMathJax(this.settings.override_math);
		this.addSettingTab(new KatexPluginSettingTab(this.app, this));
	}

	onunload() {
		// @ts-ignore
		MathJax.tex2chtml = this.originalTex2chtml;
	}

	createOverriddenMathElement(
		source: string,
		r: { display: boolean }
	){
		const renderedHtmlString = renderToString(source, {
			throwOnError: false,
			displayMode: r.display,
			// strict: true,
		});
		return this.dom_parser.parseFromString(renderedHtmlString, "text/html").body.firstElementChild;
	}

	async overrideMathJax(value: boolean) {
		this.settings.override_math = value;
		await this.saveSettings();
		if (this.settings.override_math) {
			// @ts-ignore
			MathJax.tex2chtml = (e, r) =>
				this.createOverriddenMathElement(e, r);
		} else {
			// @ts-ignore
			MathJax.tex2chtml = this.originalTex2chtml;
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class KatexPluginSettingTab extends PluginSettingTab {
	plugin: KatexPlugin;

	constructor(app: App, plugin: KatexPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Override Math Blocks")
			.setDesc(
				"Enable or disable the override of MathJax rendering with Katex."
			)
			.addToggle(async (toggle) => {
				toggle
					.setValue(this.plugin.settings.override_math)
					.onChange(async (value) => {
						this.plugin.settings.override_math = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
