/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import keyCodes from 'core/key-codes';
import iBlock, { component, prop, field, ModsDecl } from 'super/i-block/i-block';
export * from 'super/i-block/i-block';

@component()
export default class iMessage extends iBlock {
	/**
	 * Initial information message
	 */
	@prop({type: String, required: false})
	readonly infoProp?: string;

	/**
	 * Initial error message
	 */
	@prop({type: String, required: false})
	readonly errorProp?: string;

	/**
	 * Information message store
	 */
	@field((o) => o.link('infoProp'))
	infoMsg?: string;

	/**
	 * Error message store
	 */
	@field((o) => o.link('errorProp'))
	errorMsg?: string;

	/** @inheritDoc */
	static readonly mods: ModsDecl = {
		showInfo: [
			'true',
			['false']
		],

		showError: [
			'true',
			['false']
		],

		opened: [
			'true',
			['false']
		]
	};

	/**
	 * Information message
	 */
	get info(): CanUndef<string> {
		return this.infoMsg;
	}

	/**
	 * Sets a new information message
	 * @param value
	 */
	set info(value: CanUndef<string>) {
		this.infoMsg = value;
	}

	/**
	 * Error message
	 */
	get error(): CanUndef<string> {
		return this.errorMsg;
	}

	/**
	 * Sets a new error message
	 * @param value
	 */
	set error(value: CanUndef<string>) {
		this.errorMsg = value;
	}

	/**
	 * Opens the component
	 * @emits open()
	 */
	async open(): Promise<boolean> {
		if (await this.setMod('opened', true)) {
			this.emit('open');
			return true;
		}

		return false;
	}

	/**
	 * Closes the component
	 * @emits close()
	 */
	async close(): Promise<boolean> {
		if (await this.setMod('opened', false)) {
			this.emit('close');
			return true;
		}

		return false;
	}

	/**
	 * Toggles the component
	 */
	toggle(): Promise<boolean> {
		return this.mods.opened === 'true' ? this.close() : this.open();
	}

	/**
	 * Initializes close helpers
	 */
	protected initCloseHelpers(): void {
		const
			{async: $a, localEvent: $e} = this,
			group = {group: 'closeHelpers'};

		const closeHelpers = () => {
			$a.on(document, 'keyup', (e) => {
				if (e.keyCode === keyCodes.ESC) {
					return this.close();
				}
			}, group);

			$a.on(document, 'click', (e) => {
				if (!e.target.closest(`.${this.componentId}`)) {
					return this.close();
				}
			}, group);
		};

		$e.removeAllListeners('block.mod.set.opened.*');
		$e.on('block.mod.set.opened.true', closeHelpers);
		$e.on('block.mod.set.opened.false', () => $a.off(group));
	}

	/** @override */
	protected initModEvents(): void {
		super.initModEvents();
		this.bindModTo('showInfo', 'infoMsg');
		this.bindModTo('showError', 'errorMsg');
	}
}
