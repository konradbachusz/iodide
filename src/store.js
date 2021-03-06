/* global IODIDE_BUILD_MODE IODIDE_REDUX_LOG_MODE */
import { applyMiddleware, compose, createStore } from "redux";
import thunk from "redux-thunk";
import { createLogger } from "redux-logger";

import createValidatedReducer from "./reducers/create-validated-reducer";
import reducer from "./reducers/reducer";
import { newNotebook, stateSchema } from "./editor-state-prototypes";
import { getUserDataFromDocument } from "./tools/server-tools";

let enhancer;
let finalReducer;

if (IODIDE_BUILD_MODE === "production") {
  finalReducer = reducer;
  enhancer = applyMiddleware(thunk);
} else if (IODIDE_BUILD_MODE === "test" || IODIDE_REDUX_LOG_MODE === "SILENT") {
  finalReducer = createValidatedReducer(reducer, stateSchema);
  enhancer = applyMiddleware(thunk);
} else {
  finalReducer = createValidatedReducer(reducer, stateSchema);
  enhancer = compose(
    applyMiddleware(thunk),
    applyMiddleware(
      createLogger({
        predicate: (getState, action) =>
          ![
            "UPDATE_JSMD_CONTENT",
            "UPDATE_MARKDOWN_CHUNKS",
            "UPDATE_CURSOR",
            "UPDATE_SELECTIONS"
          ].includes(action.type)
      })
    )
  );
}
const store = createStore(
  finalReducer,
  Object.assign(newNotebook(), getUserDataFromDocument()),
  enhancer
);

const { dispatch } = store;
export { store, dispatch };
