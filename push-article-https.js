#!/usr/bin/env node
/**
 * 使用 Node 内置 https/http 向公众号推送接口发 POST，不依赖 AI 拼请求。
 *
 * 用法（在 wechat-mp-article-push 目录下，且已存在 config.json）：
 *   node push-article-https.js "文章标题" "<p>HTML 正文</p>"
 *   node push-article-https.js "文章标题" ./article.html
 *
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const DEFAULT_API = 'https://api.pcloud.ac.cn/openClawService';

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('缺少 config.json，请先完成向导并保存到本目录：' + configPath);
  }
  const text = fs.readFileSync(configPath, 'utf8').trim();
  if (!text) {
    throw new Error('config.json 为空，请粘贴向导生成的 JSON');
  }
  return JSON.parse(text);
}

/**
 * @param {string} urlStr 完整 URL
 * @param {object} jsonBody 会序列化为 application/json
 * @param {number} [timeoutMs=120000]
 * @returns {Promise<{ statusCode: number, raw: string, json?: object }>}
 */
function postJson(urlStr, jsonBody, timeoutMs = 120000) {
  const payload = JSON.stringify(jsonBody);
  const u = new URL(urlStr);
  const isHttps = u.protocol === 'https:';
  const lib = isHttps ? https : http;
  const port = u.port || (isHttps ? 443 : 80);

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: u.hostname,
      port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json, text/plain, */*',
        'Content-Length': Buffer.byteLength(payload, 'utf8'),
      },
    };

    const req = lib.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json;
        try {
          json = JSON.parse(raw);
        } catch {
          /* 非 JSON 仍返回 raw */
        }
        resolve({ statusCode: res.statusCode, raw, json });
      });
    });

    const timer = setTimeout(() => {
      req.destroy(new Error('请求超时 ' + timeoutMs + 'ms'));
    }, timeoutMs);

    req.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    req.on('close', () => clearTimeout(timer));

    req.write(payload);
    req.end();
  });
}

function buildBody(config, title, content) {
  if (!config.openId || String(config.openId).includes('XXXX')) {
    throw new Error('config.json 中 openId 无效，请使用向导生成的真实 openId');
  }
  const body = {
    action: 'sendToWechat',
    openId: config.openId,
    title: String(title).slice(0, 64),
    content: String(content),
    sendMode: 'draft',
  };
  if (config.pushMode === 'custom' && config.accountId != null && config.accountId !== '') {
    body.accountId = config.accountId;
  }
  return body;
}

function resolveContent(arg) {
  if (!arg) {
    return '<p>（未传入正文，占位）</p>';
  }
  const maybePath = path.resolve(process.cwd(), arg);
  if (fs.existsSync(maybePath) && fs.statSync(maybePath).isFile()) {
    return fs.readFileSync(maybePath, 'utf8');
  }
  return arg;
}

async function main() {
  const title = process.argv[2] || '未命名文章';
  const contentArg = process.argv[3];
  const content = resolveContent(contentArg);

  const config = loadConfig();
  const apiBase = config.apiBase || DEFAULT_API;
  const body = buildBody(config, title, content);

  console.error('[push-article-https] POST', apiBase);
  console.error('[push-article-https] title 长度:', body.title.length, 'content 长度:', body.content.length);

  const res = await postJson(apiBase, body);
  process.stdout.write(
    JSON.stringify(
      {
        ok: res.statusCode >= 200 && res.statusCode < 300,
        statusCode: res.statusCode,
        data: res.json !== undefined ? res.json : res.raw,
      },
      null,
      2
    ) + '\n'
  );

  if (res.statusCode < 200 || res.statusCode >= 300) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[push-article-https] 错误:', err.message || err);
  process.exit(1);
});

module.exports = { postJson, loadConfig, buildBody };
