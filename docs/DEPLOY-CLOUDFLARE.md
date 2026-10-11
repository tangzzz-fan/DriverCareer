# Cloudflare Pages 部署操作手册

跟着做即可。全程免费，**不需要服务器、不需要域名、不需要买 HTTPS 证书**。

>

**这份文档只讲操作。** 想了解「为什么这样部署」「多人怎么分工协作」，看 [Cloudflare部署与协作指南.html](Cloudflare部署与协作指南.html)。

---

## 0. 你要准备什么

| 项 | 说明 |
| --- | --- |
| 一个 Cloudflare 账号 | 免费注册：<https://dash.cloudflare.com/sign-up> |
| 一个 GitHub 账号 | 已有：`tangzzz-fan` |
| 本仓库的推送权限 | 已配置 SSH key，`ssh -T git@github.com` 能返回成功即可 |

**不需要**：服务器、云主机、域名、SSL 证书、备案。

---

## 1. 第一步：把代码推到 GitHub

仓库 `github.com/tangzzz-fan/DriverCareer` 目前是**空的**。在项目根目录执行：

```bash
cd /Users/tango/Developments/DriverCareer

git init
git branch -M main
git remote add origin git@github.com:tangzzz-fan/DriverCareer.git

git add .
git commit -m "初始化：科三路线通 SPA + 数据层 + 文档"
git push -u origin main
```

**推完检查**：打开 <https://github.com/tangzzz-fan/DriverCareer> ，应该能看到 `README.md`、`prototype/`、`docs/` 三个部分。

> ⚠️ 本仓库是 **Public（公开）**。`.gitignore` 已排除 `.workbuddy/`（内部笔记）。如果你希望仓库转为私有，在 GitHub 仓库 **Settings → General → Danger Zone → Change visibility** 里改。

---

## 2. 第二步：创建 Cloudflare Pages 项目

1. 登录 <https://dash.cloudflare.com>
2. 左侧菜单点 **Workers & Pages**
3. 点右上角 **Create**（或 **Create application**）
4. 切到 **Pages** 标签页
5. 选 **Connect to Git**（连接 Git 仓库）

> 页面上还有 **Direct Upload**（拖拽上传）选项。它更快，但**没有版本历史、没法协作、回滚靠手动覆盖**——除非只是临时试水，否则请用 Connect to Git。

### 2.1 授权 GitHub

- 点 **Connect GitHub**，在弹出的授权页里允许 Cloudflare 访问
- 可以选择 **Only select repositories**，只勾选 `DriverCareer`
- 回到 Cloudflare，在列表里选中 `DriverCareer`，点 **Begin setup**

### 2.2 填写构建配置 ⚠️ 这一页最容易填错

| 字段 | 填什么 | 说明 |
| --- | --- | --- |
| **Project name** | `drivercareer` | 决定你的网址，最终会是 `drivercareer.pages.dev`。只能用字母数字和连字符 |
| **Production branch** | `main` | 保持默认 |
| **Framework preset** | `None` | 本项目零框架、零构建 |
| **Build command** | **留空** | 没有构建步骤 |
| **Build output directory** | `prototype` | ⚠️ **必须填这个**，见下方说明 |

> **`Build output directory` 到底填什么？**
> 填**仓库里那个放着 `index.html` 的目录名**。
> 本仓库的结构是 `prototype/index.html`，所以填 `prototype`。
> 如果你后来把 `index.html` 挪到了仓库根目录，这里就填 `/`。

其余选项（环境变量等）**全部不用填**。

### 2.3 部署

点 **Save and Deploy**，等大约 10–30 秒。

成功后会看到 **Success: Your site was deployed!**，并给出网址：

```
https://drivercareer.pages.dev
```

**HTTPS 已经自动配好了**，不需要你做任何事，Cloudflare 会自动签发并续期证书。

---

## 3. 第三步：验证部署成功

打开 `https://drivercareer.pages.dev`，逐项确认：

- [ ] 首页显示「练哪条线？」，能看到 **C1 手动挡 / C2 自动挡** 切换控件
- [ ] 切换车型时，下面的「考核 16 项」会变成「考核 15 项」
- [ ] 能看到 **4 条线路**：1 号线 / 2 号线 / 4 号线① / 4 号线②
- [ ] 点进任意线路，待选池里卡片数量与首页标注一致（C1 = 16 个，C2 = 15 个）
- [ ] 底部「速查」页里点任意一项能展开，看到口诀和操作要点
- [ ] 首页底部有 **★ 整场模拟** 入口，点进去能开始答题
- [ ] 打开 `你的网址/editor.html`，能看到线路校准工具（教练用）
- [ ] 地址栏是 **https://** 开头（有小锁图标）

**手机上也要试一次**：把网址发到自己的微信文件传输助手，在手机上点开——这是真实使用场景，桌面浏览器通过不代表手机没问题。

---

## 4. （可选）绑定自己的域名

不绑也完全能用，`*.pages.dev` 一样是 HTTPS。想用更好记的地址再往下做。

