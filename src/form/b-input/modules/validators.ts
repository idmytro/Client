/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import fetch from 'core/request';
import bInput from 'form/b-input/b-input';
import iInput, { ValidatorsDecl, ValidatorParams, ValidatorResult } from 'super/i-input/i-input';
import symbolGenerator from 'core/symbol';
import { name, password } from 'core/const/validation';

export const
	$$ = symbolGenerator(),
	DELAY = 0.3.second(),
	group = 'validation';

export interface ConstPatternValidatorParams extends ValidatorParams {
	skipLength?: boolean;
}

export interface PatternValidatorParams extends ConstPatternValidatorParams {
	pattern?: RegExp;
	minLength?: number;
	maxLength?: number;
	skipLength?: boolean;
}

export interface CheckExistsValidatorParams extends ValidatorParams {
	url: string;
	own?: any;
}

export interface PasswordValidatorParams extends ConstPatternValidatorParams {
	connected?: string;
	old?: string;
}

export default <ValidatorsDecl<bInput, unknown>>{
	async required({msg, showMsg = true}: ValidatorParams): Promise<ValidatorResult> {
		if (!await this.formValue) {
			if (showMsg) {
				this.error = msg || t`Required field`;
			}

			return false;
		}

		return true;
	},

	async pattern({
		msg,
		pattern,
		minLength,
		maxLength,
		skipLength,
		showMsg = true
	}: PatternValidatorParams): Promise<ValidatorResult> {
		const
			value = await this.formValue;

		if (pattern && !pattern.test(value)) {
			if (showMsg) {
				this.error = msg || t`Invalid characters`;
			}

			return {
				name: 'INVALID_CHARS',
				value
			};
		}

		if (!skipLength) {
			if (Object.isNumber(minLength) && value.length < minLength) {
				if (showMsg) {
					this.error = msg || t`Value length must be at least ${minLength} characters`;
				}

				return {
					name: 'MIN_LENGTH',
					value: minLength
				};
			}

			if (Object.isNumber(maxLength) && value.length > maxLength) {
				if (showMsg) {
					this.error = msg || t`Value length must be no more than ${maxLength} characters`;
				}

				return {
					name: 'MAX_LENGTH',
					value: maxLength
				};
			}
		}

		return true;
	},

	async name({msg, skipLength, showMsg = true}: ConstPatternValidatorParams): Promise<ValidatorResult> {
		const
			value = await this.formValue;

		if (!name.pattern.test(value)) {
			if (showMsg) {
				this.error = msg ||
					t`Invalid characters. <br>Allowed only Latin characters, numbers and underscore`;
			}

			return {
				name: 'INVALID_CHARS',
				value
			};
		}

		if (!skipLength) {
			if (value.length < name.min) {
				if (showMsg) {
					this.error = msg || t`Name length must be at least ${name.min} characters`;
				}

				return {
					name: 'MIN_LENGTH',
					value: name.min
				};
			}

			if (value.length > name.max) {
				if (showMsg) {
					this.error = msg || t`Name length must be no more than ${name.max} characters`;
				}

				return {
					name: 'MAX_LENGTH',
					value: name.max
				};
			}
		}

		return true;
	},

	async nameNotExists({url, msg, own, showMsg = true}: CheckExistsValidatorParams): Promise<ValidatorResult> {
		const
			value = await this.formValue;

		if (own !== undefined && own === value) {
			return true;
		}

		return new Promise<boolean | null>((resolve) => {
			// @ts-ignore
			this.async.setTimeout(async () => {
				try {
					// @ts-ignore
					const {result} = await this.async.request(fetch(url, {method: 'GET', query: {value}})(), {
						group,
						label: $$.nameNotExists
					});

					if (result === true && showMsg) {
						this.error = msg || t`This name is already taken`;
					}

					resolve(result !== true);

				} catch (err) {
					if (showMsg) {
						// @ts-ignore
						this.error = this.getDefaultErrorText(err);
					}

					resolve(err.type !== 'abort' ? false : null);
				}

			}, DELAY, {
				group,
				label: $$.nameNotExists,
				onClear: () => resolve(false)
			});
		});
	},

	async email({msg, showMsg = true}: ConstPatternValidatorParams): Promise<ValidatorResult> {
		const
			value = (await this.formValue).trim();

		if (value && !/@/.test(value)) {
			if (showMsg) {
				this.error = msg || t`Invalid email format`;
			}

			return false;
		}

		return true;
	},

	async emailNotExists({url, msg, own, showMsg = true}: CheckExistsValidatorParams): Promise<ValidatorResult> {
		const
			value = await this.formValue;

		if (own !== undefined && own === value) {
			return true;
		}

		return new Promise<boolean | null>((resolve) => {
			// @ts-ignore
			this.async.setTimeout(async () => {
				try {
					// @ts-ignore
					const {result} = await this.async.request(fetch(url, {method: 'GET', query: {value}}), {
						group,
						label: $$.emailNotExists
					});

					if (result === true && showMsg) {
						this.error = msg || t`This email is already taken`;
					}

					resolve(result !== true);

				} catch (err) {
					if (showMsg) {
						// @ts-ignore
						this.error = this.getDefaultErrorText(err);
					}

					resolve(err.type !== 'abort' ? false : null);
				}

			}, DELAY, {
				group,
				label: $$.emailNotExists,
				onClear: () => resolve(false)
			});
		});
	},

	async password({msg, connected, old, skipLength, showMsg = true}: PasswordValidatorParams): Promise<ValidatorResult> {
		const
			value = await this.formValue;

		if (!password.pattern.test(value)) {
			if (showMsg) {
				this.error = msg ||
					t`Invalid characters. <br>Allowed only Latin characters, numbers and underscore`;
			}

			return {
				name: 'INVALID_CHARS',
				value
			};
		}

		if (!skipLength) {
			if (value.length < password.min) {
				if (showMsg) {
					this.error = msg || t`Password length must be at least ${password.min} characters`;
				}

				return {
					name: 'MIN_LENGTH',
					value: password.min
				};
			}

			if (value.length > password.max) {
				if (showMsg) {
					this.error = msg || t`Password length must be no more than ${password.max} characters`;
				}

				return {
					name: 'MAX_LENGTH',
					value: password.max
				};
			}
		}

		if (old) {
			const
				// @ts-ignore
				connectedInput = <iInput>this.$(old),
				connectedValue = connectedInput && await connectedInput.formValue;

			if (connectedValue) {
				if (connectedValue === value) {
					if (showMsg) {
						this.error = msg || t`Old and new password are the same`;
					}

					return {
						name: 'OLD_IS_NEW',
						value
					};
				}

				connectedInput.setMod('valid', true);
			}
		}

		if (connected) {
			const
				// @ts-ignore
				connectedInput = <iInput>this.$(connected),
				connectedValue = connectedInput && await connectedInput.formValue;

			if (connectedValue) {
				if (connectedValue !== value) {
					if (showMsg) {
						this.error = msg || t`Passwords don't match`;
					}

					return {
						name: 'NOT_CONFIRM',
						value: [value, connectedValue]
					};
				}

				connectedInput.setMod('valid', true);
			}
		}

		return true;
	},

	async dateFromInput({msg, showMsg = true}: ValidatorParams): Promise<ValidatorResult> {
		const
			value = await this.formValue;

		if (/[^\d.-:()]/.test(this.value)) {
			return {
				name: 'INVALID_CHARS',
				value: this.value
			};
		}

		if (!Object.isDate(value) || isNaN(Date.parse(<any>value))) {
			if (showMsg) {
				this.error = msg || t`Invalid date`;
			}

			return {
				name: 'INVALID_DATE',
				value
			};
		}

		return true;
	}
};
