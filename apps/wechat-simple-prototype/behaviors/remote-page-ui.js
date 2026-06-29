const remoteUi = require("../utils/remote-ui-config.js");

module.exports = Behavior({
  pageLifetimes: {
    show() {
      try {
        const stack = getCurrentPages();
        const cur = stack[stack.length - 1];
        if (!cur || !cur.route) return;
        remoteUi.applyNavForPage(cur.route);
      } catch (e) {
        console.warn("[remote-page-ui]", e);
      }
    },
  },
});
