class MicroLocalStore {
  constructor(id, allowedUrls = [window.location.href]) {
    if (!id) {
      throw new Error(
        "ID is required when creating a MicroLocalStore instance"
      );
    }

    this.id = id;
    this.key = `${this.id}-micro-local-store`;
    this.allowedUrls = allowedUrls.map((url) => new URL(url));
    this.allowedOrigins = this.allowedUrls.map((url) => url.origin);
    this.stateListeners = [];
    this.iframes = [];
    this.state = this.loadState() || {};

    if (window === window.top) {
      this.iframes = this.allowedUrls
        .filter((url) => url.origin !== window.location.origin)
        .map((url) => {
          let iframe = document.createElement("iframe");
          iframe.src = url.href;
          iframe.style.display = "none";
          iframe.origin = url.origin;
          document.body.appendChild(iframe);
          return iframe;
        });
      window.addEventListener("message", (event) => this.receiveMessage(event));
      window.addEventListener("focus", () => this.loadState(), false);
    } else {
      window.addEventListener("storage", () => this.loadState(), false);
    }
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.saveState();
    this.notifyListeners();
  }

  getState() {
    return this.state;
  }

  onChange(listener) {
    this.stateListeners.push(listener);
  }

  offChange(listener) {
    this.stateListeners = this.stateListeners.filter((cb) => cb !== listener);
  }

  notifyListeners() {
    for (const listener of this.stateListeners) {
      listener(this.state);
    }
  }

  sendStateToParentWindow() {
    if (window.top !== window) {
      window.top.postMessage(
        {
          type: "micro-local-store",
          id: this.id,
          state: this.state,
        },
        "*"
      );
    }
  }

  receiveMessage(event) {
    if (
      event.data.type === "micro-local-store" &&
      event.data.id === this.id &&
      window.top === window
    ) {
      const { state } = event.data;
      this.setState(state);
    }
  }

  saveState() {
    localStorage.setItem(this.key, JSON.stringify(this.state));
  }

  loadState() {
    const storedState = JSON.parse(localStorage.getItem(this.key));
    this.setState(storedState);
    this.sendStateToParentWindow();
    return storedState;
  }
}

(function (global, factory) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define(factory);
  } else {
    global.MicroLocalStore = factory();
  }
})(this, function () {
  return MicroLocalStore;
});
