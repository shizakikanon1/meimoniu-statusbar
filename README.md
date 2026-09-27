# meimoniu-statusbar

从用户提供的「魅魔牛」角色卡中逐字提取的悬浮状态栏助手脚本。
保留原版双角色对照、变量读取、拖动位置记忆、切卡拆除和音声播放器；没有重新设计界面。

## 文件

- `src/statusbar/index.js`：从原卡恢复的完整脚本（含原版内嵌样式及素材）。
- `dist/statusbar/index.js`：与源码完全相同、可直接导入的发布文件，无需打包。
- `asset-manifest.json`：来源与 SHA-256 校验值。

## SillyTavern 接入

启用酒馆助手与原卡 MVU 依赖，将原卡「悬浮状态栏」助手脚本内容替换为：

```js
import 'https://testingcf.jsdelivr.net/gh/shizakikanon1/meimoniu-statusbar@<COMMIT_SHA>/dist/statusbar/index.js';
```

用实际发布提交 SHA 替换 `<COMMIT_SHA>`；推荐固定完整 SHA，避免分支 CDN 缓存混用。
仍通过助手脚本注入顶层页面，不应再给每条消息新增状态栏正则，否则可能重复挂载。

## 维护与边界

修改 `src/statusbar/index.js` 后同步到 `dist/statusbar/index.js`，提交并更新卡内加载地址。
执行 `node --check dist/statusbar/index.js` 可校验 JavaScript 语法。
仓库不包含角色人设、世界书、开场白或完整角色卡。
图片与音声使用原卡原有图床，本仓库不迁移这些媒体。
原始 `.preview/tpl` 和构建前素材不在所提供 JSON 中，未声称恢复这些未提供文件。
尚未在真实 SillyTavern 会话中执行集成试玩。
