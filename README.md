# Tabloom

一个以 Chrome 新标签页形式运行的多层级书签管理工具。书签内容直接来自 Chrome 原生书签树，界面颜色和折叠状态保存在 `chrome.storage.local`。

## 本地开发

```bash
npm install
npm run dev
```

普通网页开发模式会加载一份可编辑的模拟书签和标签页数据，不会修改浏览器书签。

## 加载扩展

```bash
npm run build
```

1. 打开 `chrome://extensions/`。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目下生成的 `dist` 目录。
5. 打开一个新标签页。

## 已支持

- 多层级书签递归展示、展开和收起
- Chrome 原生书签新增、编辑、删除与移动
- 同级及跨文件夹拖拽整理
- 书签和文件夹搜索
- 文件夹颜色和界面状态本地持久化
- 桌面与移动端响应式布局

## 验证

```bash
npm test
npm run build
```
