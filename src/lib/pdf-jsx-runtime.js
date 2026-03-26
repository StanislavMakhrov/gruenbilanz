/**
 * Custom JSX runtime for @react-pdf/renderer components.
 *
 * WHY THIS EXISTS:
 * Next.js 15 compiles server components with the RSC-vendored React (accessed via
 * `next/dist/compiled/next-server/app-page.runtime.prod.js`.vendored["react-rsc"].React).
 * The standard `react/jsx-runtime.js` (from node_modules/react) accesses React's
 * internal `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner` at
 * module initialisation time. However, the RSC-vendored React does NOT expose this
 * internal, so loading the standard jsx-runtime in the webpack server bundle throws:
 *   TypeError: Cannot read properties of undefined (reading 'ReactCurrentOwner')
 * This crashes every request that tries to render a PDF.
 *
 * FIX: Provide a self-contained JSX runtime that creates plain React elements without
 * touching React internals. The elements have the standard `$$typeof: Symbol.for("react.element")`
 * which @react-pdf/reconciler accepts normally.
 *
 * USAGE: This file is aliased as the `react/jsx-runtime` for files inside
 * `components/reports/**` via the webpack `resolve.alias` rule in next.config.ts.
 */

"use strict";

const REACT_ELEMENT_TYPE = Symbol.for("react.element");
const REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");

// Reserved React props that are not passed to the component as regular props.
const RESERVED_PROPS = { key: true, ref: true, __self: true, __source: true };
const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Creates a React element without using React.__SECRET_INTERNALS.
 * Compatible with @react-pdf/reconciler which only checks $$typeof and type.
 */
function jsx(type, config, maybeKey) {
  const props = {};
  let key = null;
  let ref = null;

  if (maybeKey !== undefined) {
    key = "" + maybeKey;
  }
  if (config !== null && config !== undefined) {
    if (config.key !== undefined) {
      key = "" + config.key;
    }
    if (config.ref !== undefined) {
      ref = config.ref;
    }
    for (const propName in config) {
      if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS[propName]) {
        props[propName] = config[propName];
      }
    }
  }

  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    // _owner is set to null — safe because @react-pdf/reconciler does not use it.
    _owner: null,
  };
}

module.exports = {
  jsx,
  jsxs: jsx,
  Fragment: REACT_FRAGMENT_TYPE,
};
