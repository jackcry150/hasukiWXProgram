# HasukiWXProgram

这个目录是从 `GooMooTechWXProgram/uniapp_623` 复制出来的 `HASUKI` 小程序前端壳。

## 当前结构

- `uniapp_hsk/`
  - 独立的小程序前端源码
  - 已将应用名和主要前台品牌文案切换为 `HASUKI`
- 后台不在本项目内
  - 继续复用 `../GooMooTechWXProgram/php`
  - 接口仍通过同一套 `/api` 提供

## 复用后台说明

- 用户、订单、商品、收藏、积分、抽奖等数据继续走原 GooMoo 后台
- 后台数据库字段无需改名
  - 例如前端仍读取 `snailShells`，但展示文案已改成“积分”
- 如果后续要彻底拆成 Hasuki 独立后台，再单独拆接口和配置

## 当前已完成

- 小程序名称改为 `HASUKI`
- 首页、校验页、我的页、关于页、登录页的 GooMoo 品牌文案已替换
- `猫饼/蜗壳` 前端展示文案已统一成“积分/积分抽奖”

## 后续建议

1. 重新编译 `uniapp_hsk`
   - 让 `unpackage/` 产物同步为 Hasuki 版本
2. 按 Hasuki 品牌继续改页面视觉
   - 首页 banner
   - 关于页内容
   - 我的页社群/客服文案
3. 如需独立发布微信小程序
   - 替换 `uniapp_hsk/manifest.json` 里的 `mp-weixin.appid`
