"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const require$$3 = require("electron");
const node_os = require("node:os");
const path = require("node:path");
const require$$0 = require("events");
const fs = require("fs");
const path$1 = require("path");
const https = require("https");
const os = require("os");
const elementPlus = require("element-plus");
const axios = require("axios");
const worker_threads = require("worker_threads");
const child_process = require("child_process");
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var main$1 = {};
var server = {};
var objectsRegistry = {};
Object.defineProperty(objectsRegistry, "__esModule", { value: true });
const getOwnerKey = (webContents, contextId) => {
  return `${webContents.id}-${contextId}`;
};
class ObjectsRegistry {
  constructor() {
    this.nextId = 0;
    this.storage = {};
    this.owners = {};
    this.electronIds = /* @__PURE__ */ new WeakMap();
  }
  // Register a new object and return its assigned ID. If the object is already
  // registered then the already assigned ID would be returned.
  add(webContents, contextId, obj) {
    const id = this.saveToStorage(obj);
    const ownerKey = getOwnerKey(webContents, contextId);
    let owner = this.owners[ownerKey];
    if (!owner) {
      owner = this.owners[ownerKey] = /* @__PURE__ */ new Map();
      this.registerDeleteListener(webContents, contextId);
    }
    if (!owner.has(id)) {
      owner.set(id, 0);
      this.storage[id].count++;
    }
    owner.set(id, owner.get(id) + 1);
    return id;
  }
  // Get an object according to its ID.
  get(id) {
    const pointer = this.storage[id];
    if (pointer != null)
      return pointer.object;
  }
  // Dereference an object according to its ID.
  // Note that an object may be double-freed (cleared when page is reloaded, and
  // then garbage collected in old page).
  remove(webContents, contextId, id) {
    const ownerKey = getOwnerKey(webContents, contextId);
    const owner = this.owners[ownerKey];
    if (owner && owner.has(id)) {
      const newRefCount = owner.get(id) - 1;
      if (newRefCount <= 0) {
        owner.delete(id);
        this.dereference(id);
      } else {
        owner.set(id, newRefCount);
      }
    }
  }
  // Clear all references to objects refrenced by the WebContents.
  clear(webContents, contextId) {
    const ownerKey = getOwnerKey(webContents, contextId);
    const owner = this.owners[ownerKey];
    if (!owner)
      return;
    for (const id of owner.keys())
      this.dereference(id);
    delete this.owners[ownerKey];
  }
  // Saves the object into storage and assigns an ID for it.
  saveToStorage(object) {
    let id = this.electronIds.get(object);
    if (!id) {
      id = ++this.nextId;
      this.storage[id] = {
        count: 0,
        object
      };
      this.electronIds.set(object, id);
    }
    return id;
  }
  // Dereference the object from store.
  dereference(id) {
    const pointer = this.storage[id];
    if (pointer == null) {
      return;
    }
    pointer.count -= 1;
    if (pointer.count === 0) {
      this.electronIds.delete(pointer.object);
      delete this.storage[id];
    }
  }
  // Clear the storage when renderer process is destroyed.
  registerDeleteListener(webContents, contextId) {
    const processHostId = contextId.split("-")[0];
    const listener = (_, deletedProcessHostId) => {
      if (deletedProcessHostId && deletedProcessHostId.toString() === processHostId) {
        webContents.removeListener("render-view-deleted", listener);
        this.clear(webContents, contextId);
      }
    };
    webContents.on("render-view-deleted", listener);
  }
}
objectsRegistry.default = new ObjectsRegistry();
var typeUtils = {};
Object.defineProperty(typeUtils, "__esModule", { value: true });
typeUtils.deserialize = typeUtils.serialize = typeUtils.isSerializableObject = typeUtils.isPromise = void 0;
const electron_1 = require$$3;
function isPromise(val) {
  return val && val.then && val.then instanceof Function && val.constructor && val.constructor.reject && val.constructor.reject instanceof Function && val.constructor.resolve && val.constructor.resolve instanceof Function;
}
typeUtils.isPromise = isPromise;
const serializableTypes = [
  Boolean,
  Number,
  String,
  Date,
  Error,
  RegExp,
  ArrayBuffer
];
function isSerializableObject(value) {
  return value === null || ArrayBuffer.isView(value) || serializableTypes.some((type) => value instanceof type);
}
typeUtils.isSerializableObject = isSerializableObject;
const objectMap = function(source, mapper) {
  const sourceEntries = Object.entries(source);
  const targetEntries = sourceEntries.map(([key, val]) => [key, mapper(val)]);
  return Object.fromEntries(targetEntries);
};
function serializeNativeImage(image) {
  const representations = [];
  const scaleFactors = image.getScaleFactors();
  if (scaleFactors.length === 1) {
    const scaleFactor = scaleFactors[0];
    const size = image.getSize(scaleFactor);
    const buffer = image.toBitmap({ scaleFactor });
    representations.push({ scaleFactor, size, buffer });
  } else {
    for (const scaleFactor of scaleFactors) {
      const size = image.getSize(scaleFactor);
      const dataURL = image.toDataURL({ scaleFactor });
      representations.push({ scaleFactor, size, dataURL });
    }
  }
  return { __ELECTRON_SERIALIZED_NativeImage__: true, representations };
}
function deserializeNativeImage(value) {
  const image = electron_1.nativeImage.createEmpty();
  if (value.representations.length === 1) {
    const { buffer, size, scaleFactor } = value.representations[0];
    const { width, height } = size;
    image.addRepresentation({ buffer, scaleFactor, width, height });
  } else {
    for (const rep of value.representations) {
      const { dataURL, size, scaleFactor } = rep;
      const { width, height } = size;
      image.addRepresentation({ dataURL, scaleFactor, width, height });
    }
  }
  return image;
}
function serialize(value) {
  if (value && value.constructor && value.constructor.name === "NativeImage") {
    return serializeNativeImage(value);
  }
  if (Array.isArray(value)) {
    return value.map(serialize);
  } else if (isSerializableObject(value)) {
    return value;
  } else if (value instanceof Object) {
    return objectMap(value, serialize);
  } else {
    return value;
  }
}
typeUtils.serialize = serialize;
function deserialize(value) {
  if (value && value.__ELECTRON_SERIALIZED_NativeImage__) {
    return deserializeNativeImage(value);
  } else if (Array.isArray(value)) {
    return value.map(deserialize);
  } else if (isSerializableObject(value)) {
    return value;
  } else if (value instanceof Object) {
    return objectMap(value, deserialize);
  } else {
    return value;
  }
}
typeUtils.deserialize = deserialize;
var getElectronBinding$1 = {};
Object.defineProperty(getElectronBinding$1, "__esModule", { value: true });
getElectronBinding$1.getElectronBinding = void 0;
const getElectronBinding = (name) => {
  if (process._linkedBinding) {
    return process._linkedBinding("electron_common_" + name);
  } else if (process.electronBinding) {
    return process.electronBinding(name);
  } else {
    return null;
  }
};
getElectronBinding$1.getElectronBinding = getElectronBinding;
(function(exports) {
  var __importDefault = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.initialize = exports.isInitialized = exports.enable = exports.isRemoteModuleEnabled = void 0;
  const events_1 = require$$0;
  const objects_registry_1 = __importDefault(objectsRegistry);
  const type_utils_1 = typeUtils;
  const electron_12 = require$$3;
  const get_electron_binding_1 = getElectronBinding$1;
  const { Promise: Promise2 } = commonjsGlobal;
  const v8Util = get_electron_binding_1.getElectronBinding("v8_util");
  const hasWebPrefsRemoteModuleAPI = (() => {
    var _a, _b;
    const electronVersion = Number((_b = (_a = process.versions.electron) === null || _a === void 0 ? void 0 : _a.split(".")) === null || _b === void 0 ? void 0 : _b[0]);
    return Number.isNaN(electronVersion) || electronVersion < 14;
  })();
  const FUNCTION_PROPERTIES = [
    "length",
    "name",
    "arguments",
    "caller",
    "prototype"
  ];
  const rendererFunctionCache = /* @__PURE__ */ new Map();
  const finalizationRegistry = new FinalizationRegistry((fi) => {
    const mapKey = fi.id[0] + "~" + fi.id[1];
    const ref = rendererFunctionCache.get(mapKey);
    if (ref !== void 0 && ref.deref() === void 0) {
      rendererFunctionCache.delete(mapKey);
      if (!fi.webContents.isDestroyed()) {
        try {
          fi.webContents.sendToFrame(fi.frameId, "REMOTE_RENDERER_RELEASE_CALLBACK", fi.id[0], fi.id[1]);
        } catch (error) {
          console.warn(`sendToFrame() failed: ${error}`);
        }
      }
    }
  });
  function getCachedRendererFunction(id) {
    const mapKey = id[0] + "~" + id[1];
    const ref = rendererFunctionCache.get(mapKey);
    if (ref !== void 0) {
      const deref = ref.deref();
      if (deref !== void 0)
        return deref;
    }
  }
  function setCachedRendererFunction(id, wc, frameId, value) {
    const wr = new WeakRef(value);
    const mapKey = id[0] + "~" + id[1];
    rendererFunctionCache.set(mapKey, wr);
    finalizationRegistry.register(value, {
      id,
      webContents: wc,
      frameId
    });
    return value;
  }
  const locationInfo = /* @__PURE__ */ new WeakMap();
  const getObjectMembers = function(object) {
    let names = Object.getOwnPropertyNames(object);
    if (typeof object === "function") {
      names = names.filter((name) => {
        return !FUNCTION_PROPERTIES.includes(name);
      });
    }
    return names.map((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(object, name);
      let type;
      let writable = false;
      if (descriptor.get === void 0 && typeof object[name] === "function") {
        type = "method";
      } else {
        if (descriptor.set || descriptor.writable)
          writable = true;
        type = "get";
      }
      return { name, enumerable: descriptor.enumerable, writable, type };
    });
  };
  const getObjectPrototype = function(object) {
    const proto = Object.getPrototypeOf(object);
    if (proto === null || proto === Object.prototype)
      return null;
    return {
      members: getObjectMembers(proto),
      proto: getObjectPrototype(proto)
    };
  };
  const valueToMeta = function(sender, contextId, value, optimizeSimpleObject = false) {
    let type;
    switch (typeof value) {
      case "object":
        if (value instanceof Buffer) {
          type = "buffer";
        } else if (value && value.constructor && value.constructor.name === "NativeImage") {
          type = "nativeimage";
        } else if (Array.isArray(value)) {
          type = "array";
        } else if (value instanceof Error) {
          type = "error";
        } else if (type_utils_1.isSerializableObject(value)) {
          type = "value";
        } else if (type_utils_1.isPromise(value)) {
          type = "promise";
        } else if (Object.prototype.hasOwnProperty.call(value, "callee") && value.length != null) {
          type = "array";
        } else if (optimizeSimpleObject && v8Util.getHiddenValue(value, "simple")) {
          type = "value";
        } else {
          type = "object";
        }
        break;
      case "function":
        type = "function";
        break;
      default:
        type = "value";
        break;
    }
    if (type === "array") {
      return {
        type,
        members: value.map((el) => valueToMeta(sender, contextId, el, optimizeSimpleObject))
      };
    } else if (type === "nativeimage") {
      return { type, value: type_utils_1.serialize(value) };
    } else if (type === "object" || type === "function") {
      return {
        type,
        name: value.constructor ? value.constructor.name : "",
        // Reference the original value if it's an object, because when it's
        // passed to renderer we would assume the renderer keeps a reference of
        // it.
        id: objects_registry_1.default.add(sender, contextId, value),
        members: getObjectMembers(value),
        proto: getObjectPrototype(value)
      };
    } else if (type === "buffer") {
      return { type, value };
    } else if (type === "promise") {
      value.then(function() {
      }, function() {
      });
      return {
        type,
        then: valueToMeta(sender, contextId, function(onFulfilled, onRejected) {
          value.then(onFulfilled, onRejected);
        })
      };
    } else if (type === "error") {
      return {
        type,
        value,
        members: Object.keys(value).map((name) => ({
          name,
          value: valueToMeta(sender, contextId, value[name])
        }))
      };
    } else {
      return {
        type: "value",
        value
      };
    }
  };
  const throwRPCError = function(message) {
    const error = new Error(message);
    error.code = "EBADRPC";
    error.errno = -72;
    throw error;
  };
  const removeRemoteListenersAndLogWarning = (sender, callIntoRenderer) => {
    const location = locationInfo.get(callIntoRenderer);
    let message = `Attempting to call a function in a renderer window that has been closed or released.
Function provided here: ${location}`;
    if (sender instanceof events_1.EventEmitter) {
      const remoteEvents = sender.eventNames().filter((eventName) => {
        return sender.listeners(eventName).includes(callIntoRenderer);
      });
      if (remoteEvents.length > 0) {
        message += `
Remote event names: ${remoteEvents.join(", ")}`;
        remoteEvents.forEach((eventName) => {
          sender.removeListener(eventName, callIntoRenderer);
        });
      }
    }
    console.warn(message);
  };
  const fakeConstructor = (constructor, name) => new Proxy(Object, {
    get(target, prop, receiver) {
      if (prop === "name") {
        return name;
      } else {
        return Reflect.get(target, prop, receiver);
      }
    }
  });
  const unwrapArgs = function(sender, frameId, contextId, args) {
    const metaToValue = function(meta) {
      switch (meta.type) {
        case "nativeimage":
          return type_utils_1.deserialize(meta.value);
        case "value":
          return meta.value;
        case "remote-object":
          return objects_registry_1.default.get(meta.id);
        case "array":
          return unwrapArgs(sender, frameId, contextId, meta.value);
        case "buffer":
          return Buffer.from(meta.value.buffer, meta.value.byteOffset, meta.value.byteLength);
        case "promise":
          return Promise2.resolve({
            then: metaToValue(meta.then)
          });
        case "object": {
          const ret = meta.name !== "Object" ? /* @__PURE__ */ Object.create({
            constructor: fakeConstructor(Object, meta.name)
          }) : {};
          for (const { name, value } of meta.members) {
            ret[name] = metaToValue(value);
          }
          return ret;
        }
        case "function-with-return-value": {
          const returnValue = metaToValue(meta.value);
          return function() {
            return returnValue;
          };
        }
        case "function": {
          const objectId = [contextId, meta.id];
          const cachedFunction = getCachedRendererFunction(objectId);
          if (cachedFunction !== void 0) {
            return cachedFunction;
          }
          const callIntoRenderer = function(...args2) {
            let succeed = false;
            if (!sender.isDestroyed()) {
              try {
                succeed = sender.sendToFrame(frameId, "REMOTE_RENDERER_CALLBACK", contextId, meta.id, valueToMeta(sender, contextId, args2)) !== false;
              } catch (error) {
                console.warn(`sendToFrame() failed: ${error}`);
              }
            }
            if (!succeed) {
              removeRemoteListenersAndLogWarning(this, callIntoRenderer);
            }
          };
          locationInfo.set(callIntoRenderer, meta.location);
          Object.defineProperty(callIntoRenderer, "length", { value: meta.length });
          setCachedRendererFunction(objectId, sender, frameId, callIntoRenderer);
          return callIntoRenderer;
        }
        default:
          throw new TypeError(`Unknown type: ${meta.type}`);
      }
    };
    return args.map(metaToValue);
  };
  const isRemoteModuleEnabledImpl = function(contents) {
    const webPreferences = contents.getLastWebPreferences() || {};
    return webPreferences.enableRemoteModule != null ? !!webPreferences.enableRemoteModule : false;
  };
  const isRemoteModuleEnabledCache = /* @__PURE__ */ new WeakMap();
  const isRemoteModuleEnabled = function(contents) {
    if (hasWebPrefsRemoteModuleAPI && !isRemoteModuleEnabledCache.has(contents)) {
      isRemoteModuleEnabledCache.set(contents, isRemoteModuleEnabledImpl(contents));
    }
    return isRemoteModuleEnabledCache.get(contents);
  };
  exports.isRemoteModuleEnabled = isRemoteModuleEnabled;
  function enable(contents) {
    isRemoteModuleEnabledCache.set(contents, true);
  }
  exports.enable = enable;
  const handleRemoteCommand = function(channel, handler) {
    electron_12.ipcMain.on(channel, (event, contextId, ...args) => {
      let returnValue;
      if (!exports.isRemoteModuleEnabled(event.sender)) {
        event.returnValue = {
          type: "exception",
          value: valueToMeta(event.sender, contextId, new Error('@electron/remote is disabled for this WebContents. Call require("@electron/remote/main").enable(webContents) to enable it.'))
        };
        return;
      }
      try {
        returnValue = handler(event, contextId, ...args);
      } catch (error) {
        returnValue = {
          type: "exception",
          value: valueToMeta(event.sender, contextId, error)
        };
      }
      if (returnValue !== void 0) {
        event.returnValue = returnValue;
      }
    });
  };
  const emitCustomEvent = function(contents, eventName, ...args) {
    const event = { sender: contents, returnValue: void 0, defaultPrevented: false };
    electron_12.app.emit(eventName, event, contents, ...args);
    contents.emit(eventName, event, ...args);
    return event;
  };
  const logStack = function(contents, code, stack) {
    if (stack) {
      console.warn(`WebContents (${contents.id}): ${code}`, stack);
    }
  };
  let initialized = false;
  function isInitialized() {
    return initialized;
  }
  exports.isInitialized = isInitialized;
  function initialize() {
    if (initialized)
      throw new Error("@electron/remote has already been initialized");
    initialized = true;
    handleRemoteCommand("REMOTE_BROWSER_WRONG_CONTEXT_ERROR", function(event, contextId, passedContextId, id) {
      const objectId = [passedContextId, id];
      const cachedFunction = getCachedRendererFunction(objectId);
      if (cachedFunction === void 0) {
        return;
      }
      removeRemoteListenersAndLogWarning(event.sender, cachedFunction);
    });
    handleRemoteCommand("REMOTE_BROWSER_REQUIRE", function(event, contextId, moduleName, stack) {
      logStack(event.sender, `remote.require('${moduleName}')`, stack);
      const customEvent = emitCustomEvent(event.sender, "remote-require", moduleName);
      if (customEvent.returnValue === void 0) {
        if (customEvent.defaultPrevented) {
          throw new Error(`Blocked remote.require('${moduleName}')`);
        } else {
          customEvent.returnValue = process.mainModule.require(moduleName);
        }
      }
      return valueToMeta(event.sender, contextId, customEvent.returnValue);
    });
    handleRemoteCommand("REMOTE_BROWSER_GET_BUILTIN", function(event, contextId, moduleName, stack) {
      logStack(event.sender, `remote.getBuiltin('${moduleName}')`, stack);
      const customEvent = emitCustomEvent(event.sender, "remote-get-builtin", moduleName);
      if (customEvent.returnValue === void 0) {
        if (customEvent.defaultPrevented) {
          throw new Error(`Blocked remote.getBuiltin('${moduleName}')`);
        } else {
          customEvent.returnValue = require$$3[moduleName];
        }
      }
      return valueToMeta(event.sender, contextId, customEvent.returnValue);
    });
    handleRemoteCommand("REMOTE_BROWSER_GET_GLOBAL", function(event, contextId, globalName, stack) {
      logStack(event.sender, `remote.getGlobal('${globalName}')`, stack);
      const customEvent = emitCustomEvent(event.sender, "remote-get-global", globalName);
      if (customEvent.returnValue === void 0) {
        if (customEvent.defaultPrevented) {
          throw new Error(`Blocked remote.getGlobal('${globalName}')`);
        } else {
          customEvent.returnValue = commonjsGlobal[globalName];
        }
      }
      return valueToMeta(event.sender, contextId, customEvent.returnValue);
    });
    handleRemoteCommand("REMOTE_BROWSER_GET_CURRENT_WINDOW", function(event, contextId, stack) {
      logStack(event.sender, "remote.getCurrentWindow()", stack);
      const customEvent = emitCustomEvent(event.sender, "remote-get-current-window");
      if (customEvent.returnValue === void 0) {
        if (customEvent.defaultPrevented) {
          throw new Error("Blocked remote.getCurrentWindow()");
        } else {
          customEvent.returnValue = event.sender.getOwnerBrowserWindow();
        }
      }
      return valueToMeta(event.sender, contextId, customEvent.returnValue);
    });
    handleRemoteCommand("REMOTE_BROWSER_GET_CURRENT_WEB_CONTENTS", function(event, contextId, stack) {
      logStack(event.sender, "remote.getCurrentWebContents()", stack);
      const customEvent = emitCustomEvent(event.sender, "remote-get-current-web-contents");
      if (customEvent.returnValue === void 0) {
        if (customEvent.defaultPrevented) {
          throw new Error("Blocked remote.getCurrentWebContents()");
        } else {
          customEvent.returnValue = event.sender;
        }
      }
      return valueToMeta(event.sender, contextId, customEvent.returnValue);
    });
    handleRemoteCommand("REMOTE_BROWSER_CONSTRUCTOR", function(event, contextId, id, args) {
      args = unwrapArgs(event.sender, event.frameId, contextId, args);
      const constructor = objects_registry_1.default.get(id);
      if (constructor == null) {
        throwRPCError(`Cannot call constructor on missing remote object ${id}`);
      }
      return valueToMeta(event.sender, contextId, new constructor(...args));
    });
    handleRemoteCommand("REMOTE_BROWSER_FUNCTION_CALL", function(event, contextId, id, args) {
      args = unwrapArgs(event.sender, event.frameId, contextId, args);
      const func = objects_registry_1.default.get(id);
      if (func == null) {
        throwRPCError(`Cannot call function on missing remote object ${id}`);
      }
      try {
        return valueToMeta(event.sender, contextId, func(...args), true);
      } catch (error) {
        const err = new Error(`Could not call remote function '${func.name || "anonymous"}'. Check that the function signature is correct. Underlying error: ${error}
` + (error instanceof Error ? `Underlying stack: ${error.stack}
` : ""));
        err.cause = error;
        throw err;
      }
    });
    handleRemoteCommand("REMOTE_BROWSER_MEMBER_CONSTRUCTOR", function(event, contextId, id, method, args) {
      args = unwrapArgs(event.sender, event.frameId, contextId, args);
      const object = objects_registry_1.default.get(id);
      if (object == null) {
        throwRPCError(`Cannot call constructor '${method}' on missing remote object ${id}`);
      }
      return valueToMeta(event.sender, contextId, new object[method](...args));
    });
    handleRemoteCommand("REMOTE_BROWSER_MEMBER_CALL", function(event, contextId, id, method, args) {
      args = unwrapArgs(event.sender, event.frameId, contextId, args);
      const object = objects_registry_1.default.get(id);
      if (object == null) {
        throwRPCError(`Cannot call method '${method}' on missing remote object ${id}`);
      }
      try {
        return valueToMeta(event.sender, contextId, object[method](...args), true);
      } catch (error) {
        const err = new Error(`Could not call remote method '${method}'. Check that the method signature is correct. Underlying error: ${error}` + (error instanceof Error ? `Underlying stack: ${error.stack}
` : ""));
        err.cause = error;
        throw err;
      }
    });
    handleRemoteCommand("REMOTE_BROWSER_MEMBER_SET", function(event, contextId, id, name, args) {
      args = unwrapArgs(event.sender, event.frameId, contextId, args);
      const obj = objects_registry_1.default.get(id);
      if (obj == null) {
        throwRPCError(`Cannot set property '${name}' on missing remote object ${id}`);
      }
      obj[name] = args[0];
      return null;
    });
    handleRemoteCommand("REMOTE_BROWSER_MEMBER_GET", function(event, contextId, id, name) {
      const obj = objects_registry_1.default.get(id);
      if (obj == null) {
        throwRPCError(`Cannot get property '${name}' on missing remote object ${id}`);
      }
      return valueToMeta(event.sender, contextId, obj[name]);
    });
    handleRemoteCommand("REMOTE_BROWSER_DEREFERENCE", function(event, contextId, id) {
      objects_registry_1.default.remove(event.sender, contextId, id);
    });
    handleRemoteCommand("REMOTE_BROWSER_CONTEXT_RELEASE", (event, contextId) => {
      objects_registry_1.default.clear(event.sender, contextId);
      return null;
    });
  }
  exports.initialize = initialize;
})(server);
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.enable = exports.isInitialized = exports.initialize = void 0;
  var server_1 = server;
  Object.defineProperty(exports, "initialize", { enumerable: true, get: function() {
    return server_1.initialize;
  } });
  Object.defineProperty(exports, "isInitialized", { enumerable: true, get: function() {
    return server_1.isInitialized;
  } });
  Object.defineProperty(exports, "enable", { enumerable: true, get: function() {
    return server_1.enable;
  } });
})(main$1);
var main = main$1;
const remote = /* @__PURE__ */ getDefaultExportFromCjs(main);
function mkdirsSync(dirname) {
  if (fs.existsSync(dirname)) {
    return false;
  } else {
    if (fs.existsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    } else {
      fs.mkdirSync(path.dirname(dirname));
      return false;
    }
  }
}
const createSystemStore = (app) => {
  const systemStore = path.join(app.getPath("documents"), "javPlayer");
  mkdirsSync(systemStore);
  if (!fs.existsSync(path.join(systemStore, "data"))) {
    mkdirsSync(path.join(systemStore, "data"));
    for (let i = 1; i <= 20; i++) {
      const documentsPath = path.join(os.homedir(), "Documents");
      const docPath = path.join(documentsPath, "javPlayer");
      try {
        fs.writeFile(docPath + `/data/data${i}.json`, `[]`, (err) => {
          if (err) {
            console.log(err);
            throw err;
          }
          console.log(`data${i}.json创建成功`);
        });
      } catch (e) {
        fs.rmdirSync(path.join(systemStore, "data"), { recursive: true });
        createSystemStore(app);
      }
    }
  }
  if (!fs.existsSync(path.join(systemStore, "storeLog.json"))) {
    fs.writeFileSync(path.join(systemStore, "storeLog.json"), `{
      "coverPath": "L:/av/public/cover",
      "previewPath": "L:/av/public/preview",
      "videoPath": "L:/av/public/video",
      "downloadPath": "L:/av/public/videoDownload"
    }`, "utf-8");
  }
  return systemStore;
};
function formatFileSize(fileSize) {
  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB"
  ];
  let index = 0;
  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024;
    index++;
  }
  return fileSize.toFixed(2) + units[index];
}
function quickSortByTimestamp(arr, key, isIncremental = true) {
  if (arr.length <= 1) {
    return arr;
  }
  const pivot = arr[Math.floor(arr.length / 2)];
  const less = [];
  const equal = [];
  const greater = [];
  for (const element of arr) {
    if (!element)
      break;
    if (element[key] < pivot[key]) {
      less.push(element);
    } else if (element[key] > pivot[key]) {
      greater.push(element);
    } else {
      equal.push(element);
    }
  }
  if (isIncremental) {
    return [...quickSortByTimestamp(less, key, isIncremental), ...equal, ...quickSortByTimestamp(greater, key, isIncremental)];
  } else {
    return [...quickSortByTimestamp(greater, key, isIncremental), ...equal, ...quickSortByTimestamp(less, key, isIncremental)];
  }
}
async function merge(name, downPath, videoPath, thread, event) {
  let filenames;
  for (let i = 1; i <= thread; i++) {
    const has = fs.existsSync(path$1.join(downPath, `/${i}.ts`));
    if (has) {
      if (i === 1) {
        filenames = "1.ts";
      } else {
        filenames += `|${i}.ts`;
      }
    }
  }
  if (filenames === void 0)
    return;
  const max = {
    // 一次性最大缓存 不限制
    maxBuffer: 1024 * 1024 * 1024,
    cwd: downPath
  };
  const cmd = `cd ${downPath} && ffmpeg -i "concat:${filenames}" -c copy -bsf:a aac_adtstoasc -movflags +faststart ${videoPath}/${name}.mp4`;
  try {
    await child_process.exec(cmd, max);
    return "合成成功";
  } catch (e) {
    console.log(e);
    return "合成失败";
  }
}
class WindowManager {
  /**
   * Creates an instance of WindowManager.
   * @param {BrowserWindow} win
   * @param {App} app
   * @param {BrowserWindow} mainWindow
   * @memberof WindowManager
   */
  constructor(win2, app, mainWindow) {
    __publicField(this, "win");
    __publicField(this, "app");
    __publicField(this, "pathJson");
    __publicField(this, "downloadPlanArr");
    this.win = win2;
    this.app = app;
    this.pathJson = {
      coverPath: "",
      previewPath: "",
      videoPath: "",
      videoDownload: ""
    };
    this.downloadPlanArr = [];
    this.registerHandleWin();
    this.registerHandleOpenDir();
    this.registerHandleStoreData();
    this.registerGetListData();
    this.registerDownloadVideoEvent();
    this.registerGetDownloadSpeed();
    this.registerGetDownloadListContent();
    this.registerDeleteDirFile();
    this.registerCreateDir();
    this.registerHandleDeleteFile();
    this.registeronMergeVideo();
    this.registerOpenDir();
  }
  // 处理窗口操作请求
  handleWinAction(arg) {
    return new Promise((resolve, reject) => {
      switch (arg) {
        case "close":
          this.closeWindow();
          resolve("success");
          break;
        case "minimize":
          this.minimizeWindow();
          resolve("success");
          break;
        case "maximize":
          this.toggleMaximize();
          resolve("success");
          break;
        case "changeTheme":
          this.toggleTheme();
          resolve("success");
          break;
        default:
          reject(new Error("Invalid action"));
      }
    });
  }
  // 处理 onHandleWin 请求
  onHandleWin(event, arg) {
    this.handleWinAction(arg).then((response) => {
      event.sender.send("onHandleWin", response);
    }).catch((error) => {
      event.sender.send("onHandleWin", { error: error.message });
    });
  }
  // 注册 onHandleWin 事件监听
  registerHandleWin() {
    require$$3.ipcMain.handle("onHandleWin", this.onHandleWin.bind(this));
  }
  // 关闭窗口
  closeWindow() {
    this.win = null;
    if (process.platform !== "darwin")
      this.app.quit();
  }
  // 最小化窗口
  minimizeWindow() {
    var _a;
    (_a = this.win) == null ? void 0 : _a.minimize();
  }
  // 切换最大化/还原窗口
  toggleMaximize() {
    var _a, _b, _c;
    if ((_a = this.win) == null ? void 0 : _a.isMaximized()) {
      (_b = this.win) == null ? void 0 : _b.unmaximize();
    } else {
      (_c = this.win) == null ? void 0 : _c.maximize();
    }
  }
  // 切换主题
  toggleTheme() {
    require$$3.nativeTheme.themeSource = require$$3.nativeTheme.shouldUseDarkColors ? "light" : "dark";
  }
  //处理onHandleOpenDir事件
  async onHandleOpenDir(event, arg) {
    const paths = require$$3.dialog.showOpenDialogSync(this.win, {
      title: "选择文件夹",
      properties: ["openDirectory"],
      modal: true
      // 重要：确保模态对话框
    });
    if (paths && paths.length > 0) {
      const selectedPath = paths[0];
      return selectedPath;
    } else {
      return null;
    }
  }
  //注册onHandleOpenDir事件监听
  registerHandleOpenDir() {
    require$$3.ipcMain.handle("onHandleOpenDir", this.onHandleOpenDir.bind(this));
  }
  /**
   *  处理onHandleStoreData事件
   * @private
   * @param {Electron.IpcMainInvokeEvent} event
   * @param {(object | string)} arg
   * 1.如果是获取数据 则arg为string
   * 2.如果是存储数据 则arg为object
   */
  async onHandleStoreData(event, arg) {
    let data = arg, newdata;
    const storePath = path$1.join(this.app.getPath("documents"), "javPlayer");
    if (typeof data === "string") {
      const storeFilePath = path$1.join(storePath, "storeLog.json");
      const storeFile = fs.readFileSync(storeFilePath, "utf-8");
      const json = JSON.parse(storeFile);
      return json[data];
    } else {
      const storeFilePath = path$1.join(storePath, "storeLog.json");
      const storeFile = fs.readFileSync(storeFilePath, "utf-8");
      if (storeFile) {
        const storeData = JSON.parse(storeFile);
        newdata = Object.assign(storeData, data);
      } else {
        createSystemStore(this.app);
        newdata = data;
      }
      fs.writeFileSync(storeFilePath, JSON.stringify(newdata), "utf-8");
    }
  }
  //注册onHandleStoreData事件监听
  registerHandleStoreData() {
    require$$3.ipcMain.handle("onHandleStoreData", this.onHandleStoreData.bind(this));
  }
  //处理onGetListData事件
  async onGetListData(event, arg) {
    const storePath = path$1.join(this.app.getPath("documents"), "javPlayer");
    const storeFilePath = path$1.join(storePath, "storeLog.json");
    const storeFile = fs.readFileSync(storeFilePath, "utf-8");
    const json = JSON.parse(storeFile);
    const { coverPath, previewPath, videoPath } = json;
    this.pathJson = json;
    const coverList = fs.readdirSync(coverPath).map((file) => {
      if (!file.startsWith(".") && file.indexOf("Thumbs") == 0)
        return null;
      if (file.indexOf(".png") == -1) {
        const name = file.split(".jpg")[0];
        let stat = null, datails = null;
        try {
          stat = fs.statSync(`${videoPath}/${name}.mp4`);
          datails = {
            time: elementPlus.dayjs(stat.birthtimeMs).format("YYYY-MM-DD HH:mm"),
            size: formatFileSize(stat.size)
          };
        } catch (e) {
          stat = fs.statSync(`${coverPath}/${name}.jpg`);
          datails = {
            time: elementPlus.dayjs(stat.birthtimeMs).format("YYYY-MM-DD HH:mm"),
            size: formatFileSize(stat.size)
          };
        }
        return {
          stampTime: stat ? stat.birthtimeMs : null,
          name,
          cover: `${coverPath}/${name}.jpg`,
          preview: `${previewPath}/${name}.mp4`,
          url: `${videoPath}/${name}.mp4`,
          datails
        };
      } else {
        return null;
      }
    }).filter((item) => item !== null);
    return quickSortByTimestamp(coverList.filter((res) => res), "stampTime", false);
  }
  //注册onGetListData事件监听
  registerGetListData() {
    require$$3.ipcMain.handle("onGetListData", this.onGetListData.bind(this));
  }
  // 处理在Electron应用中的视频下载事件的函数。
  onDownloadVideoEvent(event, arg) {
    const that = this;
    return new Promise(async (resolve, reject) => {
      const appPath = path$1.join(__dirname, `../../electron`);
      const docPath = path$1.join(this.app.getPath("documents"), "javPlayer");
      fs.readdirSync(docPath + "/data").forEach((file) => {
        fs.writeFileSync(docPath + "/data/" + file, "[]", "utf-8");
      });
      let { resource, name, url: url2, thread, downPath, previewPath, coverPath, videoPath } = arg;
      const headers = getHeaders(resource);
      name = sanitizeVideoName(name);
      let downLoadPlan = 0, timer = null;
      const designation = getVideoId(name);
      const { videoName, urlPrefix, dataArr } = await processM3u8(url2, headers);
      if (dataArr.length === 0) {
        console.log("无法验证第一个证书");
        return resolve("无法验证第一个证书");
      }
      const countArr = splitArrayIntoEqualChunks(dataArr, thread);
      that.downloadPlanArr = countArr;
      let getCoverIndex = 0;
      for (let i = 0; i < thread; i++) {
        const separateThread = new worker_threads.Worker(appPath + `\\seprate\\seprateThread${i + 1}.js`);
        separateThread.on("message", async () => {
          ++downLoadPlan;
          console.log(`完成进度：`, downLoadPlan, thread, i);
          if (downLoadPlan == thread) {
            if (timer)
              clearTimeout(timer);
            const resultText = await merge(name, downPath, videoPath, thread);
            if (resultText == "合成成功") {
              setTimeout(async () => {
                await getPreviewVideo(designation, name, getCoverIndex, previewPath, coverPath);
                deleteDirFile(downPath);
                resolve("下载完成");
              }, 1e3 * 3);
            }
          }
          if (timer)
            clearTimeout(timer);
          timer = setTimeout(async () => {
            if (downLoadPlan >= thread - 3) {
              await mergeWithTimeout(name, downPath, videoPath, thread, getCoverIndex, previewPath, coverPath, designation);
              if (timer)
                clearTimeout(timer);
              resolve("下载完成");
            }
          }, 3 * 60 * 1e3);
        });
        separateThread.postMessage({
          urlData: countArr[i],
          index: i + 1,
          headers,
          urlPrefix,
          downPath,
          docPath
        });
      }
    });
  }
  // //处理downloadVideoEvent
  // private onDownloadVideoEvent(event: Electron.IpcMainInvokeEvent, arg: any) {
  //   const that = this
  //   return new Promise(async (resolve, reject) => {
  //     const appPath = __dirname + `../../../electron/`
  //     const docPath = path.join(this.app.getPath('documents'), 'javPlayer')
  //     //清除进度条数据
  //     fs.readdirSync(docPath + '/data').forEach(file => {
  //       fs.writeFileSync(docPath + '/data/' + file, '[]', 'utf-8')
  //     })
  //     //获取解构子进程前端传入的参数
  //     let { resource, name, url, thread, downPath, previewPath, coverPath, videoPath } = arg
  //     const headers = getHeaders(resource)  //分辨->获取请求头
  //     name = name.replace('[无码破解]', '')
  //     //截取番号出来
  //     const designation = getIdNumber(name)
  //     //替换名字非法字符 保留日语和中文字符，并删除其他非字母数字字符
  //     name = name.replaceAll(/[^\u4E00-\u9FA5\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9Fa-zA-Z0-9/-]/g, '')
  //       .replaceAll(/[\·\・\●\/]/g, '')
  //       .replaceAll(' ', '')
  //     //下载计算器 用于计算下载进度
  //     let downLoadPlan = 0, timer: any = null
  //     //计算需要下载的文件 url是一个m3u8文件
  //     const videoName = url.split('/')[url.split('/').length - 1].split('.')[0]
  //     const urlPrefix = url.split('/').splice(0, url.split('/').length - 1).join('/') + '/'
  //     const { data: m3u8Data } = await axios(url, {
  //       method: 'get', headers, httpsAgent: new https.Agent({
  //         rejectUnauthorized: false  // 禁用 SSL 证书验证
  //       })
  //     }) as any
  //     const dataArr = m3u8Data.split('\n').filter((res: any) => res.indexOf(videoName) === 0)
  //     const countArr = splitArrayIntoEqualChunks(dataArr, thread)
  //     that.downloadPlanArr = countArr
  //     let getCoverIndex = 0 //第几次尝试下载图片的索引
  //     for (let i = 0; i < thread; i++) {
  //       const seprateThread = new Worker(appPath + `/seprate/seprateThread${i + 1}.js`);
  //       seprateThread.on("message", async () => {
  //         ++downLoadPlan
  //         //如果当前卡住在15个线程以后，等待5分钟后，
  //         //如果还是没有下载完毕，就合并，不管有没有下载完毕
  //         timer && clearTimeout(timer)
  //         timer = setTimeout(async () => {
  //           if (downLoadPlan >= thread - 3) {
  //             const resultext = await merge(name, downPath, videoPath, thread)
  //             timer && clearTimeout(timer)
  //             if (resultext === '合成成功') {
  //               // res.send('合体成功，但是有部分视频没有下载完全')
  //               getPreviewVideo(designation, name, getCoverIndex, previewPath, coverPath)
  //               // getCoverImg(id, name, cover, getCoverIndex)//获取封面图片
  //               return resolve('下载完成，但是有部分视频没有下载完全')
  //             }
  //           }
  //         }, 3 * 60 * 1000)
  //         console.log(downLoadPlan == thread, downLoadPlan, thread, i)
  //         if (downLoadPlan == thread) {
  //           const resultext = await merge(name, downPath, videoPath, thread)
  //           timer && clearTimeout(timer)
  //           if (resultext === '合成成功') {
  //             getPreviewVideo(designation, name, getCoverIndex, previewPath, coverPath)
  //             // getCoverImg(id, name, cover, getCoverIndex)//获取封面图片
  //             // return res.send(resultext)
  //             // 删除文件v
  //             for (let i = 0; i < thread; i++) {
  //               try {
  //                 fs.unlinkSync(downPath + `/${i}.ts`);
  //               } catch (e) {
  //                 // console.log();
  //               }
  //             }
  //             return resolve('下载完成')
  //           }
  //         }
  //       });
  //       seprateThread.postMessage({ urlData: countArr[i], i, headers, urlPrefix, downPath, docPath });
  //     }
  //   })
  // }
  //注册downloadVideoEvent事件监听
  registerDownloadVideoEvent() {
    require$$3.ipcMain.handle("downloadVideoEvent", this.onDownloadVideoEvent.bind(this));
  }
  // 处理逻辑getDownloadSpeed
  /**
  * 获取下载速度
  * @param event 事件对象
  * @param arg 参数对象
  */
  onGetDownloadSpeed(event, arg) {
    const docPath = path$1.join(this.app.getPath("documents"), "javPlayer");
    let speedValue = 0;
    fs.readdirSync(docPath + "/data").forEach((file) => {
      const arr = fs.readFileSync(docPath + "/data/" + file, "utf-8");
      if (arr === "[]")
        return;
      try {
        speedValue += JSON.parse(arr).length;
      } catch (e) {
        console.log("e:", e, arr);
      }
    });
    let sums = 0;
    this.downloadPlanArr.forEach((element) => {
      sums += element.length;
    });
    return [speedValue, sums || 1e3];
  }
  registerGetDownloadSpeed() {
    require$$3.ipcMain.handle("getDownloadSpeed", this.onGetDownloadSpeed.bind(this));
  }
  //处理逻辑getDownloadSpeed
  onGetDownloadListContent(event, arg) {
    let arr = [];
    if (arg) {
      arr = fs.readdirSync(arg).map((file) => {
        return {
          state: fs.statSync(arg + "/" + file),
          name: file
        };
      });
    }
    return arr;
  }
  registerGetDownloadListContent() {
    require$$3.ipcMain.handle("getDownloadListContent", this.onGetDownloadListContent.bind(this));
  }
  //处理逻辑deleteDirFile
  onDeleteDirFile(event, arg) {
    if (arg) {
      fs.readdirSync(arg).forEach(async (file) => {
        await fs.unlinkSync(arg + "/" + file);
      });
    }
  }
  registerDeleteDirFile() {
    require$$3.ipcMain.handle("deleteDirFile", this.onDeleteDirFile.bind(this));
  }
  //处理逻辑deleteDirFile
  onCreateDir(event, arg) {
    console.log(`lzy  arg:`, arg);
    if (arg) {
      fs.mkdirSync(arg);
    }
  }
  registerCreateDir() {
    require$$3.ipcMain.handle("onCreateDir", this.onCreateDir.bind(this));
  }
  onHandleDeleteFile(event, arg) {
    const name = arg;
    const { videoPath, previewPath, coverPath } = this.pathJson;
    fs.access(`${videoPath}/${name}.mp4`, (err) => {
      if (err)
        return console.log("文件不存在");
      fs.unlinkSync(`${videoPath}/${name}.mp4`);
    });
    fs.access(`${previewPath}/${name}.mp4`, (err) => {
      if (err)
        return console.log("文件不存在");
      fs.unlinkSync(`${previewPath}/${name}.mp4`);
    });
    fs.access(`${coverPath}/${name}.jpg`, (err) => {
      if (err)
        return console.log("文件不存在");
      fs.unlinkSync(`${coverPath}/${name}.jpg`);
    });
  }
  registerHandleDeleteFile() {
    require$$3.ipcMain.handle("onHandleDeleteFile", this.onHandleDeleteFile.bind(this));
  }
  //合并视频的逻辑
  async onMergeVideo(event, arg) {
    let getCoverIndex = 0;
    const { previewPath, coverPath } = this.pathJson;
    let { name, downPath, videoPath, thread } = arg;
    name = name.replace("[无码破解]", "");
    const designation = getVideoId(name);
    if (!designation)
      return "番号不正确";
    name = name.replace(/[^\u4E00-\u9FA5\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9Fa-zA-Z0-9/-]/g, "").replaceAll(/[\·\・\●\/]/g, "").replaceAll(" ", "");
    const resultext = await merge(name, downPath, videoPath, thread);
    if (resultext === "合成成功") {
      getPreviewVideo(designation, name, getCoverIndex, previewPath, coverPath);
      return "合成成功";
    }
  }
  registeronMergeVideo() {
    require$$3.ipcMain.handle("onMergeVideo", this.onMergeVideo.bind(this));
  }
  //打开文件夹
  onOpenDir(event, arg) {
    const { shell } = require("electron");
    shell.showItemInFolder(arg);
  }
  registerOpenDir() {
    require$$3.ipcMain.handle("onOpenDir", this.onOpenDir.bind(this));
  }
}
function getHeaders(resource) {
  let headers = {
    "accept": "*/*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "sec-ch-ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site"
  };
  if (resource === "SuperJav") {
    Object.assign(headers, {
      "Referer": "https://emturbovid.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    });
  } else {
    Object.assign(headers, {
      "Origin": "https://missav.com",
      "Referer": "https://missav.com/cn/pppd-985-uncensored-leak"
    });
  }
  return headers;
}
function getVideoId(val) {
  const reg = /[a-zA-Z]{2,6}-\d{3}/;
  const result = val.match(reg);
  return result ? result[0] : null;
}
function splitArrayIntoEqualChunks(array, numberOfChunks) {
  const chunkSize = Math.ceil(array.length / numberOfChunks);
  const result = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}
function getPreviewVideo(id, name, getCoverIndex, previewPath, coverPath) {
  return new Promise((resolve, reject) => {
    const host = "https://eightcha.com/";
    id = id.toLowerCase();
    let getHoverCoverIndex = 0;
    if (getCoverIndex >= 5 || getHoverCoverIndex >= 5)
      return;
    const url2 = host + `${id}/cover.jpg?class=normal`;
    console.log(`lzy  url:`, url2);
    https.get(url2, (response) => {
      const localPath = coverPath + "/" + name + ".jpg";
      const fileStream = fs.createWriteStream(localPath);
      response.pipe(fileStream);
      fileStream.on("finish", () => {
        console.log("图片下载成功");
        fileStream.close();
        function getHoverCoverImg(index) {
          const urlVideo = host + `${id}/preview.mp4`;
          https.get(urlVideo, (response2) => {
            const localPath2 = previewPath + "/" + name + ".mp4";
            const fileStream2 = fs.createWriteStream(localPath2);
            response2.pipe(fileStream2);
            fileStream2.on("finish", () => {
              console.log("预告片下载成功");
              fileStream2.close();
              resolve(true);
            });
          }).on("error", (error) => {
            getHoverCoverImg();
            console.error("(即将重试)下载出错:", error);
          });
        }
        getHoverCoverImg();
      });
    }).on("error", (error) => {
      getPreviewVideo(id, name, ++getCoverIndex, previewPath, coverPath);
      console.error("(即将重试,如果还是不行,就可能是来源有问题https://missav.com/查看图片路径)下载出错:", error);
    });
  });
}
function sanitizeVideoName(name) {
  return name.replace("[无码破解]", "").replaceAll(/[^\u4E00-\u9FA5\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9Fa-zA-Z0-9/-]/g, "").replaceAll(/[\·\・\●\/]/g, "").replaceAll(" ", "");
}
async function processM3u8(url2, headers) {
  let videoName = url2.split("/")[url2.split("/").length - 1].split(".")[0];
  let urlPrefix = url2.split("/").splice(0, url2.split("/").length - 1).join("/") + "/";
  try {
    const { data: m3u8Data } = await axios(url2, {
      method: "get",
      headers,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
        // 禁用SSL证书验证。
      })
    });
    let dataArr = m3u8Data.split("\n").filter((res) => res.indexOf(videoName) === 0);
    if (dataArr.length === 0) {
      dataArr = m3u8Data.split("\n").filter((res) => res.indexOf("https") === 0);
      urlPrefix = "";
    }
    return { videoName, urlPrefix, dataArr };
  } catch (e) {
    console.error("处理M3U8文件出错:", e.message);
    return { videoName, urlPrefix, dataArr: [] };
  }
}
async function mergeWithTimeout(...arg) {
  const [name, downPath, videoPath, thread, getCoverIndex, previewPath, coverPath, designation] = arg;
  const resultText = await merge(name, downPath, videoPath, thread);
  console.log("有部分视频没有下载完全");
  if (resultText == "合成成功") {
    await getPreviewVideo(designation, name, getCoverIndex, previewPath, coverPath);
    return "下载完成，但是有部分视频没有下载完全";
  }
}
function deleteDirFile(path2, retries = 3, delay = 3e3) {
  if (path2) {
    fs.readdirSync(path2).forEach((file) => {
      try {
        if (!fs.existsSync(path2 + "/" + file))
          return;
        fs.unlink(path2 + "/" + file, (err) => {
          if (!err)
            return;
          if (err.code === "EBUSY" && retries > 0) {
            if (file.indexOf(".ts") == -1) {
              console.log(`文件正被占用，${4 - retries}次重试`);
            }
            setTimeout(() => {
              deleteDirFile(path2, retries - 1, delay);
            }, delay);
          }
        });
      } catch (e) {
      }
    });
  }
}
process.env.DIST_ELECTRON = path.join(__dirname, "..");
process.env.DIST = path.join(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL ? path.join(process.env.DIST_ELECTRON, "../public") : process.env.DIST;
global.appRootPath = path.join(__dirname, "../../");
if (node_os.release().startsWith("6.1"))
  require$$3.app.disableHardwareAcceleration();
if (process.platform === "win32")
  require$$3.app.setAppUserModelId(require$$3.app.getName());
if (!require$$3.app.requestSingleInstanceLock()) {
  require$$3.app.quit();
  process.exit(0);
}
require$$3.app.commandLine.appendSwitch("enable-experimental-web-platform-features", "true");
let win = null;
let loadingWindow = null;
const preload = path.join(__dirname, "../preload/index.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = path.join(process.env.DIST, "index.html");
createSystemStore(require$$3.app);
remote.initialize();
async function createWindow() {
  win = new require$$3.BrowserWindow({
    width: 1800,
    height: 1e3,
    minWidth: 1260,
    minHeight: 800,
    title: "avGain",
    autoHideMenuBar: true,
    //隐藏菜单栏
    show: true,
    // 先不显示
    frame: false,
    //隐藏窗口标题栏
    icon: path.join(process.env.PUBLIC, "logo.png"),
    webPreferences: {
      devTools: true,
      preload,
      webSecurity: false,
      //警告：启用nodeIntegration和禁用contextIsolation在生产中不安全
      //考虑使用contextBridge.exxposeInMainWorld
      //在上阅读更多信息https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(url);
    win.webContents.openDevTools();
  } else {
    win.loadFile(indexHtml);
  }
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.webContents.setWindowOpenHandler(({ url: url2 }) => {
    if (url2.startsWith("https:"))
      require$$3.shell.openExternal(url2);
    return { action: "deny" };
  });
  remote.enable(win.webContents);
  return win;
}
require$$3.app.whenReady().then(async () => {
  createLoadingWindow();
  setTimeout(async () => {
    const mainWindow = await createWindow();
    new WindowManager(win, require$$3.app, mainWindow);
    loadingWindow == null ? void 0 : loadingWindow.close();
  }, 2e3);
});
require$$3.app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin")
    require$$3.app.quit();
});
require$$3.app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized())
      win.restore();
    win.focus();
  }
});
require$$3.app.on("activate", () => {
  const allWindows = require$$3.BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});
require$$3.ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new require$$3.BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});
function createLoadingWindow() {
  loadingWindow = new require$$3.BrowserWindow({
    width: 400,
    // 设置窗口宽度为400
    height: 600,
    // 设置窗口高度为600
    frame: false,
    // 窗口无边框
    skipTaskbar: false,
    // 不在任务栏显示窗口
    transparent: true,
    // 窗口透明
    resizable: false,
    // 窗口不可调整大小
    icon: path.join(process.env.PUBLIC, "logo.png"),
    webPreferences: {
      experimentalFeatures: true,
      // 启用实验性特性
      // 根据环境设置preload路径
      preload: process.env.NODE_ENV === "development" ? path.join(require$$3.app.getAppPath(), "preload.js") : path.join(require$$3.app.getAppPath(), "dist/electron/main/preload.js")
      // 生产环境下的preload路径
    }
  });
  loadingWindow.loadFile(path.join(global.appRootPath, "/loader.html"));
  loadingWindow.on("closed", () => {
    loadingWindow = null;
  });
}
//# sourceMappingURL=index.js.map
