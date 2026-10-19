#!/bin/bash
# 服务商准入指引助手 —— 一键部署到 GitHub Pages
# 用法：
#   GITHUB_USER=你的用户名 GITHUB_TOKEN=ghp_xxx ./deploy-gh-pages.sh
# 说明：token 只存在于本次进程的环境变量中，不写入 .git/config，不进入 shell 历史。
set -euo pipefail

REPO_NAME="${REPO_NAME:-service-provider-guide}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

# ---------- 1. 读取凭证 ----------
GITHUB_USER="${GITHUB_USER:-}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$GITHUB_USER" ]; then
  read -r -p "GitHub 用户名: " GITHUB_USER
fi
if [ -z "$GITHUB_TOKEN" ]; then
  echo -n "GitHub Personal Access Token (输入时不显示): "
  read -rs GITHUB_TOKEN
  echo
fi

[ -n "$GITHUB_USER" ] || { echo "错误：缺少 GitHub 用户名"; exit 1; }
[ -n "$GITHUB_TOKEN" ] || { echo "错误：缺少 GitHub Token"; exit 1; }

API="https://api.github.com"
AUTH_HEADER="Authorization: Bearer ${GITHUB_TOKEN}"
SITE_URL="https://${GITHUB_USER}.github.io/${REPO_NAME}/"

echo "==> 目标仓库：${GITHUB_USER}/${REPO_NAME}"

# ---------- 2. 校验 token 并取账号信息 ----------
echo "==> 校验 GitHub 凭证..."
LOGIN=$(curl -sS -H "$AUTH_HEADER" -H "Accept: application/vnd.github+json" "$API/user" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("login","") or "")')
if [ -z "$LOGIN" ]; then
  echo "错误：token 无效或权限不足，请确认 token 未过期且勾选了 repo 权限。"
  exit 1
fi
echo "    已登录为：$LOGIN"

# ---------- 3. 创建仓库（已存在则复用） ----------
echo "==> 创建仓库 ${REPO_NAME} ..."
CREATE_CODE=$(curl -sS -o /tmp/gh_create.json -w '%{http_code}' \
  -X POST "$API/user/repos" \
  -H "$AUTH_HEADER" -H "Accept: application/vnd.github+json" \
  -d "$(printf '{"name":"%s","description":"腾讯营销服务商准入指引助手","public":true,"auto_init":false}' "$REPO_NAME")")

if [ "$CREATE_CODE" = "201" ]; then
  echo "    仓库已创建"
elif [ "$CREATE_CODE" = "422" ]; then
  echo "    仓库已存在，直接复用"
else
  echo "错误：创建仓库失败 (HTTP $CREATE_CODE)"
  python3 -c 'import json;print(json.load(open("/tmp/gh_create.json")).get("message",""))' 2>/dev/null || true
  exit 1
fi

# ---------- 4. 提交本地改动 ----------
echo "==> 提交本地文件..."
git add -A
if ! git diff --cached --quiet; then
  git -c commit.gpgsign=false commit -q -m "chore: 更新站点内容 $(date '+%Y-%m-%d %H:%M')"
  echo "    已创建新提交"
else
  echo "    无改动，跳过提交"
fi
git branch -M main

# ---------- 5. 推送（token 仅用于本次，推完立即清除） ----------
echo "==> 推送到 GitHub..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
git push -q -u origin main
# 把 remote 换回不带 token 的地址，避免 token 残留在 .git/config
git remote set-url origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
echo "    推送完成"

# ---------- 6. 开启 GitHub Pages ----------
echo "==> 开启 GitHub Pages..."
PAGES_CODE=$(curl -sS -o /tmp/gh_pages.json -w '%{http_code}' \
  -X POST "$API/repos/${GITHUB_USER}/${REPO_NAME}/pages" \
  -H "$AUTH_HEADER" -H "Accept: application/vnd.github+json" \
  -d '{"source":{"branch":"main","path":"/"}}')

if [ "$PAGES_CODE" = "201" ] || [ "$PAGES_CODE" = "204" ] || [ "$PAGES_CODE" = "409" ]; then
  echo "    Pages 已开启"
else
  echo "警告：Pages 接口返回 HTTP $PAGES_CODE，可能需要在网页端手动开启。"
  python3 -c 'import json;print(json.load(open("/tmp/gh_pages.json")).get("message",""))' 2>/dev/null || true
fi

# ---------- 7. 等待发布完成 ----------
echo "==> 等待 Pages 构建发布（最多 90 秒）..."
for i in $(seq 1 30); do
  HTTP=$(curl -sS -o /dev/null -w '%{http_code}' "$SITE_URL" || echo 000)
  if [ "$HTTP" = "200" ]; then
    echo
    echo "=============================================="
    echo "  部署成功！访问地址："
    echo "  ${SITE_URL}"
    echo "=============================================="
    exit 0
  fi
  sleep 3
done

echo
echo "推送已完成，但 Pages 尚未生效（首次发布通常需要 1~2 分钟）。"
echo "请稍后访问：${SITE_URL}"
echo "若超过 5 分钟仍打不开，到 ${SITE_URL%./*/} 仓库的 Settings → Pages 检查 Source 是否为 main 分支。"
