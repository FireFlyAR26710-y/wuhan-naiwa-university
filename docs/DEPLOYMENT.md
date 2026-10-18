# 使用 Netlify 托管

本项目的静态网页和计数函数部署在同一个 Netlify 项目下。GitHub 用于保存与展示源码，GitHub Pages 不运行这里的 Netlify 函数。

## 新建项目

1. 将仓库导入 Netlify，选择 Node.js 22.12 或更高版本。
2. 使用仓库中的 `netlify.toml`：构建命令 `npm run build`，发布目录 `dist`，函数目录 `netlify/functions`。
3. 新站先用 `site.config.example.json` 替换 `site.config.json`，保持 `historicalBase: 0`，并修改统计日期。如有可说明来源的历史数据，可修改配置或在 Netlify 为 Functions 的 production 环境设置 `NAIWA_HISTORICAL_BASE`。
4. 发布后访问 `/api/escort-count`，应返回 JSON 人数；访问 `/?stay=1` 预览页面。

Netlify Blobs 在函数运行时使用平台提供的身份，不需要把访问令牌或签名密钥写进代码。

## 命令行部署

安装官方 Netlify CLI 并登录自己的账号。在项目根目录运行：

```sh
npm ci
npm run build
npm test
netlify deploy --site YOUR_NETLIFY_SITE_ID --dir dist --functions netlify/functions --no-build
```

先检查返回的草稿链接；确认后添加 `--prod` 发布正式版本。不要把别人站点的项目 ID 当作自己的部署目标。

只向 Netlify 拖入 `dist` 目录无法发布计数函数。

## 保留现有站点数据

- 更新现有站点时，继续使用同一个 Netlify 项目和同一个 `naiwa-escort-v1` 存储名。
- 正式站总数为历史基数加在线去重记录，基数不能重复叠加。
- 当前武汉奶蛙大学演示站保留 `site.config.json` 中的 `historicalBase: 500`；新站应使用示例中的 0。
- 不删除或导出 Blobs 中的访客标识记录、`private/signing-key`。
- 草稿部署使用 `naiwa-escort-v1-preview-部署ID`，测试记录不并入正式站。
- 重新建一个 Netlify 项目不会自动带走原项目的数据。

如需让 GitHub 提交自动触发部署，应在现有 Netlify 项目的仓库设置中绑定本仓库，保持原项目、域名、环境变量与存储不变。单纯上传到 GitHub不会自动改变网站的发布方式。

## 本地运行函数

`npm run dev` 只提供静态预览，不连接正式计数。安装官方 CLI 后可使用 `netlify dev` 在 Netlify 开发环境调试；开发环境使用单独的预览存储。请勿在本地脚本中写入或打印平台凭据。

参考：[Netlify 环境变量](https://docs.netlify.com/build/configure-builds/environment-variables/)、[Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)。
