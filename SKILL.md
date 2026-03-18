---
name: wechat-mp-article-push
description: 公众号文章生成与推送。先完成在线向导；配置与设计规范均在「wechat-mp-article-push」Skill 目录内；写文章读 design.md，推送读同目录 config.json 后 POST 草稿箱。
---

# wechat-mp-article-push · 公众号文章生成与推送

## 路径约定（通用，不绑定某盘符或 ~/skills）

**「wechat-mp-article-push 目录」** = 当前本 Skill 所在的那个文件夹（与 **SKILL.md** 在同一层）。

| 文件 | 位置 |
|------|------|
| **SKILL.md** | `wechat-mp-article-push 目录/` |
| **design.md** | 同上 |
| **config.json** | **同上**（与 SKILL.md **同级**） |
| **config.example.json** | 同上 |

大模型 / 用户：**先定位本 Skill 的根目录（看 SKILL.md 在哪）**，再在同目录读写 **config.json**、**design.md**。

---

## 第一步：在线向导（必做）

| 项 | 内容 |
|----|------|
| **向导地址** | <https://app.pcloud.ac.cn/design/wechat-mp-article-push.html> |
| **流程** | 微信扫码登录 → 选择推送账号 → 复制「完整提示」发给 AI |

未走完向导、没有真实 **`openId`**，不得调用推送。

---

## 第二步：配置文件

将向导得到的配置参数保存为 **wechat-mp-article-push 目录** 下的 **`config.json`**，编码 **UTF-8**。

在已进入该目录时，可：

```bash
cat > config.json << 'EOF'
{ … 粘贴向导 JSON … }
EOF
```

（Windows 可用编辑器在该目录新建 `config.json` 并粘贴。）

---

## 第三步：写文章

读取 **同目录** 的 **`design.md`**；推送时使用 **`title`** + **`content`**（HTML）。

---

## 第四步：推送到公众号

| 项 | 说明 |
|----|------|
| **请求 URL** | **`config.json`** 里的 **`apiBase`**；缺省 **`https://api.pcloud.ac.cn/openClawService`** |
| **方法** | **POST**，`Content-Type: application/json` |
| **Body** | `openId`、`title`、`content`、`sendMode: "draft"`；**custom** 时加 **`accountId`**（及配置里要求的字段） |

默认 **草稿箱**。未认证号勿用群发/直接发布。

---

## 本目录文件一览

| 文件 | 作用 |
|------|------|
| **SKILL.md** | 本说明 |
| **design.md** | 文章 HTML 规范 |
| **config.example.json** | 字段说明（fieldsHelp）+ 示例 |
| **config.json** | 向导生成后的真实配置 |
| **push-article-https.js** | Node 脚本：用内置 `https` 直 POST 推送接口，避免 AI 拼错请求 |

### 命令行推送（推荐）

在本目录准备好 **config.json** 后：

```bash
node push-article-https.js "文章标题" "<p>HTML</p>"
# 或正文从文件读：
node push-article-https.js "文章标题" ./index.html
```

成功/失败会在 stdout 打印 JSON（含 `statusCode`）。
