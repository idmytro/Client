/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import symbolGenerator from 'core/symbol';
import { createComponent } from 'core/component/composite';
import { ComponentOptions, DirectiveOptions, DirectiveFunction } from 'vue';
import { constructors, components } from 'core/component/const';
import { VNode, VNodeData } from 'vue/types/vnode';
import { VueConfiguration } from 'vue/types/vue';
import * as _ from 'core/component/engines/zero/helpers';
export { default as minimalCtx } from 'core/component/engines/zero/ctx';

//#if VueInterfaces
export * from 'vue';
export { InjectOptions } from 'vue/types/options';
export { VNode, ScopedSlot } from 'vue/types/vnode';
//#endif

export interface Options extends Dictionary {
	filters: Dictionary<Function>;
	directives: Dictionary<DirectiveOptions>;
}

export const supports = {
	functional: false
};

export const options: Options = {
	filters: {},
	directives: {}
};

const
	$$ = symbolGenerator();

export class ComponentDriver {
	static config: VueConfiguration = {
		silent: true,
		devtools: false,
		productionTip: false,
		performance: false,
		optionMergeStrategies: {},
		keyCodes: {},
		ignoredElements: [],
		errorHandler: console.error,
		warnHandler: console.warn
	};

	/**
	 * Shim for Vue.component
	 *
	 * @param id
	 * @param factory
	 */
	static component(id: string, factory: any): Promise<ComponentOptions<any>> {
		if (Object.isFunction(factory)) {
			return new Promise(factory);
		}

		return Promise.resolve(factory);
	}

	/**
	 * Shim for Vue.directive
	 *
	 * @param id
	 * @param [definition]
	 */
	static directive(id: string, definition?: DirectiveOptions | DirectiveFunction): DirectiveOptions {
		const
			obj = <DirectiveOptions>{};

		if (Object.isFunction(definition)) {
			obj.bind = definition;
			obj.update = definition;

		} else if (definition) {
			Object.assign(obj, definition);
		}

		options.directives[id] = obj;
		return obj;
	}

	/**
	 * Shim for Vue.filter
	 *
	 * @param id
	 * @param [definition]
	 */
	static filter(id: string, definition?: Function): Function {
		return options.filters[id] = definition || ((v) => v);
	}

	/**
	 * Component options
	 */
	$options: Dictionary = {...options};

	/**
	 * @param opts
	 */
	constructor(opts: ComponentOptions<any>) {
		const
			{el} = opts,
			[res] = createComponent<Element, ComponentDriver>(opts, this);

		if (el && res) {
			if (Object.isString(el)) {
				const
					node = document.querySelector(el);

				if (node) {
					node.appendChild(res);
				}

				return;
			}

			el.appendChild(res);
		}
	}

	/**
	 * Shim for Vue.$createElement
	 *
	 * @param tag
	 * @param attrs
	 * @param children
	 */
	$createElement(
		this: Dictionary<unknown>,
		tag: string | Node,
		attrs?: VNodeData | Node[],
		children?: Node[]
	): Node {
		if (Object.isString(tag)) {
			const
				refs = this.$refs = <Dictionary>this.$refs || {};

			let
				opts: VNodeData;

			if (Object.isObject(attrs)) {
				children = (<Node[]>[]).concat(children || []);
				opts = <VNodeData>attrs;

			} else {
				children = (<Node[]>[]).concat(attrs || []);
				opts = {};
			}

			const
				constr = constructors[tag],
				meta = constr && components.get(constr);

			if (meta) {
				const
					props = {},
					attrs = {};

				if (opts.attrs) {
					for (let o = opts.attrs, keys = Object.keys(o), i = 0; i < keys.length; i++) {
						const
							key = keys[i],
							nm = key.camelize(false),
							val = o[key];

						if (meta.props[nm]) {
							props[nm] = val;

						} else {
							attrs[key] = val;
						}
					}
				}

				const baseCtx = Object.assign(Object.create(this), {
					props,

					$createElement: ComponentDriver.prototype.$createElement,
					$options: {...options},

					data: {
						attrs,
						on: opts.on
					},

					slots: () => {
						const
							res = <Dictionary>{};

						if (!children || !children.length) {
							return res;
						}

						const
							f = <Element>children[0];

						if (f.getAttribute && f.getAttribute('slot')) {
							for (let i = 0; i < children.length; i++) {
								const
									slot = <Element>children[i],
									key = slot.getAttribute('slot');

								if (!key) {
									continue;
								}

								res[key] = slot;
							}

							return res;
						}

						let
							slot;

						if (children.length === 1) {
							slot = f;

						} else {
							slot = _.createTemplate();

							for (let o = Array.from(children), i = 0; i < o.length; i++) {
								slot.appendChild(o[i]);
							}
						}

						res.default = slot;
						return res;
					},

					scopedSlots: () => {
						const
							res = {};

						if (opts.scopedSlots) {
							for (let o = opts.scopedSlots, keys = Object.keys(o), i = 0; i < keys.length; i++) {
								const key = keys[i];
								res[key] = o[key];
							}
						}

						return res;
					}
				});

				const [node, ctx] =
					createComponent<Element, ComponentDriver>(tag, baseCtx, <ComponentDriver>this);

				if (node) {
					_.addClass(node, opts);
					_.attachEvents(node, opts.nativeOn);

					if (opts.ref) {
						refs[opts.ref] = ctx;
					}

					if (meta.params.inheritAttrs) {
						_.addAttrs(node, attrs);
					}

					if (opts.on) {
						for (let o = opts.on, keys = Object.keys(o), i = 0; i < keys.length; i++) {
							const
								key = keys[i],
								fns = (<Function[]>[]).concat(o[key]);

							for (let i = 0; i < fns.length; i++) {
								const
									fn = fns[i];

								if (Object.isFunction(fn)) {
									// @ts-ignore
									ctx.$on(key, fn);
								}
							}
						}
					}
				}

				return node || document.createComment('');
			}

			const el = tag === 'template' ? _.createTemplate() :
				tag === 'svg' ? document.createElementNS(_.SVG_NMS, tag) : document.createElement(tag);

			el[$$.data] = opts;
			_.addDirectives(el, opts, opts.directives);

			if (el instanceof Element) {
				if (opts.ref) {
					refs[opts.ref] = el;
				}

				_.addClass(el, opts);
				_.attachEvents(el, opts.on);
			}

			_.addProps(el, opts.domProps);
			_.addAttrs(el, opts.attrs);

			if (el instanceof SVGElement) {
				children = _.createSVGChildren(<Element[]>children, this);
			}

			_.appendChild(el, children);
			return el;
		}

		return tag;
	}
}
