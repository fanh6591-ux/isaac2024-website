# Isaac2024 · 企业 AI 与 3D 交互官网

何凡 Isaac 的个人官网公开前端。围绕 **数据 AI 化、业务 AI 化、人才 AI 化**，连接项目案例、企业 AI 方法和交互式展示。

Public frontend snapshot of Isaac’s enterprise AI portfolio: 3D storytelling, business scenarios and interactive explanations.

**[访问官网](https://isaac2024.online/) · [企业 AI 项目指南](https://github.com/fanh6591-ux/enterprise-ai-playbook) · [独立投入与价值交互演示](https://github.com/fanh6591-ux/enterprise-ai-value-explorer)**

## 可以看到什么

- 首页的叙事与 3D 场景接入代码。
- 产品服务、企业落地常见问题、AI 战略和关于页面。
- 医疗科研、餐饮经营等公开案例，以及各案例原有的角色和状态说明。
- 导航、移动适配、资源加载与图表等公开前端脚本。

## 本地预览

需要 Python 3.9 或以上，无需安装 Python 依赖。

```bash
git clone https://github.com/fanh6591-ux/isaac2024-website.git
cd isaac2024-website
python3 tools/serve.py
```

浏览器打开 **http://127.0.0.1:8967**。预览只监听本机。

本仓库在 2026-10-03 从当前官网的公开 HTTP 页面和资源整理。页面及非打包 JS/CSS 保存在 `site/`；大型模型、视频、字体和第三方打包资源继续从官网加载，因此**预览需要联网**。官网资源改变后，外部资源的显示可能变化。

账户、后台 API、反馈提交和管理功能不在此预览范围内；它不是完整后端或生产恢复包。未捕获页面不会转发到生产后台。暂不直接部署到 GitHub Pages。

## 文件与来源

| 路径 | 内容 |
|---|---|
| `site/` | 保持官网路径结构的公开 HTML、CSS、JS |
| `source-manifest.json` | 每份文件的来源、日期、大小和 SHA-256 |
| `tools/serve.py` | 本地静态页面与公开素材的只读预览 |
| `tools/verify.py` | 核对捕获文件是否完整 |
| `RIGHTS.md` | 代码、文字、模型和第三方素材的使用范围 |

运行 `python3 tools/verify.py` 可核对已捕获文件。清单同时记录仍由原站加载的打包资源、未纳入的文件和原站缺失资源；这些不被视为已经归档。

## 为什么公开

我希望把企业 AI 的真实问题、实现过程和可复用方法放在一起。这个仓库展示网站怎样承载这些内容；项目指南提供需求、验收与共创模板；独立交互演示让读者直接试用一个具体成果。

欢迎通过 Issue 反馈公开页面的显示、导航与阅读问题。合作交流可从[官网联系入口](https://isaac2024.online/#contact)开始。
