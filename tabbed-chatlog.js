(() => { })();

// const CHAT_MESSAGE_TYPES = {
//     OTHER: 0,
//     OOC: 1,
//     IC: 2,
//     EMOTE: 3,
//     WHISPER: 4,
//     ROLL: 5
// };

// Global Settings.
var icChatInOoc = false;
var icBackupWebhook = undefined;
var oocWebhook = undefined;
var initiativeTab = true;
var perSceneIc = false;
var perSceneRolls = false;
var flushVisibleOnly = false;
var customTabs = "";

// Client Settings.
var autoNavigate = false;

// Static Variables.
var currentTab = "ic";
var turndown = undefined;
var chatTabs = undefined;
var sidebarCallback = undefined;
var shouldHide = true;
var splitTabs = [];

// CONST Variables.
const MODULE_NAME = "tabbed-chatlog-fvtt-cn";
const tabTypeMap = new Map([
    [ "0", "rolls" ],
    [ "1", "ooc" ],
    [ "2", "ic" ],
    [ "3", "ic" ],
    [ "4", "ooc" ],
    [ "5", "rolls" ],
    [ "5i", "init" ]
]);
const debouncedReload = foundry.utils.debounce(window.location.reload, 100);

Hooks.on("init", () => {
    game.settings.register(MODULE_NAME, "oocWebhook", {
        name: game.i18n.localize("TC_CN.SETTINGS.OocWebhookName"),
        hint: game.i18n.localize("TC_CN.SETTINGS.OocWebhookHint"),
        scope: "world",
        config: true,
        default: "",
        type: String,
        onChange: value => oocWebhook = value
    });

    game.settings.register(MODULE_NAME, "icBackupWebhook", {
        name: game.i18n.localize("TC_CN.SETTINGS.IcFallbackWebhookName"),
        hint: game.i18n.localize("TC_CN.SETTINGS.IcFallbackWebhookHint"),
        scope: "world",
        config: true,
        default: "",
        type: String,
        onChange: value => icBackupWebhook = value
    });

    game.settings.register(MODULE_NAME, "icChatInOoc", {
        name: game.i18n.localize("TC_CN.SETTINGS.IcChatInOocName"),
        hint: game.i18n.localize("TC_CN.SETTINGS.IcChatInOocHint"),
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
        onChange: value => icChatInOoc = value
    });

    game.settings.register(MODULE_NAME, "hideInStreamView", {
        name: game.i18n.localize("TC_CN.SETTINGS.HideInStreamViewName"),
        hint: game.i18n.localize("TC_CN.SETTINGS.HideInStreamViewHint"),
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register(MODULE_NAME, "initiativeTab", {
        name: game.i18n.localize("TC_CN.SETTINGS.InitiativeTabName"),
        hint: game.i18n.localize("TC_CN.SETTINGS.InitiativeTabHint"),
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
        onChange: debouncedReload
    });

    game.settings.register(MODULE_NAME, "perSceneIc", {
        name: game.i18n.localize("TC_CN.SETTINGS.PerSceneInCharacterName"),
        hint: game.i18n.localize("TC_CN.SETTINGS.PerSceneInCharacterHint"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        onChange: debouncedReload
    });

    game.settings.register(MODULE_NAME, "perSceneRolls", {
        name: game.i18n.localize("TC_CN.SETTINGS.PerSceneRollsName"),
        hint: game.i18n.localize("TC_CN.SETTINGS.PerSceneRollsHint"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        onChange: debouncedReload
    });

    game.settings.register(MODULE_NAME, "flushVisibleOnly", {
        name: game.i18n.localize("TC_CN.SETTINGS.FlushVisibleOnlyName"),
        hint: game.i18n.localize("TC_CN.SETTINGS.FlushVisibleOnlyHint"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        onChange: debouncedReload
    });

    game.settings.register(MODULE_NAME, "autoNavigate", {
        name: game.i18n.localize("TC_CN.SETTINGS.AutoNavigateName"),
        hint: game.i18n.localize("TC_CN.SETTINGS.AutoNavigateHint"),
        scope: "client",
        config: true,
        default: false,
        type: Boolean,
        onChange: value => autoNavigate = value
    });

    game.settings.register(MODULE_NAME, "customTabs", {
        name: game.i18n.localize("TC_CN.SETTINGS.CustomTabsName"),
        hint: game.i18n.localize("TC_CN.SETTINGS.CustomTabsHint"),
        scope: "world",
        config: true,
        default: "",
        type: String,
        onChange: debouncedReload
    });

    shouldHide = game.settings.get(MODULE_NAME, "hideInStreamView") && window.location.href.endsWith("/stream");
    icChatInOoc = game.settings.get(MODULE_NAME, "icChatInOoc");
    icBackupWebhook = game.settings.get(MODULE_NAME, "icBackupWebhook");
    oocWebhook = game.settings.get(MODULE_NAME, "oocWebhook");
    initiativeTab = game.settings.get(MODULE_NAME, "initiativeTab");
    perSceneIc = game.settings.get(MODULE_NAME, "perSceneIc");
    perSceneRolls = game.settings.get(MODULE_NAME, "perSceneRolls");
    flushVisibleOnly = game.settings.get(MODULE_NAME, "flushVisibleOnly");
    autoNavigate = game.settings.get(MODULE_NAME, "autoNavigate");
    customTabs = game.settings.get(MODULE_NAME, "customTabs") ?? "";
    splitTabs = customTabs.split(";").filter(s => s.length > 0);

    // Not config.
    game.settings.register(MODULE_NAME, "df-hotkeys-warned", {
        scope: "client",
        config: false,
        default: false,
        type: Boolean
    });
});

Hooks.on("ready", () => {
    // NarratorTools messages show in IC chat if not modified before.
    if (NarratorTools?._msgtype === 0) {
        NarratorTools._msgtype = 2;
    }

    turndown = new TurndownService();

    if (game.modules.get("lib-df-hotkeys")?.active) {
        // DF Hotkeys registration.
        Hotkeys.registerGroup({
            name: MODULE_NAME,
            label: game.i18n.localize("TC_CN.SETTINGS.SelfLabel"),
            description: game.i18n.localize("TC_CN.SETTINGS.SelfDescription")
        });

        Hotkeys.registerShortcut({
            name: `${MODULE_NAME}.IC`,
            label: game.i18n.localize("TC_CN.TABS.IC"),
            group: MODULE_NAME,
            default: { key: Hotkeys.keys.KeyC, alt: false, ctrl: false, shift: true },
            onKeyDown: () => chatTabs?.activate("ic", { triggerCallback: true })
        });
        Hotkeys.registerShortcut({
            name: `${MODULE_NAME}.OOC`,
            label: game.i18n.localize("TC_CN.TABS.OOC"),
            group: MODULE_NAME,
            default: { key: Hotkeys.keys.KeyO, alt: false, ctrl: false, shift: true },
            onKeyDown: () => chatTabs?.activate("ooc", { triggerCallback: true })
        });
        Hotkeys.registerShortcut({
            name: `${MODULE_NAME}.Rolls`,
            label: game.i18n.localize("TC_CN.TABS.Rolls"),
            group: MODULE_NAME,
            default: { key: Hotkeys.keys.KeyR, alt: false, ctrl: false, shift: true },
            onKeyDown: () => chatTabs?.activate("rolls", { triggerCallback: true })
        });

        if (initiativeTab) {
            Hotkeys.registerShortcut({
                name: `${MODULE_NAME}.Initiative`,
                label: game.i18n.localize("TC_CN.TABS.Initiative"),
                group: MODULE_NAME,
                default: { key: Hotkeys.keys.KeyI, alt: false, ctrl: false, shift: true },
                onKeyDown: () => chatTabs?.activate("init", { triggerCallback: true })
            });
        }
    } else if (game.user.isGM && !game.settings.get(MODULE_NAME, "df-hotkeys-warned")) {
        // Warn only once for a client.
        ui.notifications.warn("Tabbed Chatlog [FVTT-CN] requires the 'Library: DF Hotkeys' module " +
            "to get hotkeys configuration working. Please install and activate this dependency.");
        game.settings.set(MODULE_NAME, "df-hotkeys-warned", true);
    }
});

Hooks.on("renderSidebar", async (sidebar) => {
    if (shouldHide) {
        return;
    }

    const sidebarTabs = sidebar._tabs[0];
    sidebarCallback = sidebarTabs.callback;
    sidebarTabs.callback = (event, tabs, active) => {
        // Manually wrap instead.
        if (sidebarCallback) {
            sidebarCallback(event, tabs, active);
        }
        if (active === "chat" && chatTabs) {
            chatTabs.activate(currentTab);
        }
    };
});

Hooks.on("renderChatLog", (_chatLog, html) => {
    if (shouldHide) {
        return;
    }

    let customHeader = "";
    if (splitTabs.length > 1) {
        for (let splitTab of splitTabs) {
            customHeader += `<a class="item ${splitTab}" data-tab="${splitTab}">${splitTab}</a>`;
        }
        if (customHeader !== "") {
            customHeader = `<nav class = "tabbedchatlog tabs">${customHeader}</nav>`;
            currentTab = splitTabs[0];
        }
    }

    const initTabHtml = initiativeTab
        ? `
        <a class="item init" data-tab="init">
            ${game.i18n.localize("TC_CN.TABS.Initiative")}
        </a>
        `
        : "";
    const notifyClass = `tc-notification-${initiativeTab ? 4 : 3}`;
    const tabHeader = customHeader === "" ? `
    <nav class="tabbedchatlog tabs">
        <a class="item ic" data-tab="ic">
            ${game.i18n.localize("TC_CN.TABS.IC")}
        </a>
        <i id="icNotification" class="${notifyClass} notification-pip fas fa-exclamation-circle" style="display: none;"></i>

        <a class="item rolls" data-tab="rolls">
            ${game.i18n.localize("TC_CN.TABS.Rolls")}
        </a>
        <i id="rollsNotification" class="${notifyClass} notification-pip fas fa-exclamation-circle" style="display: none;"></i>

        <a class="item ooc" data-tab="ooc">
            ${game.i18n.localize("TC_CN.TABS.OOC")}
        </a>
        <i id="oocNotification" class="${notifyClass} notification-pip fas fa-exclamation-circle" style="display: none;"></i>

        ${initTabHtml}
    </nav>
    ` : customHeader;
    html.prepend(tabHeader);

    const tabs = new TabsV2({
        navSelector: ".tabs",
        contentSelector: ".content",
        initial: currentTab,
        callback: function (_event, _html, tab) {
            currentTab = tab;
            refreshLogs();
            $("#chat-log").scrollTop(9999999);
        }
    });
    tabs.bind(html[0]);
    chatTabs = tabs;

    if (flushVisibleOnly) {
        html.find("a.chat-flush").unbind("click").click(function (event) {
            event.preventDefault();
            Dialog.confirm({
                title: game.i18n.localize("CHAT.FlushTitle"),
                content: game.i18n.localize("CHAT.FlushWarning"),
                yes: () => ChatMessage.delete(game.messages
                    .filter(m => isVisible(m))
                    .map(m => m.id)),
                options: {
                    top: window.innerHeight - 150,
                    left: window.innerWidth - 720
                }
            });
        });
        html.find("a.export-log").unbind("click").click(function (event) {
            event.preventDefault();
            const log = game.messages
                .filter(m => isVisible(m))
                .map(m => m.export())
                .join("\n---------------------------\n");
            const date = new Date().toDateString().replace(/\s/g, "-");
            const filename = `fvtt-log-${date}-${currentTab}.txt`;
            saveDataToFile(log, "text/plain", filename);
        });
    }
});

Hooks.on("renderChatMessage", (chatMessage, html, data) => {
    if (shouldHide) {
        return;
    }

    if (splitTabs.length > 1) {
        let splitTab = chatMessage.getFlag(MODULE_NAME, "splitTab") ?? currentTab;
        if (!splitTabs.includes(splitTab)) {
            // Fallback if the tab not exists anymore.
            splitTab = currentTab;
        }
        const splitMsgType = `msgtype-${splitTab}`;
        html.toggleClass(splitMsgType, true);
        if (currentTab === splitTab) {
            html.toggleClass("normalHide", false);
        } else {
            html.toggleClass("normalHide", true);
        }
        return;
    }

    const key = String(data.message.type) + (initiativeTab && data.message.flags.core?.initiativeRoll ? "i" : "");
    const msgtype = `msgtype-${key}`;
    html.toggleClass(msgtype, true);

    const msgTabType = tabTypeMap.get(key);

    if (perSceneIc && msgTabType === "ic" || perSceneRolls && (msgTabType === "rolls" || msgTabType === "init")) {
        if (data.message?.speaker?.scene) {
            html.toggleClass("perscene", true);
            const msgscene = `msgscene-${data.message.speaker.scene}`;
            html.toggleClass(msgscene, true);

            if (game.scenes.viewed.id === data.message.speaker.scene) {
                html.toggleClass("forceHide", false);
            } else {
                html.toggleClass("forceHide", true);
            }
        }
    }

    if (currentTab === msgTabType) {
        html.toggleClass("normalHide", false);
    } else {
        html.toggleClass("normalHide", true);
    }
});

Hooks.on("renderSceneNavigation", () => {
    if (shouldHide || splitTabs.length > 1) {
        return;
    }

    if (perSceneIc && currentTab === "ic" || perSceneRolls && (currentTab === "rolls" || currentTab === "init")) {
        $(`#chat-log .perscene:not(.msgscene-${game.scenes.viewed.id})`).toggleClass("forceHide", true);
        $(`#chat-log .perscene.msgscene-${game.scenes.viewed.id}`).toggleClass("forceHide", false);
    }
});

Hooks.on("createChatMessage", (chatMessage) => {
    if (splitTabs.length > 1 && chatMessage.data.user === game.user.id) {
        chatMessage.setFlag(MODULE_NAME, "splitTab", currentTab);
        return;
    }

    switch (chatMessage.data.type) {
        case 0:
            if (currentTab !== "rolls") {
                if (autoNavigate) {
                    chatTabs?.activate("rolls", { triggerCallback: true });
                } else {
                    $("#rollsNotification").show();
                }
            }
            break;
        case 5:
            if (currentTab !== "rolls" && chatMessage.data.whisper.length === 0 && !(initiativeTab && chatMessage.data.flags.core?.initiativeRoll)) {
                if (autoNavigate) {
                    chatTabs?.activate("rolls", { triggerCallback: true });
                } else {
                    $("#rollsNotification").show();
                }
            }
            break;
        case 1:
        case 4:
            if (currentTab !== "ooc" && (chatMessage.data.whisper.length === 0 || chatMessage.data.whisper.includes(game.user.id))) {
                if (autoNavigate) {
                    chatTabs?.activate("ooc", { triggerCallback: true });
                } else {
                    $("#oocNotification").show();
                }
            }
            break;
        case 2:
        case 3:
            if (currentTab !== "ic") {
                if (autoNavigate) {
                    chatTabs?.activate("ic", { triggerCallback: true });
                } else {
                    $("#icNotification").show();
                }
            }
            break;

        // Do not activate or notify for initiative rolls.
    }
});

Hooks.on("preCreateChatMessage", (chatMessage) => {
    // IC in OOC.
    if (icChatInOoc && currentTab === "ooc" && chatMessage.type === 2) {
        chatMessage.type = 1;
        delete chatMessage.speaker;
    }

    // Send discord webhook messages.
    if ((chatMessage.type ===  2 || chatMessage.type === 3) && !chatMessage.whisper?.length) {
        try {
            const scene = game.scenes.get(chatMessage.speaker.scene);
            const webhook = scene.getFlag(MODULE_NAME, "webhook") || icBackupWebhook;
            if (webhook) {
                const speaker = chatMessage.speaker;
                const actor = loadActorForChatMessage(speaker);
                const img = actor
                    ? `${game.data.addresses.remote}/${generatePortraitImageElement(actor)}`
                    : `${game.data.addresses.remote}/${game.users.get(chatMessage.user).avatar}`;
                const name = actor ? actor.name : speaker.alias;
                sendToDiscord(webhook, {
                    content: turndown.turndown(chatMessage.content),
                    username: name,
                    avatar_url: img
                });
            }
        } catch (err) {
            console.log("TabbedChatlog | Failed to send Discord IC webhook message", err);
        }
    } else if ((chatMessage.type === 1 || chatMessage.type === 4) && !chatMessage.whisper?.length) {
        try {
            if (oocWebhook) {
                const u = game.users.get(chatMessage.user);
                const img = `${game.data.addresses.remote}/${u.avatar}`;
                const name = u.name;
                sendToDiscord(oocWebhook, {
                    content: turndown.turndown(chatMessage.content),
                    username: name,
                    avatar_url: img
                });
            }
        } catch (error) {
            console.log("TabbedChatlog | Failed to send Discord OOC webhook message", err);
        }
    }
});

Hooks.on("renderSceneConfig", (app, html) => {
    if (app.object.compendium) {
        return;
    }

    let loadedWebhookData = undefined;
    if (app.object.data.flags[MODULE_NAME] && app.object.data.flags[MODULE_NAME].webhook) {
        loadedWebhookData = app.object.getFlag(MODULE_NAME, "webhook");
    } else {
        app.object.setFlag(MODULE_NAME, "webhook", "");
        loadedWebhookData = "";
    }

    const fxHtml = `
    <div class="form-group">
        <label>${game.i18n.localize("TC_CN.SETTINGS.IcSceneWebhookName")}</label>
        <input id="scenewebhook" type="text" name="scenewebhook" value="${loadedWebhookData}" placeholder="Webhook"}>
        <p class="notes">${game.i18n.localize("TC_CN.SETTINGS.IcSceneWebhookHint")}</p>
    </div>
    `;
    const fxFind = html.find("select[name ='journal']");
    const formGroup = fxFind.closest(".form-group");
    formGroup.after(fxHtml);
});

Hooks.on("closeSceneConfig", (app, html) => {
    if (app.object.compendium) {
        return;
    }

    app.object.setFlag(MODULE_NAME, "webhook", html.find("input[name ='scenewebhook']")[0].value);
});

function isVisible(message) {
    const key = String(message.data.type) + (initiativeTab && message.data.flags.core?.initiativeRoll ? "i" : "");
    const msgTabType = tabTypeMap.get(key);

    if (message.data.speaker?.scene && (perSceneIc && msgTabType === "ic" || perSceneRolls && (msgTabType === "rolls" || msgTabType === "init"))) {
        if (game.scenes.viewed.id !== message.data.speaker.scene) {
            return false;
        }
    }

    return currentTab === msgTabType;
}

function refreshLogs() {
    if (splitTabs.length > 1) {
        hideMessages(...splitTabs.filter(t => t !== currentTab));
        showMessages(currentTab);
        return;
    }

    switch (currentTab) {
        case "ic":
            hideMessages(0, 1, 4, 5, "5i");
            showMessages(2, 3);
            $("#icNotification").hide();
            if (perSceneIc) {
                $(`#chat-log .perscene:not(.msgscene-${game.scenes.viewed.id})`).toggleClass("forceHide", true);
                $(`#chat-log .perscene.msgscene-${game.scenes.viewed.id}`).toggleClass("forceHide", false);
            }
            break;
        case "rolls":
            hideMessages(1, 2, 3, 4, "5i");
            showMessages(0, 5);
            $("#rollsNotification").hide();
            if (perSceneRolls) {
                $(`#chat-log .perscene:not(.msgscene-${game.scenes.viewed.id})`).toggleClass("forceHide", true);
                $(`#chat-log .perscene.msgscene-${game.scenes.viewed.id}`).toggleClass("forceHide", false);
            }
            break;
        case "ooc":
            hideMessages(0, 2, 3, 5, "5i");
            showMessages(1, 4);
            $("#oocNotification").hide();
            break;
        case "init":
            hideMessages(0, 1, 2, 3, 4, 5);
            showMessages("5i");
            if (perSceneRolls) {
                $(`#chat-log .perscene:not(.msgscene-${game.scenes.viewed.id})`).toggleClass("forceHide", true);
                $(`#chat-log .perscene.msgscene-${game.scenes.viewed.id}`).toggleClass("forceHide", false);
            }
            break;
        default:
            console.log(`TabbedChatlog | Unknown tab ${currentTab}`);
            break;
    }
}

function hideMessages(...hides) {
    for (let hide of hides) {
        $(`#chat-log .msgtype-${hide}`).toggleClass("normalHide", true);
    }
}

function showMessages(...shows) {
    for (let show of shows) {
        $(`#chat-log .msgtype-${show}`).toggleClass("forceHide", false);
        $(`#chat-log .msgtype-${show}`).toggleClass("normalHide", false);
    }
}

function sendToDiscord(webhook, body) {
    $.ajax({
        type: "POST",
        url: webhook,
        data: JSON.stringify(body),
        success: () => {},
        contentType: "application/json",
        dataType: "json"
    });
}

function loadActorForChatMessage(speaker) {
    let actor = undefined;
    if (speaker.token) {
        actor = game.actors.tokens[speaker.token];
    }
    if (!actor) {
        actor = game.actors.get(speaker.actor);
    }
    if (!actor) {
        game.actors.forEach((value) => {
            if (value.name === speaker.alias) {
                actor = value;
            }
        });
    }
    return actor;
}

function generatePortraitImageElement(actor) {
    let img = "";
    img = actor.token ? actor.token.data.img : actor.data.token.img;
    return img;
}

//#region Turndown

var TurndownService = (function () {
    "use strict";

    function extend(destination) {
        for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i];
            for (var key in source) {
                if (source.hasOwnProperty(key)) {
                    destination[key] = source[key];
                }
            }
        }
        return destination;
    }

    function repeat(character, count) {
        return Array(count + 1).join(character);
    }

    var blockElements = [
        "address", "article", "aside", "audio", "blockquote", "body", "canvas", "center", "dd", "dir", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form", "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "html", "isindex", "li", "main", "menu", "nav", "noframes", "noscript", "ol", "output", "p", "pre", "section", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul"
    ];

    function isBlock(node) {
        return blockElements.indexOf(node.nodeName.toLowerCase()) !== -1;
    }

    var voidElements = [
        "area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"
    ];

    function isVoid(node) {
        return voidElements.indexOf(node.nodeName.toLowerCase()) !== -1;
    }

    var voidSelector = voidElements.join();

    function hasVoid(node) {
        return node.querySelector && node.querySelector(voidSelector);
    }

    var rules = {};

    rules.paragraph = {
        filter: "p",

        replacement: function (content) {
            return "\n\n" + content + "\n\n";
        }
    };

    rules.lineBreak = {
        filter: "br",

        replacement: function (_content, _node, options) {
            return options.br + "\n";
        }
    };

    rules.heading = {
        filter: ["h1", "h2", "h3", "h4", "h5", "h6"],

        replacement: function (content, node, options) {
            var hLevel = Number(node.nodeName.charAt(1));

            if (options.headingStyle === "setext" && hLevel < 3) {
                var underline = repeat(hLevel === 1 ? "=" : "-", content.length);
                return (
                    "\n\n" + content + "\n" + underline + "\n\n"
                );
            } else {
                return "\n\n" + repeat("#", hLevel) + " " + content + "\n\n";
            }
        }
    };

    rules.blockquote = {
        filter: "blockquote",

        replacement: function (content) {
            content = content.replace(/^\n+|\n+$/g, "");
            content = content.replace(/^/gm, "> ");
            return "\n\n" + content + "\n\n";
        }
    };

    rules.list = {
        filter: ["ul", "ol"],

        replacement: function (content, node) {
            var parent = node.parentNode;
            if (parent.nodeName === "LI" && parent.lastElementChild === node) {
                return "\n" + content;
            } else {
                return "\n\n" + content + "\n\n";
            }
        }
    };

    rules.listItem = {
        filter: "li",

        replacement: function (content, node, options) {
            content = content
                .replace(/^\n+/, "") // remove leading newlines
                .replace(/\n+$/, "\n") // replace trailing newlines with just a single one
                .replace(/\n/gm, "\n    "); // indent
            var prefix = options.bulletListMarker + "   ";
            var parent = node.parentNode;
            if (parent.nodeName === "OL") {
                var start = parent.getAttribute("start");
                var index = Array.prototype.indexOf.call(parent.children, node);
                prefix = (start ? Number(start) + index : index + 1) + ".  ";
            }
            return (
                prefix + content + (node.nextSibling && !/\n$/.test(content) ? "\n" : "")
            );
        }
    };

    rules.indentedCodeBlock = {
        filter: function (node, options) {
            return (
                options.codeBlockStyle === "indented" &&
                node.nodeName === "PRE" &&
                node.firstChild &&
                node.firstChild.nodeName === "CODE"
            );
        },

        replacement: function (_content, node) {
            return (
                "\n\n    " +
                node.firstChild.textContent.replace(/\n/g, "\n    ") +
                "\n\n"
            );
        }
    };

    rules.fencedCodeBlock = {
        filter: function (node, options) {
            return (
                options.codeBlockStyle === "fenced" &&
                node.nodeName === "PRE" &&
                node.firstChild &&
                node.firstChild.nodeName === "CODE"
            );
        },

        replacement: function (_content, node, options) {
            var className = node.firstChild.className || "";
            var language = (className.match(/language-(\S+)/) || [null, ""])[1];
            var code = node.firstChild.textContent;

            var fenceChar = options.fence.charAt(0);
            var fenceSize = 3;
            var fenceInCodeRegex = new RegExp("^" + fenceChar + "{3,}", "gm");

            var match;
            while ((match = fenceInCodeRegex.exec(code)) !== null) {
                if (match[0].length >= fenceSize) {
                    fenceSize = match[0].length + 1;
                }
            }

            var fence = repeat(fenceChar, fenceSize);

            return (
                "\n\n" + fence + language + "\n" +
                code.replace(/\n$/, "") +
                "\n" + fence + "\n\n"
            );
        }
    };

    rules.horizontalRule = {
        filter: "hr",

        replacement: function (_content, _node, options) {
            return "\n\n" + options.hr + "\n\n";
        }
    };

    rules.inlineLink = {
        filter: function (node, options) {
            return (
                options.linkStyle === "inlined" &&
                node.nodeName === "A" &&
                node.getAttribute("href")
            );
        },

        replacement: function (content, node) {
            var href = node.getAttribute("href");
            var title = node.title ? " \"" + node.title + "\"" : "";
            return "[" + content + "](" + href + title + ")";
        }
    };

    rules.referenceLink = {
        filter: function (node, options) {
            return (
                options.linkStyle === "referenced" &&
                node.nodeName === "A" &&
                node.getAttribute("href")
            );
        },

        replacement: function (content, node, options) {
            var href = node.getAttribute("href");
            var title = node.title ? " \"" + node.title + "\"" : "";
            var replacement;
            var reference;

            switch (options.linkReferenceStyle) {
                case "collapsed":
                    replacement = "[" + content + "][]";
                    reference = "[" + content + "]: " + href + title;
                    break;
                case "shortcut":
                    replacement = "[" + content + "]";
                    reference = "[" + content + "]: " + href + title;
                    break;
                default:
                    var id = this.references.length + 1;
                    replacement = "[" + content + "][" + id + "]";
                    reference = "[" + id + "]: " + href + title;
            }

            this.references.push(reference);
            return replacement;
        },

        references: [],

        append: function () {
            var references = "";
            if (this.references.length) {
                references = "\n\n" + this.references.join("\n") + "\n\n";
                this.references = []; // Reset references
            }
            return references;
        }
    };

    rules.emphasis = {
        filter: ["em", "i"],

        replacement: function (content, _node, options) {
            if (!content.trim()) {
                return "";
            }
            return options.emDelimiter + content + options.emDelimiter;
        }
    };

    rules.strong = {
        filter: ["strong", "b"],

        replacement: function (content, _node, options) {
            if (!content.trim()) {
                return "";
            }
            return options.strongDelimiter + content + options.strongDelimiter;
        }
    };

    rules.code = {
        filter: function (node) {
            var hasSiblings = node.previousSibling || node.nextSibling;
            var isCodeBlock = node.parentNode.nodeName === "PRE" && !hasSiblings;

            return node.nodeName === "CODE" && !isCodeBlock;
        },

        replacement: function (content) {
            if (!content.trim()) {
                return "";
            }

            var delimiter = "`";
            var leadingSpace = "";
            var trailingSpace = "";
            var matches = content.match(/`+/gm);
            if (matches) {
                if (/^`/.test(content)) {
                    leadingSpace = " ";
                }
                if (/`$/.test(content)) {
                    trailingSpace = " ";
                }
                while (matches.indexOf(delimiter) !== -1) {
                    delimiter = delimiter + "`";
                }
            }

            return delimiter + leadingSpace + content + trailingSpace + delimiter;
        }
    };

    rules.image = {
        filter: "img",

        replacement: function (_content, node) {
            var alt = node.alt || "";
            var src = node.getAttribute("src") || "";
            var title = node.title || "";
            var titlePart = title ? " \"" + title + "\"" : "";
            return src ? "![" + alt + "]" + "(" + src + titlePart + ")" : "";
        }
    };

    /**
     * Manages a collection of rules used to convert HTML to Markdown
     */

    function Rules(options) {
        this.options = options;
        this._keep = [];
        this._remove = [];

        this.blankRule = {
            replacement: options.blankReplacement
        };

        this.keepReplacement = options.keepReplacement;

        this.defaultRule = {
            replacement: options.defaultReplacement
        };

        this.array = [];
        for (var key in options.rules) {
            this.array.push(options.rules[key]);
        }
    }

    Rules.prototype = {
        add: function (_key, rule) {
            this.array.unshift(rule);
        },

        keep: function (filter) {
            this._keep.unshift({
                filter: filter,
                replacement: this.keepReplacement
            });
        },

        remove: function (filter) {
            this._remove.unshift({
                filter: filter,
                replacement: function () {
                    return "";
                }
            });
        },

        forNode: function (node) {
            if (node.isBlank) {
                return this.blankRule;
            }
            var rule;

            if ((rule = findRule(this.array, node, this.options)) !== null) {
                return rule;
            }
            if ((rule = findRule(this._keep, node, this.options)) !== null) {
                return rule;
            }
            if ((rule = findRule(this._remove, node, this.options)) !== null) {
                return rule;
            }

            return this.defaultRule;
        },

        forEach: function (fn) {
            for (var i = 0; i < this.array.length; i++) {
                fn(this.array[i], i);
            }
        }
    };

    function findRule(rules, node, options) {
        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            if (filterValue(rule, node, options)) {
                return rule;
            }
        }
        return void 0;
    }

    function filterValue(rule, node, options) {
        var filter = rule.filter;
        if (typeof filter === "string") {
            if (filter === node.nodeName.toLowerCase()) {
                return true;
            }
        } else if (Array.isArray(filter)) {
            if (filter.indexOf(node.nodeName.toLowerCase()) > -1) {
                return true;
            }
        } else if (typeof filter === "function") {
            if (filter.call(rule, node, options)) {
                return true;
            }
        } else {
            throw new TypeError("`filter` needs to be a string, array, or function");
        }
    }

    /**
     * The collapseWhitespace function is adapted from collapse-whitespace
     * by Luc Thevenard.
     *
     * The MIT License (MIT)
     *
     * Copyright (c) 2014 Luc Thevenard <lucthevenard@gmail.com>
     *
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in
     * all copies or substantial portions of the Software.
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
     * THE SOFTWARE.
     */

    /**
     * collapseWhitespace(options) removes extraneous whitespace from an the given element.
     *
     * @param {Object} options
     */
    function collapseWhitespace(options) {
        var element = options.element;
        var isBlock = options.isBlock;
        var isVoid = options.isVoid;
        var isPre = options.isPre || function (node) {
            return node.nodeName === "PRE";
        };

        if (!element.firstChild || isPre(element)) {
            return;
        }

        var prevText = null;
        var prevVoid = false;

        var prev = null;
        var node = next(prev, element, isPre);

        while (node !== element) {
            if (node.nodeType === 3 || node.nodeType === 4) { // Node.TEXT_NODE or Node.CDATA_SECTION_NODE
                var text = node.data.replace(/[ \r\n\t]+/g, " ");

                if ((!prevText || / $/.test(prevText.data)) &&
                    !prevVoid && text[0] === " ") {
                    text = text.substr(1);
                }

                // `text` might be empty at this point.
                if (!text) {
                    node = remove(node);
                    continue;
                }

                node.data = text;

                prevText = node;
            } else if (node.nodeType === 1) { // Node.ELEMENT_NODE
                if (isBlock(node) || node.nodeName === "BR") {
                    if (prevText) {
                        prevText.data = prevText.data.replace(/ $/, "");
                    }

                    prevText = null;
                    prevVoid = false;
                } else if (isVoid(node)) {
                    // Avoid trimming space around non-block, non-BR void elements.
                    prevText = null;
                    prevVoid = true;
                }
            } else {
                node = remove(node);
                continue;
            }

            var nextNode = next(prev, node, isPre);
            prev = node;
            node = nextNode;
        }

        if (prevText) {
            prevText.data = prevText.data.replace(/ $/, "");
            if (!prevText.data) {
                remove(prevText);
            }
        }
    }

    /**
     * remove(node) removes the given node from the DOM and returns the
     * next node in the sequence.
     *
     * @param {Node} node
     * @return {Node} node
     */
    function remove(node) {
        var next = node.nextSibling || node.parentNode;

        node.parentNode.removeChild(node);

        return next;
    }

    /**
     * next(prev, current, isPre) returns the next node in the sequence, given the
     * current and previous nodes.
     *
     * @param {Node} prev
     * @param {Node} current
     * @param {Function} isPre
     * @return {Node}
     */
    function next(prev, current, isPre) {
        if (prev && prev.parentNode === current || isPre(current)) {
            return current.nextSibling || current.parentNode;
        }

        return current.firstChild || current.nextSibling || current.parentNode;
    }

    /*
     * Set up window for Node.js
     */

    var root = typeof window !== "undefined" ? window : {};

    /*
     * Parsing HTML strings
     */

    function canParseHTMLNatively() {
        var Parser = root.DOMParser;
        var canParse = false;

        // Adapted from https://gist.github.com/1129031
        // Firefox/Opera/IE throw errors on unsupported types
        try {
            // WebKit returns null on unsupported types
            if (new Parser().parseFromString("", "text/html")) {
                canParse = true;
            }
        } catch (e) {
            // continue regardless of error
        }

        return canParse;
    }

    function createHTMLParser() {
        var Parser = function () { };

        {
            if (shouldUseActiveX()) {
                Parser.prototype.parseFromString = function (string) {
                    var doc = new window.ActiveXObject("htmlfile");
                    doc.designMode = "on"; // disable on-page scripts
                    doc.open();
                    doc.write(string);
                    doc.close();
                    return doc;
                };
            } else {
                Parser.prototype.parseFromString = function (string) {
                    var doc = document.implementation.createHTMLDocument("");
                    doc.open();
                    doc.write(string);
                    doc.close();
                    return doc;
                };
            }
        }
        return Parser;
    }

    function shouldUseActiveX() {
        var useActiveX = false;
        try {
            document.implementation.createHTMLDocument("").open();
        } catch (e) {
            if (window.ActiveXObject) {
                useActiveX = true;
            }
        }
        return useActiveX;
    }

    var HTMLParser = canParseHTMLNatively() ? root.DOMParser : createHTMLParser();

    function RootNode(input) {
        var root;
        if (typeof input === "string") {
            var doc = htmlParser().parseFromString(
                // DOM parsers arrange elements in the <head> and <body>.
                // Wrapping in a custom element ensures elements are reliably arranged in
                // a single element.
                "<x-turndown id=\"turndown-root\">" + input + "</x-turndown>", "text/html"
            );
            root = doc.getElementById("turndown-root");
        } else {
            root = input.cloneNode(true);
        }
        collapseWhitespace({
            element: root,
            isBlock: isBlock,
            isVoid: isVoid
        });

        return root;
    }

    var _htmlParser;

    function htmlParser() {
        _htmlParser = _htmlParser || new HTMLParser();
        return _htmlParser;
    }

    function Node(node) {
        node.isBlock = isBlock(node);
        node.isCode = node.nodeName.toLowerCase() === "code" || node.parentNode.isCode;
        node.isBlank = isBlank(node);
        node.flankingWhitespace = flankingWhitespace(node);
        return node;
    }

    function isBlank(node) {
        return (
            ["A", "TH", "TD", "IFRAME", "SCRIPT", "AUDIO", "VIDEO"].indexOf(node.nodeName) === -1 &&
            /^\s*$/i.test(node.textContent) &&
            !isVoid(node) &&
            !hasVoid(node)
        );
    }

    function flankingWhitespace(node) {
        var leading = "";
        var trailing = "";

        if (!node.isBlock) {
            var hasLeading = /^\s/.test(node.textContent);
            var hasTrailing = /\s$/.test(node.textContent);
            var blankWithSpaces = node.isBlank && hasLeading && hasTrailing;

            if (hasLeading && !isFlankedByWhitespace("left", node)) {
                leading = " ";
            }

            if (!blankWithSpaces && hasTrailing && !isFlankedByWhitespace("right", node)) {
                trailing = " ";
            }
        }

        return {
            leading: leading,
            trailing: trailing
        };
    }

    function isFlankedByWhitespace(side, node) {
        var sibling;
        var regExp;
        var isFlanked;

        if (side === "left") {
            sibling = node.previousSibling;
            regExp = / $/;
        } else {
            sibling = node.nextSibling;
            regExp = /^ /;
        }

        if (sibling) {
            if (sibling.nodeType === 3) {
                isFlanked = regExp.test(sibling.nodeValue);
            } else if (sibling.nodeType === 1 && !isBlock(sibling)) {
                isFlanked = regExp.test(sibling.textContent);
            }
        }
        return isFlanked;
    }

    var reduce = Array.prototype.reduce;
    var leadingNewLinesRegExp = /^\n*/;
    var trailingNewLinesRegExp = /\n*$/;
    var escapes = [
        [/\\/g, "\\\\"],
        [/\*/g, "\\*"],
        [/^-/g, "\\-"],
        [/^\+ /g, "\\+ "],
        [/^(=+)/g, "\\$1"],
        [/^(#{1,6}) /g, "\\$1 "],
        [/`/g, "\\`"],
        [/^~~~/g, "\\~~~"],
        [/\[/g, "\\["],
        [/\]/g, "\\]"],
        [/^>/g, "\\>"],
        [/_/g, "\\_"],
        [/^(\d+)\. /g, "$1\\. "]
    ];

    function TurndownService(options) {
        if (!(this instanceof TurndownService)) {
            return new TurndownService(options);
        }

        var defaults = {
            rules: rules,
            headingStyle: "setext",
            hr: "* * *",
            bulletListMarker: "*",
            codeBlockStyle: "indented",
            fence: "```",
            emDelimiter: "_",
            strongDelimiter: "**",
            linkStyle: "inlined",
            linkReferenceStyle: "full",
            br: "  ",
            blankReplacement: function (_content, node) {
                return node.isBlock ? "\n\n" : "";
            },
            keepReplacement: function (_content, node) {
                return node.isBlock ? "\n\n" + node.outerHTML + "\n\n" : node.outerHTML;
            },
            defaultReplacement: function (content, node) {
                return node.isBlock ? "\n\n" + content + "\n\n" : content;
            }
        };
        this.options = extend({}, defaults, options);
        this.rules = new Rules(this.options);
    }

    TurndownService.prototype = {
        /**
         * The entry point for converting a string or DOM node to Markdown
         * @public
         * @param {String|HTMLElement} input The string or DOM node to convert
         * @returns A Markdown representation of the input
         * @type String
         */

        turndown: function (input) {
            if (!canConvert(input)) {
                throw new TypeError(
                    input + " is not a string, or an element/document/fragment node."
                );
            }

            if (input === "") {
                return "";
            }

            var output = process.call(this, new RootNode(input));
            return postProcess.call(this, output);
        },

        /**
         * Add one or more plugins
         * @public
         * @param {Function|Array} plugin The plugin or array of plugins to add
         * @returns The Turndown instance for chaining
         * @type Object
         */

        use: function (plugin) {
            if (Array.isArray(plugin)) {
                for (var i = 0; i < plugin.length; i++) {
                    this.use(plugin[i]);
                }
            } else if (typeof plugin === "function") {
                plugin(this);
            } else {
                throw new TypeError("plugin must be a Function or an Array of Functions");
            }
            return this;
        },

        /**
         * Adds a rule
         * @public
         * @param {String} key The unique key of the rule
         * @param {Object} rule The rule
         * @returns The Turndown instance for chaining
         * @type Object
         */

        addRule: function (key, rule) {
            this.rules.add(key, rule);
            return this;
        },

        /**
         * Keep a node (as HTML) that matches the filter
         * @public
         * @param {String|Array|Function} filter The unique key of the rule
         * @returns The Turndown instance for chaining
         * @type Object
         */

        keep: function (filter) {
            this.rules.keep(filter);
            return this;
        },

        /**
         * Remove a node that matches the filter
         * @public
         * @param {String|Array|Function} filter The unique key of the rule
         * @returns The Turndown instance for chaining
         * @type Object
         */

        remove: function (filter) {
            this.rules.remove(filter);
            return this;
        },

        /**
         * Escapes Markdown syntax
         * @public
         * @param {String} string The string to escape
         * @returns A string with Markdown syntax escaped
         * @type String
         */

        escape: function (string) {
            return escapes.reduce(function (accumulator, escape) {
                return accumulator.replace(escape[0], escape[1]);
            }, string);
        }
    };

    /**
     * Reduces a DOM node down to its Markdown string equivalent
     * @private
     * @param {HTMLElement} parentNode The node to convert
     * @returns A Markdown representation of the node
     * @type String
     */

    function process(parentNode) {
        var self = this;
        return reduce.call(parentNode.childNodes, function (output, node) {
            node = new Node(node);

            var replacement = "";
            if (node.nodeType === 3) {
                replacement = node.isCode ? node.nodeValue : self.escape(node.nodeValue);
            } else if (node.nodeType === 1) {
                replacement = replacementForNode.call(self, node);
            }

            return join(output, replacement);
        }, "");
    }

    /**
     * Appends strings as each rule requires and trims the output
     * @private
     * @param {String} output The conversion output
     * @returns A trimmed version of the ouput
     * @type String
     */

    function postProcess(output) {
        var self = this;
        this.rules.forEach(function (rule) {
            if (typeof rule.append === "function") {
                output = join(output, rule.append(self.options));
            }
        });

        return output.replace(/^[\t\r\n]+/, "").replace(/[\t\r\n\s]+$/, "");
    }

    /**
     * Converts an element node to its Markdown equivalent
     * @private
     * @param {HTMLElement} node The node to convert
     * @returns A Markdown representation of the node
     * @type String
     */

    function replacementForNode(node) {
        var rule = this.rules.forNode(node);
        var content = process.call(this, node);
        var whitespace = node.flankingWhitespace;
        if (whitespace.leading || whitespace.trailing) {
            content = content.trim();
        }
        return (
            whitespace.leading +
            rule.replacement(content, node, this.options) +
            whitespace.trailing
        );
    }

    /**
     * Determines the new lines between the current output and the replacement
     * @private
     * @param {String} output The current conversion output
     * @param {String} replacement The string to append to the output
     * @returns The whitespace to separate the current output and the replacement
     * @type String
     */

    function separatingNewlines(output, replacement) {
        var newlines = [
            output.match(trailingNewLinesRegExp)[0], replacement.match(leadingNewLinesRegExp)[0]
        ].sort();
        var maxNewlines = newlines[newlines.length - 1];
        return maxNewlines.length < 2 ? maxNewlines : "\n\n";
    }

    function join(string1, string2) {
        var separator = separatingNewlines(string1, string2);

        // Remove trailing/leading newlines and replace with separator
        string1 = string1.replace(trailingNewLinesRegExp, "");
        string2 = string2.replace(leadingNewLinesRegExp, "");

        return string1 + separator + string2;
    }

    /**
     * Determines whether an input can be converted
     * @private
     * @param {String|HTMLElement} input Describe this parameter
     * @returns Describe what it returns
     * @type String|Object|Array|Boolean|Number
     */

    function canConvert(input) {
        return (
            input != null && (
                typeof input === "string" ||
                input.nodeType && (
                    input.nodeType === 1 || input.nodeType === 9 || input.nodeType === 11
                )
            )
        );
    }

    return TurndownService;

}());

//#endregion
