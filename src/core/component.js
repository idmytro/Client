'use strict';

/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import * as defTpls from './block.ss';

const
	Vue = require('vue');

Vue.config.errorHandler = (err, vm) => {
	console.error(err, vm);
};

if (process.env.NODE_ENV === 'production') {
	require('raven-js')
		.config(require('core/config').sentry.url)
		.addPlugin(require('raven-js/plugins/vue'), Vue)
		.install();
}

const
	EventEmitter2 = require('eventemitter2').EventEmitter2;

export const
	rootComponents = {},
	staticComponents = {},
	localComponents = {},
	components = {},
	props = {},
	initEvent = new EventEmitter2({maxListeners: 1e3});

/**
 * Returns a component name
 * @param constr
 */
export function getComponentName(constr: Function): string {
	return (constr.name || '').dasherize();
}

/**
 * Adds a root component to the global cache
 * @decorator
 */
export function rootComponent(target) {
	const lastBlock = getComponentName(target);
	rootComponents[lastBlock] = target;
	props[lastBlock] = props[lastBlock] || {};
	initEvent.emit('component', lastBlock);
}

/**
 * Defines the specified Vue property
 *
 * @decorator
 * @param type - property type
 * @param required - true if the property is required
 */
export function prop(type: any, required: boolean) {
	return (target, key, desc) => {
		initEvent.once('component', (block) => {
			let def = desc.initializer();
			if (Object.isObject(def) || Object.isArray(def)) {
				def = new Function(`return ${def.toSource()}`);

			} else if (Object.isDate(def)) {
				def = def.clone();
			}

			props[block][key] = {
				type,
				default: def,
				required
			};
		});
	};
}

const
	isAbstract = /^i-/;

/**
 * Creates new Vue.js component
 *
 * @decorator
 * @param [functional] - if true, then the component will be created as functional
 * @param [tpl] - if false, then will be used the default template
 */
export function component(
	{functional, tpl}: {
		functional?: boolean,
		tpls?: boolean
	} = {}
) {
	return (target) => {
		rootComponent(target);

		const
			name = getComponentName(target),
			parent = getComponentName(Object.getPrototypeOf(target));

		const p = {
			props: {},
			data: {}
		};

		const opts = {
			functional
		};

		const whitelist = {
			with: true,
			model: true,
			provide: true,
			inject: true,
			components: true,
			transitions: true,
			filters: true,
			directives: true,
			delimiters: true
		};

		{
			const
				obj = props[name],
				keys = Object.keys(obj);

			for (let i = 0; i < keys.length; i++) {
				const
					key = keys[i],
					el = obj[key];

				if (el.abstract) {
					continue;
				}

				if (whitelist[key]) {
					opts[key] = el;

				} else {
					p[el.data ? 'data' : 'props'][key] = el;
				}
			}
		}

		const comp = new target({
			name,
			parent,
			opts,
			props: p.props,
			fields: p.data
		});

		if (comp.model) {
			comp.model.event = comp.model.event.dasherize();
		}

		const
			parentComp = components[parent],
			parentCompStatic = staticComponents[parent];

		if (parentComp) {
			comp.mixins = comp.mixins || [];
			comp.mixins.push(parentComp);
			comp.parentComponent = parentCompStatic;
		}

		const
			clone = {};

		{
			const
				keys = Object.keys(comp);

			for (let i = 0; i < keys.length; i++) {
				const
					key = keys[i],
					el = comp[key];

				clone[key] = Object.isObject(el) ? {...el} : el;
			}
		}

		staticComponents[name] = clone;
		components[name] = comp;

		if (parentComp) {
			const
				keys = Object.keys(parentCompStatic);

			for (let i = 0; i < keys.length; i++) {
				const
					key = keys[i],
					el = parentCompStatic[key];

				if (Object.isTable(el) && Object.isTable(clone[key])) {
					Object.setPrototypeOf(clone[key], el);

				} else if (key in clone === false) {
					clone[key] = el;
				}
			}
		}

		function loader(resolve) {
			const success = () => {
				if (localComponents[name]) {
					comp.components = Object.assign(comp.components || {}, localComponents[name]);
					clone.components = {...comp.components};
				}

				resolve(comp);
				ModuleDependencies.event.emit(`component.${name}`, {comp, name});
			};

			const addRenderAndResolve = (tpls) => {
				Object.assign(comp, tpls.index());
				success();
			};

			if ('render' in comp || functional) {
				success();

			} else if (isAbstract.test(name) || tpl === false) {
				addRenderAndResolve(defTpls.block);

			} else {
				const f = () => {
					if (TPLS[name]) {
						addRenderAndResolve(TPLS[name]);

					} else {
						setImmediate(f);
					}
				};

				f();
			}
		}

		if (comp.with) {
			const l = comp.with.dasherize();
			localComponents[l] = localComponents[l] || {};
			localComponents[l][name] = () => new Promise(loader);

		} else {
			Vue.component(name, loader);
		}

		return target;
	};
}