1. Pages 项目 → **Custom domains** → **Set up a custom domain**
2. 输入你的域名（例如 `k3.example.com`），点 **Continue**
3. 按提示配置 DNS：
   - **子域名**（如 `k3.example.com`）：在你域名注册商处加一条 **CNAME** 记录，指向 `drivercareer.pages.dev`
   - **根域名**（如 `example.com`）：需要把域名的 **NS（DNS 服务器）迁到 Cloudflare**
4. 等待生效（通常几分钟，最长 24 小时）

> **迁 NS 只是改解析服务器，不是域名转移**——域名仍然在你原来的注册商手里，续费也还在原处。
> 如果嫌麻烦，就用 `*.pages.dev`，功能上没有任何差别。

---

## 5. 之后怎么更新内容

**推代码即部署，不需要碰 Cloudflare。**

```bash
# 改完 data/ 下的文件后
git add .
git commit -m "按教练确认，1 号线会车与掉头对调"
git push
```

Cloudflare 检测到 push 会自动重新部署，大约 1 分钟生效。到项目的 **Deployments** 标签页能看到每次构建的状态。

### 更推荐的方式：走 Pull Request

改动**不要直接提交到 main**，而是：

1. 在 GitHub 网页上编辑文件
2. 提交时选择 **Create a new branch for this commit and start a pull request**
3. Cloudflare 会为这个 PR 自动生成**独立的预览链接**（形如 `drivercareer-pr-3.pages.dev`）
4. **在手机上打开预览链接，真机确认改动对不对**
5. 确认无误 → 合并 PR → 正式站点自动更新

> **为什么值得多点这几下：** 路线顺序一旦改错，学员会照着练错、考挂、然后永久流失。预览链接让「确认」这个动作发生在真机上，而不是等上线之后。

### 教练怎么改数据

不需要让他 clone 仓库。把这两个网址发给他：

| 网址 | 用途 |
| --- | --- |
| `你的网址/editor.html` | **线路校准工具** —— 可视化调整顺序、加区分标签、改来源标记，改完点「导出 routes.js」 |
| `你的网址/` | 正式站点，用来看改完的效果 |

教练导出的 `routes.js` 发给你（或直接提 PR 替换 `prototype/data/routes.js`），推上去一分钟生效。

---

## 6. 出问题怎么办

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 打开是 **404** 或目录列表 | `Build output directory` 填错了 | 项目 → Settings → Builds & deployments → 改成 `prototype`，然后 Redeploy |
| 白屏，页面提示**「数据文件没有加载成功」** | `data/` 目录没部署上去 | 确认仓库里 `prototype/data/` 下 4 个 `.js` 文件都在。若把它们放到了别的位置，输出目录要相应调整 |
| 页面能打开但**排版全乱** | `index.html` 没被当作网页处理 | 确认仓库里的文件名就是 `index.html`（全小写） |
| **改了数据线上没变** | 没 push / push 到了别的分支 / 浏览器缓存 | ① 看 Deployments 有没有新构建记录；② 手机强制刷新（微信里可下拉刷新或换个链接参数） |
| **国内访问很慢或偶尔打不开** | Cloudflare 免费版**没有大陆节点**（大陆节点仅 Enterprise 可用） | 这属于预期内。若实测学员普遍反映慢，**换腾讯云 CloudBase 静态托管**——免费额度够用、国内 CDN 极快、免备案，而且后续要转小程序时环境不用搬 |
| 微信里提示**「非微信官方网页，请确认是否继续访问」** | 微信对第三方网页的固有安全提示 | **无法根除**。用户点「继续访问」即可正常使用。这是网页在微信内的固有代价 |
| 构建失败 | 罕见（本项目零构建） | 看 Deployments 里的构建日志，通常是文件被误删或改坏了语法 |

### 回滚到上一个正常版本

1. Pages 项目 → **Deployments** 标签页
2. 找到上一个正常的部署记录
3. 点右侧 **⋯** → **Rollback to this deployment**

秒级生效。

---

## 7. 免费额度够用吗

够。

- **带宽**：不限量
- **构建次数**：免费版每月有配额上限，但本项目**只在 push 时触发构建**，正常使用远不会碰到
- **站点数**：不限

> 具体配额以 Cloudflare 官方定价页为准，政策会调整。就本项目这个体量（纯静态、不到 60KB、无图片无视频），个人项目完全在免费范围内。

**本地存储说明**：车型选择和错题本存在学员自己手机的 `localStorage` 里，**不经过任何服务器**，所以没有后端费用。代价是换手机或清缓存会丢进度。

---

## 8. 一页速查

```
仓库              github.com/tangzzz-fan/DriverCareer
输出目录          prototype
构建命令          （留空）
框架预设          None

网址              https://drivercareer.pages.dev
HTTPS             自动，不用管
更新方式          git push → 自动部署（约 1 分钟）
回滚              Deployments → ⋯ → Rollback
```

---

*最后更新：2026-10-10。Cloudflare 控制台界面措辞可能随版本调整，字段含义不变。*
