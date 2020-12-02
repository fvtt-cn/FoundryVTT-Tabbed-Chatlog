![](https://img.shields.io/badge/Foundry-v0.6.2-informational)
[![](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-%243-orange)](https://www.buymeacoffee.com/T2tZvWJ)


# Tabbed Chatlog [FVTT-CN Branch]

Splits the Chatlog into In Character (per scene), Rolls (per scene), Out of Character (global), and Initiative (per scene).

分割聊天面板为四块：角色、掷骰、超游、先攻，避免刷屏影响聊天信息阅读。支持在不同情况下自动切换到对应的面板，使用后令 FVTT 聊天面板简洁很多。

Thanks to the original author cswendrowski.

![](./tabbed-chatlog.gif)



## Changelog

### v1.1.0

Added notifications for new messages in inactive tabs.
Fixed new messages showing up incorrectly.

### v1.2.0

In Character messages without a scene attached will now show on the IC tab when toggled

### v1.3.4

You can now automatically send In Character and Out of Character chat messages to Discord. There is one global module setting for OOC messages. IC messages can be per-scene via a Scene setting - if this is not found, it will fallback to a global IC webhook if configured in the Module Settings.

Tabbed Chat now also properly integrates with https://github.com/sPOiDar/fvtt-module-hide-gm-rolls
