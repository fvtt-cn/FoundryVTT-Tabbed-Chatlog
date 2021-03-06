# Changelog | 更新日志

## v2.8.0
- Manifest updated, provide the compatibility support of `0.8.x`
- 更新了清单文件，提供 `0.8.x` 版本的兼容性支持
### Fix | 修复
- Call Debounce for the refresh after settings saved to prevent from settings save failure
- 使用内置的 Debounce 进行设置保存后的刷新，避免设置保存失败

## v2.7.4
### Feature | 功能
- Experimental Feature: Custom Tabs, message only shows on the tab on which the author is when sent.
- 实验性功能：自定义聊天栏，消息只会显示在消息发送者发送消息时所在的聊天栏里。

## v2.7.3
### Fix | 修复
- Fix Discord Webhooks integration per scene.
- 修复了 Discord Webhooks 的场景整合。
### Feature | 功能
- DF-Hotkeys integration, now you can configure hotkeys to quickly navigate to chatlog tabs via DF-Hotkeys settings.
- DF-Hotkeys 整合，现在可以通过 DF-Hotkeys 的配置界面设定快捷键，快速在不同的聊天栏之间切换。

## v2.7.2
### Feature | 功能
- Override Flush/Export buttons if 'Flush/Export Visible Messages only' enabled, so that those buttons will only flush/export messages shown in the current tab instead of all.
- 如果启用了 “仅导出/清空可见的消息” 选项，则会覆写清空消息/导出消息的按钮，使其仅清空/导出当前聊天栏中显示的消息而非全部消息。

## v2.7.1
### Feature | 功能
- Auto navigate into the tab which gets a new message if enabled (won't navigate into Initiative tab) and it's a client setting.
- 自动切换到新消息所在的聊天栏，需要客户端设置开启（每个用户可以自己选择是否开启该功能）。

## v2.7.0
Codes refactored.

完成了代码重构，以便后续进行维护。
### Feature | 功能
- Provide configuration of IC/Rolls messages shown per scene/global.
- 提供了将角色/掷骰消息按场景分拆与否的配置项。

- Provide switch for standalone Initiative tab.
- 提供了独立先攻掷骰栏的切换设置。
