// ==========================================
// 魅魔牛 - 悬浮状态栏
// 视觉与正文结尾的三条美化同源：银质纹章角饰 + 双轨细线（让开纹章）+ 黑布纹底 +
//   花体英文字标 + 中文衬线副标；金色只做状态色 —— 数值变动的瞬间闪一下金。
// 信息组织：双角色对照栏。结衣 / 莉莉娅 左右并列，同一维度上下对齐可比；
//   条目多的（身体开发 / 性经验）折进手风琴，默认收起。
// 骨架沿用上一版：iframe 操作顶层页面 / 防重复注入 / 样式作用域隔离 /
//   变量四级读取兜底 / Mvu 事件 + 消息事件驱动刷新（含轮询兜底）/
//   切卡挂载与拆除 / 拖动与位置持久化。
// 接入：由 tavern_sync 以「外链文件」方式内联进角色卡脚本库（index.yaml 的 文件: 脚本/悬浮状态栏）
// 注意：本文件是 .preview/build-css.mjs 的产物，素材占位符会被替换成 base64。
//       要改样式请改 .preview/tpl/悬浮状态栏.js，再跑 build-css.mjs。
// ==========================================
(function () {
  'use strict';

  // ---------- 顶层页面访问（脚本运行在酒馆助手 iframe 内） ----------
  const topWin = window.parent || window;
  const $ = topWin.jQuery || topWin.$;
  const topDoc = topWin.document;

  function lsGet(key) {
    try {
      return topWin.localStorage ? topWin.localStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }
  function lsSet(key, value) {
    try {
      if (topWin.localStorage) topWin.localStorage.setItem(key, value);
    } catch (e) {
      /* 隐私模式等场景忽略 */
    }
  }

  const ID_PANEL = 'mn-vars';
  const ID_BTN = 'mn-vars-btn';
  const ID_STYLE = 'mn-vars-style';
  const ID_AUDIO = 'mn-audio-el';
  // 耳机图标：标题栏按钮和二级页的提示弹窗用同一个字形
  const ICON_EAR = '🎧';
  const LS_BTN_POS = 'mn-vars-btn-pos';
  const LS_PANEL_POS = 'mn-vars-panel-pos';
  const OUR_CARD = '魅魔牛';
  // 缩略按钮图标（图床外链；加载失败时回退为「变量」文字）
  const BTN_ICON_URL = 'https://cloudflare-imgbed-eup.pages.dev/file/魅魔牛/icon/淫纹1_128x128.png';
  // 本卡 MVU 变量的顶层键（用于识别 stat_data 是否为本卡的有效数据）
  const ROOT_KEYS = ['环境', 'user', '结衣', '莉莉娅', '三人关系'];
  // 对照栏的两个主角；顺序即左右栏序。键名即变量顶层键，取中文字符串以免转义
  const PAIR = ['结衣', '莉莉娅'];
  // 折进手风琴的两组：条目多且多数为 0，展开才值得看
  const FOLD_GROUPS = [
    { key: '身体开发', mode: 'bar' },
    { key: '性经验', mode: 'num' },
  ];
  // 「你」这一区独占整幅（不挤进对照栏，因为 user 没有「对谁」的关系组）
  const OWN_SPEC = {
    title: '你',
    root: 'user',
    bars: ['精力'],
    texts: ['立场', '状态'],
    folds: [
      { key: '身体开发', mode: 'bar' },
      { key: '性经验', mode: 'num' },
    ],
  };
  const TRIO_SPEC = {
    title: '三人关系',
    root: '三人关系',
    bars: ['背德公开度'],
    texts: ['当前氛围'],
    folds: [],
  };

  // ---------- 音声数据 ----------
  // 图床地址。文件名与本地一致，只有第 5、6 轨的 & 在上传时被图床改成了 _。
  // 全部 22 个链接（11 轨 mp3 + 11 份字幕）都验过：200、content-type 正确、
  // 带 Access-Control-Allow-Origin:*，音频还支持 Range（206）所以拖进度不用整段下完。
  const AUDIO_BASE = 'https://cloudflare-imgbed-eup.pages.dev/file/魅魔牛/asmr/';
  // 时长取作品官方音轨表（read_me）而不是探测元数据：省掉 11 次请求，
  // 列表一进就有数；真实时长到了之后会被元素报的值顶掉。
  // name 一律照抄图床上的文件名（去掉扩展名，第 5、6 轨的 _ 就是图床上的写法）。
  // 列表里编号与名称分两段着色，但两段拼起来必须等于这个 name，好让你对着链接核对。
  // pre 是「开场白」标注，单独一段渲染：它是人工标注、不是文件名的一部分，
  // 混进 name 就破坏了与图床文件的逐字对应
  const TRACKS = [
    { who: 'jie', pre: '开场白1', name: '01.和最喜欢的女朋友做亲热无套爱爱', dur: '08:11', file: '01.和最喜欢的女朋友做亲热无套爱爱.mp3' },
    { who: 'san', pre: '开场白1', name: '02.“还是那三人”做3P高潮无套交尾', dur: '11:04', file: '02.“还是那三人”做3P高潮无套交尾.mp3' },
    { who: 'san', pre: '', name: '03.莉莉娅教的舔耳与手冲', dur: '15:14', file: '03.莉莉娅教的舔耳与手冲.mp3' },
    { who: 'jie', pre: '开场白2', name: '04.和“朋友”出去旅行的结衣', dur: '03:04', file: '04.和“朋友”出去旅行的结衣.mp3' },
    { who: 'lia', pre: '开场白3', name: '05.莉莉娅的牛头人报告_当面无套爱爱', dur: '21:04', file: '05.莉莉娅的牛头人报告_当面无套爱爱.mp3' },
    { who: 'san', pre: '开场白3', name: '06.结衣的牛头人报告_双重舔耳手冲', dur: '12:01', file: '06.结衣的牛头人报告_双重舔耳手冲.mp3' },
    { who: 'lia', pre: '开场白5', name: '07.和莉莉娅的甘甜安慰爱爱', dur: '13:31', file: '07.和莉莉娅的甘甜安慰爱爱.mp3' },
    { who: 'san', pre: '开场白7', name: '08.结衣的屁眼处女丧失爱爱', dur: '15:10', file: '08.结衣的屁眼处女丧失爱爱.mp3' },
    { who: 'san', pre: '开场白4', name: '09.被莉莉娅侵犯屁屁性爱', dur: '18:48', file: '09.被莉莉娅侵犯屁屁性爱.mp3' },
    { who: 'lia', pre: '开场白6', name: '10.主人与性奴隶对你的反向强奷', dur: '17:43', file: '10.主人与性奴隶对你的反向强奷.mp3' },
    { who: 'san', pre: '开场白8、9', name: '11.还是那三人的侵犯被侵犯3P三明治', dur: '11:28', file: '11.还是那三人的侵犯被侵犯3P三明治.mp3' },
  ];
  // 说话人：只用在「正在播放」那一行，列表里不占位（名称本身多数已经点了人名）
  const WHO = {
    jie: { label: '结衣', ch: '结' },
    lia: { label: '莉莉娅', ch: '莉' },
    san: { label: '三人', ch: '三' },
  };
  function trackParts(t) {
    const dot = t.name.indexOf('.');
    return dot < 0
      ? { num: '', rest: t.name }
      : { num: t.name.slice(0, dot + 1), rest: t.name.slice(dot + 1) };
  }

  const TRACK_LIST_HTML = TRACKS.map(function (t, i) {
    const p = trackParts(t);
    return (
      '<button class="mn-trk" type="button" data-i="' + i + '">' +
      '<span class="mn-trk-n">' + esc(p.num) + '</span>' +
      '<span class="mn-trk-t">' + esc(p.rest) + '</span>' +
      (t.pre ? '<span class="mn-trk-p">（' + esc(t.pre) + '）</span>' : '') +
      '<span class="mn-eq" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '<span class="mn-trk-d">' + t.dur + '</span>' +
      '</button>'
    );
  }).join('');

  // 音声页骨架。全是静态结构，只有「当前轨」和「当前句」在变，靠脚本改类与文本。
  // 耳机提示与播放器是互斥的两块，用 hidden 切换 —— 不用遮罩盖在播放器上，
  // 遮罩在窄屏会和面板自身的滚动打架。
  const AUDIO_HTML =
    '<div class="mn-gate">' +
    '<div class="mn-gate-ico" aria-hidden="true">' + ICON_EAR + '</div>' +
    '<div class="mn-gate-t">建议佩戴耳机</div>' +
    '<div class="mn-gate-p">进入前一定要戴上耳机！不然会社死！</div>' +
    '<div class="mn-gate-btns">' +
    '<button class="mn-btn mn-btn-go" type="button" data-act="gate-ok">戴好了</button>' +
    '<button class="mn-btn" type="button" data-act="gate-back">返回</button>' +
    '</div></div>' +
    '<div class="mn-player" hidden>' +
    '<div class="mn-now">' +
    '<span class="mn-now-num"></span>' +
    '<span class="mn-now-title">选一轨开始收听</span>' +
    '<span class="mn-now-pre"></span>' +
    '<span class="mn-now-tag" data-w="" hidden></span>' +
    '</div>' +
    '<div class="mn-cues"><div class="mn-cues-in">' +
    '<p class="mn-cue mn-cue-hint">从下面选一轨</p>' +
    '</div></div>' +
    '<div class="mn-seek" role="slider" tabindex="0" aria-label="播放进度"' +
    ' aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
    '<span class="mn-seek-bg"></span><span class="mn-seek-fill"></span>' +
    '<span class="mn-seek-knob"></span></div>' +
    '<div class="mn-times"><span class="mn-t-cur">00:00</span>' +
    '<span class="mn-t-dur">00:00</span></div>' +
    '<div class="mn-ctrl">' +
    '<button class="mn-cbtn" id="mn-prev" type="button" aria-label="上一轨">«</button>' +
    '<button class="mn-cbtn mn-play" id="mn-play" type="button" aria-label="播放">' +
    '<span class="mn-ic-play" aria-hidden="true"></span>' +
    '<span class="mn-ic-pause" aria-hidden="true"></span>' +
    '<span class="mn-ic-spin" aria-hidden="true"></span>' +
    '</button>' +
    '<button class="mn-cbtn" id="mn-next" type="button" aria-label="下一轨">»</button>' +
    '</div>' +
    '<div class="mn-list"><div class="mn-list-h"><span>TRACK LIST</span>' +
    '<span class="mn-list-note">共 ' + TRACKS.length + ' 轨</span></div>' +
    TRACK_LIST_HTML +
    '</div>' +
    '</div>';

  if (!$ || !topDoc) {
    console.warn('[魅魔牛状态栏] 顶层页面缺少 jQuery，无法注入悬浮状态栏');
    return;
  }

  // 防重复注入（脚本被重载/多次执行时先清理旧实例；音频元素一并清掉，
  // 否则重载后旧的 <audio> 会留在 body 里继续放）
  $('#' + ID_PANEL + ', #' + ID_BTN + ', #' + ID_STYLE + ', #' + ID_AUDIO, topDoc).remove();
  $(topDoc).off('.mnvars');

  // ---------- 样式（作用域化在 .mn-vars 上，绝不触碰酒馆 :root） ----------
  const STYLE_CSS = `
<style id="${ID_STYLE}">
.mn-vars{
  --k-void:#08080a;--k-base:#17171d;--k-inset:#0d0d11;
  --k-hair:rgba(232,232,238,.3);--k-hair-2:rgba(246,246,250,.6);--k-hair-3:rgba(246,246,250,.16);
  /* 大块边界用金线、小块边界用银细线：金是结构色，亮金仍旧只留给「正在发生」 */
  --k-gold-hair:rgba(211,178,105,.38);
  --k-fg:#eaecf2;--k-fg-dim:#a8acb6;--k-fg-mute:#7d818b;
  --k-gold:#d3b269;--k-gold-2:#eddcab;
  --k-ff-script:"Brush Script MT","Segoe Script","Lucida Handwriting","Apple Chancery","Snell Roundhand",cursive;
  --k-ff-serif:"Times New Roman",Georgia,"Source Han Serif SC","Noto Serif SC","Songti SC",STSong,SimSun,serif;
  --k-ff-ui:"PingFang SC","Microsoft YaHei","Sarasa UI SC","Hiragino Sans GB",system-ui,-apple-system,"Segoe UI",sans-serif;
  --k-tex:url(data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgwKCA0MCwwPDg0QFCIWFBISFCkdHxgiMSszMjArLy42PE1CNjlJOi4vQ1xESVBSV1dXNEFfZl5UZU1VV1P/2wBDAQ4PDxQSFCcWFidTNy83U1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1P/wAARCABAAEADASIAAhEBAxEB/8QAGAABAQEBAQAAAAAAAAAAAAAAAwECBAD/xAAkEAACAQQCAgIDAQAAAAAAAAABAgMAERIhBEExYSJRE0JSkf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDU8bBC1r+uqnDJChSuLDd/VMHE4yRiADV+DD8gsStwRQByJY45h+zsQLA1yzrHJLj4BvonuuiXjrP8sgjeb2rI4iB1JJZh9jQoBgWOOXHyBbQPddXHljkmP6upIsTRniIXYglWP0NGtRcdYPlkHbze1BrmElSoXJju/qrBGxQNa3rqm+Cj8hsC1gBUZxAMnYkE0AclmaRCoEYT+aWOQsrZsAAt9CiKSSKhcAbI90Llg9j4t5+6BHkyUixtbqqIWwzZti3+VrjhQrXJ3rVDLLg5jB0eu6BDC2Gats3/AMqJJioFja3dYilzcRk6HXdNyApVbE61ugSSQqq4MCCt9ii4zMsjlgJA/wDVChYvYeLefqmCSRq5QA7A90Hi8kaoHIOyfdC4Yvc+LePqm5KssiBSJA/80scZVWzUEFbaNAfHKlWuDreqGWLNzIBod91t48VJubW6qiZsMGXZt/lAcUWDiQjR77puQVCrYHe91kzNhgq7F/8AKiR5KDc2t3QGgYPceLePumDySK4QgbB90skZZVwUABbbNFxlZpHDERhP6oHCCAYopIJq/BR+MWBa5JoZ5GKFb299VOGCVDFsmOreqDMvIWD44h28WvWRy0LqCCrH7OjSciKOSYfq6kG4Fcs7Rxy5eQL7I7oGPLQOwALMPo6Fai5Cz/HEI3i1654Gjkly8A22B3XVx4o45j+zsSbkUD/Bh+M2JWxBqMgnGLqQAaHmAhSwbFhq3qrBIwQLe/vqg//Z);
  --k-corner:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAArCAYAAADlqKH9AAAEJElEQVR42s1ZPW8TTRB+5nRcwX9IYqRQr/gDFG+klBYNUqqgpEiNrkaiIHV09Vvw6qWitCiRACkN9dVBCsmPQMp6uaHwjDW37CZnxwaP5MIftzv7zMwzz6wJAyx4dmVFLdZowbMDsAdg23z8X1lRi+C5CTe8lXooeJ7Iy2HNFjzXdp+p53Hw3ATPDj8D//gZ+EfKGf1uWWSC52bquZW169xvxaE6BxRZJ7jDv2VFL+UHEwbe6ncPKvqwCCoStmv5aJsKnABA1+EgtVYupaaeZ+G2aMoDzdTzeNmw5Z4NnmvZpx6yliA8sQu3ubBHGzVTz62EsZfP8xy6/RCN7OMSOdnYAyTTxDhahxveCp6dRSV4noiDY8mXWk869Tweir7s0US5VwfPbr6/Wbs05X8E4JA77FGBUwCnAECzRcEdPlKB/bKkh2bxI0UHADSfB1BNz8qK2uB5/p4KnHYdLgg47FWhfVhz1CDW2JxV5CJmyFWny4S7zuWspJLrQR+F1NnPtIiUSlLcZg8pDjd6kLgQ1Ilbiuq3mihzYSHgKnhuqMAJASddhwsqsG83Lys6kw1Ghj6+GxqyIT5SGpqHUb5j4B0VeGwp8M48sSfSYoqJ3YYkRtjSR/A8STUMm0ZajIty3cTkRmNytNVK1JBpV7gtH1N0E3PzQhbxZaPvLaLWwR7hRkimHLfrDCX1JFGnaEILynKcFtUQNFbioKIYI2BC1giZj2MyjqvVIOxSDi6af73qLmYVdqXVaMRGA2AE4DWJSCgKvA+eRwDO2QgEcWCXZkseB8/nAJ4WBR6LiHm1iFhJFowg1sRo2ZSwpByHL2p32kbbpYskwZOvGXgnJ74A8FlDQ8Cu/OZ66nnMwGfCjPfEngI4M/KsZ91svbfLOEk5RBl4RMAlFdiXDX4zDaFx5EAbgYS+NRtdlhU9W8mcYZX0ANnlLOdZp0x7bVWG3dtB7c9xH79DWzrzmti8MyxQx5JvqZwU4XoM4NBKeCrwVULtMgU0AnAuffxZ8FxTgVPLgQx8o3VMarFazg1I8/dGnVsJZxX4fSbOUh9ODUFlRWeqkgF8YmDnQUUfGNgB8CgaQZ8Q8I+gC4PkDoD2XnN7buiyXSOl8ay6ue21ioLJ6kk5uQqJ74mfnAMzfak8SMD/AD5ZFA2/3svJ6wEzyShmAgZecIcL5UoCLmXW3mPgm7S+lVzNlFJ9xwBy/XTP5qykxhslc0HwC4BrWetqJdWc69kp7oz6srP6cgjhr/RGSzuNzs+pCTFS7H/GuRT35SozO27+DZu3uf71iYvJeePM9OXNdNAM9ONNQcwlblzbZRX12q6EU/c2f9uvuC1uTz2PVSiIKj/YuPyLBqcam2p3XcT/aeu12XDDWyA8tzdmm2Cl5OCViNNdo2A2xsjSzbr/9VrWfgGY4h/S9AEDggAAAABJRU5ErkJggg==);
  --k-railh:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAHCAYAAADAp4fuAAAATElEQVR42m2MwQmAMBAE5850IFi4PdiN+PXpX0gDScz6OyQ4vx2YtVa0MmCt6hhlAk4ARA7pzh6Zc6uz8Ie1qi2WyBhz+n75xNUfeAHbEBhUBQDTbgAAAABJRU5ErkJggg==);
  --k-railv:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAARElEQVR42mP4/etfz+9f/1///vWvhwEKfv/61/Pnz//S/3dj5ZgYGBjFGHABdj4OFuwyjGL///1nYJSZeouJgQAgqAAAKcgY/RhdYl0AAAAASUVORK5CYII=);
  font-family:var(--k-ff-serif);color:var(--k-fg);
  word-break:break-word;-webkit-text-size-adjust:100%;
}
.mn-vars *{box-sizing:border-box}

/* ===== 缩略按钮（保留原图标，只加银边） =====
   银边用真 border、不用 outline：outline 永远是直角，会横切过圆角。
   overflow:hidden 把图标裁进 padding box（内圆角），图标再挂 border-radius:inherit。 */
#${ID_BTN}{
  position:fixed; z-index:999998; right:16px; bottom:96px;
  width:52px;height:52px;border-radius:13px;
  display:flex;align-items:center;justify-content:center;overflow:hidden;
  background:#ffffff;
  border:1px solid rgba(246,246,250,.78);
  box-shadow:0 0 0 1px rgba(12,12,16,.9),
    0 5px 16px rgba(0,0,0,.42),
    inset 0 0 0 1px rgba(246,246,250,.22);
  cursor:pointer;color:#1a1a1a;
  font-family:var(--k-ff-ui);font-size:12px;font-weight:700;letter-spacing:.5px;
  user-select:none;-webkit-user-select:none;touch-action:none;
  transition:transform .16s,box-shadow .2s,opacity .2s;
}
#${ID_BTN} .mn-icon{display:block;width:100%;height:100%;object-fit:cover;border-radius:inherit;
  pointer-events:none;-webkit-user-drag:none}
#${ID_BTN} .mn-fallback{display:none}
#${ID_BTN}.mn-icon-failed .mn-icon{display:none}
#${ID_BTN}.mn-icon-failed .mn-fallback{display:inline}
#${ID_BTN}:hover{transform:translateY(-2px);border-color:rgba(237,220,171,.9);
  box-shadow:0 0 0 1px rgba(12,12,16,.9),0 7px 20px rgba(0,0,0,.48),
    0 0 16px rgba(211,178,105,.3),inset 0 0 0 1px rgba(237,220,171,.35)}
#${ID_BTN}:focus-visible{outline:2px solid var(--k-hair-2);outline-offset:3px}
#${ID_BTN}.mn-btn-hidden{display:none}

/* ===== 悬浮面板 ===== */
#${ID_PANEL}{
  position:fixed; z-index:999999; right:16px; top:88px;
  width:560px;max-width:92vw;height:min(680px,78vh);
  display:none;flex-direction:column;overflow:hidden;border-radius:2px;
  border:1px solid var(--k-hair);
  background-color:var(--k-base);
  background-image:var(--k-tex),
    radial-gradient(120% 180% at 50% -60%,rgba(255,255,255,.06),transparent 62%),
    radial-gradient(118% 150% at 50% 50%,transparent 30%,rgba(0,0,0,.44) 100%),
    linear-gradient(180deg,#212127 0%,#121216 100%);
  background-size:128px 128px,auto,auto,auto;
  background-repeat:repeat,no-repeat,no-repeat,no-repeat;
  background-blend-mode:soft-light,normal,normal,normal;
  box-shadow:0 14px 38px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05);
  font-size:14px;line-height:1.75;text-align:left;
  user-select:none;-webkit-user-select:none;
}
#${ID_PANEL}.mn-open{display:flex;animation:mnFadeIn .18s cubic-bezier(.2,.8,.3,1)}
@keyframes mnFadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
/* 双轨细线：上下沿让开左右纹章，左右沿让开上下纹章 */
.mn-rails,.mn-rails-v{position:absolute;pointer-events:none;z-index:1;opacity:.9}
.mn-rails{left:48px;right:48px;top:0;bottom:0;
  background-image:var(--k-railh),var(--k-railh);
  background-repeat:no-repeat,no-repeat;
  background-size:100% 7px,100% 7px;
  background-position:0 7px,0 calc(100% - 7px)}
/* 顶端内缩取 78px：既要让开 43px 的角饰，也要让开 64px 的标题栏，取两者较大 */
.mn-rails-v{top:78px;bottom:58px;left:0;right:0;
  background-image:var(--k-railv),var(--k-railv);
  background-repeat:no-repeat,no-repeat;
  background-size:8px 100%,8px 100%;
  background-position:8px 0,calc(100% - 8px) 0}
.mn-cor{position:absolute;width:41px;height:43px;pointer-events:none;z-index:2;opacity:.92;
  background:var(--k-corner) center/100% 100% no-repeat;
  filter:drop-shadow(0 1px 2px rgba(0,0,0,.72))}
.mn-tl{left:1px;top:1px}
.mn-tr{right:1px;top:1px;transform:scaleX(-1)}
.mn-bl{left:1px;bottom:1px;transform:scaleY(-1)}
.mn-br{right:1px;bottom:1px;transform:scale(-1,-1)}

/* ===== 标题栏 ===== */
.mn-head{position:relative;z-index:3;flex-shrink:0;display:flex;align-items:center;gap:12px;
  min-height:74px;padding:12px 52px 22px;cursor:move;touch-action:none}
.mn-head::after{content:"";position:absolute;left:48px;right:48px;bottom:6px;height:7px;
  background:var(--k-railh) center/100% 100% no-repeat;opacity:.85}
.mn-head-copy{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px}
.mn-script{font-family:var(--k-ff-script);font-size:24px;line-height:1.05;color:#f7f8fc;
  text-shadow:0 1px 0 rgba(0,0,0,.7),0 0 18px rgba(240,242,248,.2)}
.mn-sub{font-size:12px;line-height:1.2;letter-spacing:.24em;color:var(--k-fg-dim)}
.mn-meta{flex-shrink:0;font-size:11.5px;letter-spacing:.1em;color:var(--k-fg-mute);
  font-variant-numeric:tabular-nums;white-space:nowrap}
.mn-tools{flex-shrink:0;display:flex;align-items:center;gap:8px}
/* 二级页：音声。两页都住在 .mn-body 里，靠 hidden 切换，滚动位置由 .mn-body 统一管 */
.mn-view[hidden]{display:none}
.mn-btn{flex-shrink:0;height:28px;padding:0 11px;border:1px solid rgba(246,246,250,.26);
  border-radius:1px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.01));
  color:var(--k-fg-dim);font-family:var(--k-ff-ui);font-size:12px;letter-spacing:.14em;
  line-height:1;cursor:pointer;-webkit-appearance:none;appearance:none;
  transition:color .18s,border-color .18s,background .18s}
.mn-btn:hover{color:#fff;border-color:rgba(246,246,250,.5)}
.mn-btn:focus-visible{outline:1px solid var(--k-hair-2);outline-offset:2px}
.mn-btn:active{transform:translateY(1px)}
/* 图标按钮：不写字只放 emoji，宽度省一半，手机端三个按钮才排得开 */
.mn-ico{padding:0 9px}
.mn-ico-glyph{display:block;font-size:14px;line-height:1;
  font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif}
/* 二级页开着时按钮点亮：位置不变、只换字，避免按下去按钮乱跑 */
.mn-btn[aria-pressed="true"]{color:#f8f2e2;border-color:rgba(211,178,105,.8);
  background:linear-gradient(180deg,rgba(211,178,105,.2),rgba(211,178,105,.05));
  box-shadow:0 0 12px rgba(211,178,105,.16),inset 0 1px 0 rgba(255,255,255,.06)}

/* ===== 正文 ===== */
.mn-body{position:relative;z-index:2;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;
  touch-action:pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;
  /* 底部留出 43px 角饰的高度：不留的话最后一行会滚到纹章下面 */
  padding:14px 34px 50px;user-select:text;-webkit-user-select:text}
.mn-body::-webkit-scrollbar{width:8px}
.mn-body::-webkit-scrollbar-track{background:rgba(255,255,255,.03)}
.mn-body::-webkit-scrollbar-thumb{background:rgba(232,232,238,.2)}
.mn-body::-webkit-scrollbar-thumb:hover{background:rgba(232,232,238,.36)}
.mn-empty{padding:34px 6px;text-align:center;color:var(--k-fg-mute);letter-spacing:.2em}

/* ===== 大块边界＝金线 ===== */
/* 环境条 */
.mn-env{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;padding:0 2px 4px;
  font-size:14px}
.mn-env-i{display:flex;align-items:center;gap:10px}
.mn-env-i+.mn-env-i::before{content:"";width:3px;height:3px;transform:rotate(45deg);
  background:var(--k-fg-mute);flex-shrink:0}
/* 分区标题 */
.mn-sec{margin-top:15px;min-width:0}
/* 金线是「块与块之间」的分隔：线在上、标题在下。环境条本身不带线，
   否则会和紧随其后的第一个分区标题各画一条、叠成双线 */
.mn-sec-head{display:flex;align-items:center;gap:9px;width:100%;max-width:100%;
  padding:8px 2px 7px;border-top:2px solid var(--k-gold-hair);
  color:var(--k-fg-dim);font-family:var(--k-ff-serif);font-size:13px;letter-spacing:.22em;
  text-align:left}
.mn-sec-name{flex-shrink:0}
.mn-sec-note{margin-left:auto;flex-shrink:0;font-size:11.5px;letter-spacing:.12em;color:var(--k-fg-mute);
  font-variant-numeric:tabular-nums;white-space:nowrap}
/* 人物之间的那一条金线：按人物切大块 */
.mn-cols{display:grid;grid-template-columns:1fr 1fr;gap:0;padding-top:11px}
.mn-cell{min-width:0;padding-right:24px}
.mn-cell+.mn-cell{border-left:2px solid var(--k-gold-hair);padding-left:24px;padding-right:0}
.mn-cell-name{font-size:15px;letter-spacing:.1em;color:#fff;margin-bottom:3px}
.mn-cell-state{color:var(--k-fg-dim);font-size:13px;line-height:1.6}

/* ===== 小块边界＝细线 ===== */
.mn-block+.mn-block{border-top:1px solid rgba(246,246,250,.13);
  margin-top:9px;padding-top:3px}
.mn-block-folds{padding-top:5px}
.mn-rel-target{padding:0 2px 3px;font-size:12.5px;letter-spacing:.16em;color:var(--k-fg-mute)}

/* 数值行 */
.mn-row{display:flex;align-items:center;gap:9px;padding:3px 4px;margin:0 -4px;
  transition:background-color .18s}
.mn-row:hover{background-color:rgba(211,178,105,.06)}
.mn-row:hover .mn-num{color:var(--k-gold-2)}
.mn-key{flex:0 1 auto;min-width:0;color:var(--k-fg-mute);font-size:13px;letter-spacing:.04em;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mn-bar{flex:1;min-width:34px;height:5px;background:var(--k-inset);
  box-shadow:inset 0 0 0 1px rgba(246,246,250,.16);overflow:hidden}
.mn-bar-fill{display:block;width:100%;height:100%;transform-origin:left center;
  transform:scaleX(var(--v,0));
  background:linear-gradient(90deg,rgba(201,204,214,.45),rgba(246,246,250,.9))}
.mn-num{flex-shrink:0;min-width:30px;text-align:right;color:var(--k-fg);
  font-variant-numeric:tabular-nums;font-size:13.5px;transition:color .2s}

/* 计数行（性经验：纯数字不画条） */
.mn-flat{display:flex;align-items:baseline;gap:10px;padding:2px 4px;margin:0 -4px;
  transition:background-color .18s}
.mn-flat:hover{background-color:rgba(211,178,105,.06)}
.mn-flat .mn-key{flex:1 1 auto;font-size:12.5px}
.mn-flat .mn-num{font-size:13px;min-width:26px}

/* 长文本（状态 / 立场 / 当前氛围）：标签一行、正文一行，不跟数字挤同一行 */
.mn-note{padding:3px 4px;margin:0 -4px}
.mn-note-k{font-size:12.5px;letter-spacing:.16em;color:var(--k-fg-mute)}
.mn-note-v{color:var(--k-fg-dim);font-size:13px;line-height:1.6}

/* 心里话：这张卡的双女主暗线，紧跟各自的状态 */
.mn-thought{margin-top:6px;color:var(--k-fg);font-size:13.5px;line-height:1.75}
.mn-thought::before{content:"「"}
.mn-thought::after{content:"」"}
.mn-thought::before,.mn-thought::after{color:var(--k-fg-mute)}

/* ===== 手风琴（身体开发 / 性经验） ===== */
.mn-acc+.mn-acc{margin-top:5px}
.mn-acc-head{display:flex;align-items:center;gap:9px;width:100%;padding:5px 2px;
  background:none;border:0;border-radius:0;color:var(--k-fg-dim);
  font-family:var(--k-ff-serif);font-size:12.5px;letter-spacing:.2em;text-align:left;
  cursor:pointer;-webkit-appearance:none;appearance:none;transition:color .18s}
.mn-acc-head:hover{color:#fff}
.mn-acc-head:focus-visible{outline:1px solid var(--k-hair-2);outline-offset:2px}
.mn-acc-name{flex-shrink:0}
.mn-acc-note{margin-left:auto;flex-shrink:0;font-size:11.5px;color:var(--k-fg-mute);
  font-variant-numeric:tabular-nums}
/* 菱形宝石：展开时点亮为金，与正文两条美化的状态指示同一套语言 */
.mn-gem{flex-shrink:0;width:8px;height:8px;transform:rotate(45deg);
  border:1px solid rgba(211,178,105,.7);
  background:linear-gradient(135deg,rgba(237,220,171,.7),rgba(211,178,105,.18));
  box-shadow:0 0 8px rgba(211,178,105,.25);transition:box-shadow .2s,border-color .2s}
.mn-acc.open .mn-gem{border-color:rgba(237,220,171,.95);
  box-shadow:0 0 12px rgba(211,178,105,.6),inset 0 0 0 1px rgba(0,0,0,.45)}
.mn-acc-body{display:none;padding:2px 0 5px 17px}
.mn-acc.open .mn-acc-body{display:block}

/* 「你」「三人关系」：不是对照关系，各占一幅 */
.mn-own{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;padding-top:9px}
.mn-own .mn-wide{grid-column:1 / -1}

/* 数值刚变动：闪一下金 —— 金色是状态色，只给「正在发生」用 */
.mn-changed{animation:mnFlash 1.9s ease-out}
@keyframes mnFlash{
  0%{background-color:rgba(211,178,105,.34);box-shadow:inset 0 0 0 1px rgba(237,220,171,.75)}
  60%{background-color:rgba(211,178,105,.12);box-shadow:inset 0 0 0 1px rgba(211,178,105,.22)}
  100%{background-color:transparent;box-shadow:none}}
.mn-changed .mn-num,.mn-changed.mn-thought{color:var(--k-gold-2)}

/* ===== 二级页：音声播放器 =====
   字幕用 fetch 自己解析，不用 <track>：跨域 <track> 会被 CORS 卡住，
   ::cue 能改的样式也太有限。图床确认带 Access-Control-Allow-Origin:*，这条路是通的。 */
/* 确认弹窗只有一小块字，贴着顶会在下面留一大片空黑，看着像没加载完。
   用 flex 居中 + 一档基于视口的 min-height：面板高度是脚本按屏算的，
   CSS 里推不出正文区实高，56vh 是实测三档视口下都不溢出、又接近正中的值
   （320×568 时 318px < 正文 330px；1280×900 时 504px < 538px） */
.mn-gate{display:flex;flex-direction:column;align-items:center;justify-content:center;
  min-height:min(56vh,520px);padding:14px 2px 22px;text-align:center}
.mn-gate-ico{font-size:36px;line-height:1;filter:drop-shadow(0 2px 7px rgba(0,0,0,.65));
  font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif}
.mn-gate-t{margin-top:14px;font-size:15px;letter-spacing:.22em;color:#f7f8fc}
.mn-gate-p{margin:11px 0 0;font-size:12.5px;line-height:1.9;color:var(--k-fg-dim);text-align:justify}
.mn-gate-btns{display:flex;justify-content:center;gap:10px;margin-top:18px;padding-bottom:4px}
.mn-gate .mn-btn{height:34px;padding:0 16px;font-size:12.5px}
.mn-btn-go{color:#f8f2e2;border-color:rgba(211,178,105,.62);
  background:linear-gradient(180deg,rgba(211,178,105,.2),rgba(211,178,105,.05))}
.mn-btn-go:hover{border-color:rgba(237,220,171,.9)}
/* 面板收起后声音还在放，缩略按钮上点一颗金点：
   否则「音乐在响但界面上找不到任何控制」会让人只能刷新页面 */
#${ID_BTN}.mn-audio-on::after{content:"";position:absolute;right:4px;top:4px;width:7px;height:7px;
  border-radius:50%;background:var(--k-gold-2);box-shadow:0 0 7px rgba(211,178,105,.85)}

/* 正在播的那一轨 */
.mn-now{display:flex;align-items:center;gap:8px;padding:0 2px;min-height:22px}
.mn-now-num{flex-shrink:0;font-size:11px;letter-spacing:.08em;color:var(--k-fg-mute);
  font-variant-numeric:tabular-nums}
/* 名称不占满整行：它后面还跟着开场白标注，标注要贴身跟着名称，
   不能被 flex:1 推到行尾去 */
.mn-now-title{flex:0 1 auto;min-width:0;font-size:14px;letter-spacing:.02em;color:#fff;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mn-now-tag{flex-shrink:0;margin-left:auto;padding:0 5px;border:1px solid rgba(246,246,250,.3);
  font-family:var(--k-ff-ui);font-size:10.5px;line-height:16px;letter-spacing:.1em;color:var(--k-fg-dim)}
.mn-now-tag[data-w="lia"]{border-color:rgba(211,178,105,.5);color:var(--k-gold-2)}
/* 开场白标注：贴着名称、比名称暗一档。它是人工标注，不是文件名的一部分，
   所以既不进 name 也不抢宽度（名称先省略，标注必须完整可读） */
.mn-now-pre,.mn-trk-p{flex-shrink:0;font-size:10.5px;letter-spacing:.02em;color:var(--k-fg-mute)}

/* 字幕窗：高度固定、不做内滚动 —— 触屏上嵌一个滚动区很难操作，
   位置全由脚本按当前句算出来（offsetTop − 半窗偏移），用户碰不到滚动条 */
.mn-cues{position:relative;height:104px;margin:9px 0 2px;overflow:hidden;
  -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 16%,#000 84%,transparent 100%);
  mask-image:linear-gradient(180deg,transparent 0,#000 16%,#000 84%,transparent 100%)}
/* 上下留白 =（窗高 − 单行高）/2：首句和末句也要能停在正中。留少了首句顶在窗顶，
   留多了首句会偏下 —— 滚不动的时候是没法靠 scrollTop 补偿的 */
.mn-cues-in{padding:41px 0}
.mn-cue{margin:0;font-size:13px;line-height:1.72;text-align:center;
  white-space:pre-line;color:var(--k-fg);opacity:.3;transition:opacity .32s,color .32s}
/* 已过去的句淡、未到的句更淡、当前句高亮 —— 纯靠兄弟选择器，不必逐句改类 */
.mn-cue.is-now{opacity:1;color:var(--k-gold-2);text-shadow:0 0 15px rgba(211,178,105,.22)}
.mn-cue.is-now~.mn-cue{opacity:.12}
.mn-cue-hint{color:var(--k-fg-mute);letter-spacing:.2em;opacity:.6}

/* 进度条 */
.mn-seek{position:relative;display:flex;align-items:center;height:26px;cursor:pointer;
  touch-action:none}
.mn-seek-bg,.mn-seek-fill{position:absolute;left:0;height:4px}
.mn-seek-bg{right:0;background:var(--k-inset);box-shadow:inset 0 0 0 1px rgba(246,246,250,.16)}
.mn-seek-fill{width:0;background:linear-gradient(90deg,rgba(201,204,214,.45),var(--k-gold-2))}
/* 菱形滑块：和正文环境条里那个分隔符同一个形状 */
.mn-seek-knob{position:absolute;left:0;width:9px;height:9px;margin-left:-4.5px;transform:rotate(45deg);
  background:var(--k-gold-2);box-shadow:0 0 9px rgba(211,178,105,.55)}
.mn-scrubbing .mn-seek-knob{width:13px;height:13px;margin-left:-6.5px;
  box-shadow:0 0 14px rgba(211,178,105,.85)}
.mn-times{display:flex;justify-content:space-between;margin-top:-3px;
  font-size:11px;letter-spacing:.08em;color:var(--k-fg-mute);font-variant-numeric:tabular-nums}

/* 传输键 */
.mn-ctrl{display:flex;align-items:center;justify-content:center;gap:24px;margin:9px 0 6px}
.mn-cbtn{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:0;
  background:none;color:var(--k-fg-dim);font-family:var(--k-ff-serif);font-size:21px;line-height:1;
  cursor:pointer;-webkit-appearance:none;appearance:none;transition:color .18s,transform .12s}
.mn-cbtn:hover{color:#fff}
.mn-cbtn:active{transform:translateY(1px)}
.mn-play{width:46px;height:46px;border-radius:50%;border:1px solid var(--k-gold-hair);color:var(--k-gold-2);
  background:radial-gradient(circle at 50% 28%,rgba(211,178,105,.16),rgba(211,178,105,.03))}
.mn-play:hover{color:var(--k-gold-2);border-color:rgba(237,220,171,.8);
  box-shadow:0 0 16px rgba(211,178,105,.2)}
/* 播放 / 暂停 / 载入三态靠父级类切换：按钮的位置和大小始终不动 */
.mn-ic-play{display:block;width:0;height:0;margin-left:4px;border-left:12px solid currentColor;
  border-top:7.5px solid transparent;border-bottom:7.5px solid transparent}
.mn-ic-pause{display:none;width:11px;height:13px;
  border-left:4px solid currentColor;border-right:4px solid currentColor}
.mn-ic-spin{display:none;width:15px;height:15px;border-radius:50%;
  border:2px solid rgba(246,246,250,.22);border-top-color:var(--k-gold-2);
  animation:mnSpin .8s linear infinite}
@keyframes mnSpin{to{transform:rotate(360deg)}}
.mn-playing .mn-ic-play{display:none}
.mn-playing .mn-ic-pause{display:block}
/* 缓冲中优先于播放中：等数据的时候给转圈 */
.mn-busy .mn-ic-play,.mn-busy .mn-ic-pause{display:none}
.mn-busy .mn-ic-spin{display:block}

/* 音轨列表 */
.mn-list{margin-top:10px;border-top:2px solid var(--k-gold-hair)}
.mn-list-h{display:flex;align-items:center;gap:8px;padding:9px 2px 7px;
  font-size:11px;letter-spacing:.24em;color:var(--k-fg-mute)}
.mn-list-note{margin-left:auto;letter-spacing:.08em}
.mn-trk{display:flex;align-items:center;gap:7px;width:100%;padding:8px 6px;
  border:0;border-bottom:1px solid rgba(246,246,250,.09);background:none;color:var(--k-fg-dim);
  font-family:var(--k-ff-ui);font-size:12.5px;line-height:1.5;text-align:left;cursor:pointer;
  transition:background-color .18s,color .18s}
.mn-trk:hover{background-color:rgba(255,255,255,.05);color:#fff}
/* 编号是名称的一部分（要和图床文件名对得上），只是单独着色。
   不设固定宽度：它带着「.」，固定宽度会在编号和名称之间顶出一条缝 */
.mn-trk-n{flex-shrink:0;font-size:10.5px;letter-spacing:.04em;color:var(--k-fg-mute);
  font-variant-numeric:tabular-nums}
.mn-trk-t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mn-trk-d{flex-shrink:0;font-size:10.5px;color:var(--k-fg-mute);font-variant-numeric:tabular-nums}
/* 正在播的那一轨：左侧金条 + 三根跳动的小柱 */
.mn-trk.is-on{color:#fff;
  background:linear-gradient(90deg,rgba(211,178,105,.17),rgba(211,178,105,.03) 62%,transparent);
  box-shadow:inset 2px 0 0 var(--k-gold)}
.mn-eq{display:none;flex-shrink:0;align-items:flex-end;gap:2px;width:11px;height:11px}
.mn-trk.is-on .mn-eq.is-live{display:flex}
.mn-eq i{flex:1;height:100%;background:var(--k-gold-2);transform-origin:bottom center;
  animation:mnEq .9s ease-in-out infinite}
.mn-eq i:nth-child(2){animation-delay:.3s}
.mn-eq i:nth-child(3){animation-delay:.15s}
@keyframes mnEq{0%,100%{transform:scaleY(.32)}50%{transform:scaleY(1)}}
/* 播放器里的控件都是「按键」，别让长按选中文字；字幕仍可选可复制 */
.mn-gate,.mn-now,.mn-ctrl,.mn-seek,.mn-times,.mn-trk,.mn-list-h{
  user-select:none;-webkit-user-select:none}

/* hidden 是这套面板切换视图的唯一手段，任何 display 声明都不该把它顶掉 */
#${ID_PANEL} [hidden]{display:none!important}
/* 变量读数不属于音声页。用 visibility 而不是 display：标题栏宽度不变，
   三个按钮不会因为切页而横移 */
.mn-on-audio .mn-meta{visibility:hidden}

/* ===== 手机端：半屏固定（拖动禁用），对照栏塌成单栏 ===== */
@media screen and (max-width:768px){
  #${ID_BTN}{right:12px;bottom:76px;width:48px;height:48px;border-radius:12px}
  .mn-meta{display:none}
  #${ID_PANEL}{font-size:13.5px}
  .mn-head{min-height:66px;padding:10px 44px 19px;gap:8px}
  .mn-script{font-size:19px}
  /* 标题右侧要放三个按钮，手机上把按钮和内边距都压一档才排得下 */
  .mn-tools{gap:6px}
  .mn-btn{height:26px;padding:0 8px;font-size:11px;letter-spacing:.04em}
  .mn-body{padding:12px 26px 46px}
  /* 手机端播放器：字幕窗压低一档，进度条触区加厚（视觉高度仍是 4px）。
     字幕窗高 96 对应的上下留白是 (96−单行 22)/2 = 37 */
  .mn-cues{height:96px;margin:8px 0 2px}
  .mn-cues-in{padding:37px 0}
  .mn-cue{font-size:12.5px}
  .mn-seek{height:30px}
  .mn-ctrl{gap:20px;margin:8px 0 4px}
  .mn-gate-p{font-size:12px;line-height:1.85}
  .mn-now-title{font-size:13.5px}
  .mn-trk{padding:9px 4px;font-size:12px}
  .mn-list-h{letter-spacing:.18em}
  .mn-cols{grid-template-columns:1fr;gap:14px}
  .mn-sec-note{display:none}
  /* 单栏时人物之间的金线改成横线：上下叠放，切成上下两块 */
  .mn-cell{padding-right:0}
  .mn-cell+.mn-cell{border-left:0;padding-left:0;border-top:2px solid var(--k-gold-hair);padding-top:14px}
  /* 单栏下数值行排成两列，否则一根进度条横跨整屏、数字离标签太远。
     这些行平时靠 -4px 负边距让悬停高亮铺满，在网格里会把格子撑宽，这里一并取消 */
  .mn-cell{display:grid;grid-template-columns:1fr 1fr;column-gap:16px;align-content:start}
  .mn-cell>.mn-cell-name,.mn-cell>.mn-cell-state,.mn-cell>.mn-thought,
  .mn-cell>.mn-block{grid-column:1 / -1}
  .mn-row,.mn-flat,.mn-note{margin:0}
  .mn-acc-body{padding-left:0}
  .mn-rails{left:42px;right:42px}
  .mn-rails-v{top:74px;bottom:52px}
}
/* 再窄就连压缩过的三个按钮也排不下：按钮组整组落到第二行，
   标题栏因此变高，竖轨顶端要跟着下移，否则会插进字里 */
@media screen and (max-width:356px){
  /* 标题占满第一行，按钮组整组落到第二行并右对齐：
     第一行只有标题（basis 100%），justify-content 不会影响它 */
  .mn-head{flex-wrap:wrap;justify-content:flex-end;min-height:0;padding:10px 44px 16px;gap:6px}
  .mn-head-copy{flex:1 1 100%}
  .mn-rails-v{top:96px}
}
@media (prefers-reduced-motion:reduce){
  #${ID_PANEL} *,#${ID_BTN} *{animation:none!important;transition:none!important}
}
</style>`;


  // ---------- 视口与移动端判定（iframe 自身尺寸不可靠，读顶层页面视口） ----------
  function viewport() {
    try {
      const vv = topWin.visualViewport;
      if (vv && vv.width && vv.height) return { w: Math.round(vv.width), h: Math.round(vv.height) };
    } catch (e) {
      /* 忽略 */
    }
    return { w: topWin.innerWidth || 0, h: topWin.innerHeight || 0 };
  }
  function isMobile() {
    return viewport().w <= 768;
  }

  // ---------- 变量读取（只读；四级兜底，空对象不算有效） ----------
  function normalizeStatData(candidate) {
    if (!candidate || typeof candidate !== 'object') return null;
    const sd = candidate.stat_data && typeof candidate.stat_data === 'object' ? candidate.stat_data : candidate;
    if (!sd || typeof sd !== 'object') return null;
    if (Object.keys(sd).length === 0) return null;
    // 必须包含本卡至少一个顶层键，避免把别的形状误认为有效变量
    for (let i = 0; i < ROOT_KEYS.length; i++) {
      if (sd[ROOT_KEYS[i]] !== undefined) return sd;
    }
    return null;
  }

  function getSafeMvuData() {
    const report = {};
    try {
      const mvu = topWin.Mvu;
      report.Mvu = mvu ? '有' : '无';
      if (mvu && typeof mvu.getMvuData === 'function') {
        const raw = mvu.getMvuData({ type: 'message', message_id: 'latest' });
        const sd = normalizeStatData(raw);
        report.getMvuData = sd ? '✓' : '✗';
        if (sd) return JSON.parse(JSON.stringify(sd));
      }
      if (mvu && typeof mvu.getCurrentMvuData === 'function') {
        const curr = mvu.getCurrentMvuData();
        const sd = normalizeStatData(curr);
        report.getCurrentMvuData = sd ? '✓' : '✗';
        if (sd) return JSON.parse(JSON.stringify(sd));
      }
    } catch (e) {
      console.warn('[魅魔牛状态栏] Mvu 读取异常', e);
    }
    try {
      if (typeof getVariables === 'function') {
        const sd = normalizeStatData(getVariables({ type: 'message', message_id: 'latest' }));
        report.getVariables = sd ? '✓' : '✗';
        if (sd) return JSON.parse(JSON.stringify(sd));
      } else {
        report.getVariables = '无此接口';
      }
    } catch (e) {
      /* 忽略 */
    }
    try {
      if (typeof getChatMessages === 'function' && typeof getCurrentMessageId === 'function') {
        const messages = getChatMessages(getCurrentMessageId());
        for (let i = 0; i < messages.length; i++) {
          if (messages[i] && messages[i].data) {
            const sd = normalizeStatData(messages[i].data);
            if (sd) return JSON.parse(JSON.stringify(sd));
          }
        }
        report.chatScan = '✗(未找到 stat_data)';
      } else {
        report.chatScan = '无此接口';
      }
    } catch (e) {
      /* 忽略 */
    }
    console.info('[魅魔牛状态栏] 变量读取诊断', report);
    return null;
  }

  // ---------- 小工具 ----------
  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isBranch(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  function leafCount(node) {
    let count = 0;
    Object.keys(node).forEach(function (key) {
      const value = node[key];
      count += isBranch(value) ? leafCount(value) : 1;
    });
    return count;
  }
  function timeText(timestamp) {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    const pad = function (n) {
      return String(n).padStart(2, '0');
    };
    return pad(date.getHours()) + ':' + pad(date.getMinutes());
  }
  function clampPercent(value) {
    const n = Number(value);
    if (!isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }
  function textValue(value, fallback) {
    const text = value === null || value === undefined ? '' : String(value).trim();
    return text || fallback || '';
  }
  // 展平成「路径 → 叶子值」，用来比对到底哪几项变了
  function flatten(node, prefix, out) {
    out = out || {};
    prefix = prefix || '';
    Object.keys(node).forEach(function (key) {
      const value = node[key];
      const path = prefix ? prefix + '.' + key : key;
      if (isBranch(value)) flatten(value, path, out);
      else out[path] = value;
    });
    return out;
  }

  // ---------- 渲染片段 ----------
  // changed 是「路径 → true」的表，逐行查自己的路径
  function barRow(key, value, path, changed) {
    const n = clampPercent(value);
    return (
      '<div class="mn-row' +
      (changed[path] ? ' mn-changed' : '') +
      '" data-p="' +
      esc(path) +
      '"><span class="mn-key">' +
      esc(key) +
      '</span><span class="mn-bar"><span class="mn-bar-fill" style="--v:' +
      n / 100 +
      '"></span></span><span class="mn-num">' +
      esc(n) +
      '</span></div>'
    );
  }
  function flatRow(key, value, path, changed) {
    const text = textValue(value, '—');
    return (
      '<div class="mn-flat' +
      (changed[path] ? ' mn-changed' : '') +
      '" data-p="' +
      esc(path) +
      '"><span class="mn-key">' +
      esc(key) +
      '</span><span class="mn-num">' +
      esc(text) +
      '</span></div>'
    );
  }
  function noteRow(key, value, path, changed) {
    const text = textValue(value);
    if (!text) return '';
    return (
      '<div class="mn-note' +
      (changed[path] ? ' mn-changed' : '') +
      '" data-p="' +
      esc(path) +
      '"><div class="mn-note-k">' +
      esc(key) +
      '</div><div class="mn-note-v">' +
      esc(text) +
      '</div></div>'
    );
  }

  // 环境：日期 / 时间 / 天气 / 地点 / 经过天数，空值自动不显示
  function envStrip(env) {
    if (!isBranch(env)) return '';
    const items = [];
    ['日期', '时间', '天气', '地点'].forEach(function (key) {
      const text = textValue(env[key]);
      if (text) items.push('<span class="mn-env-i">' + esc(text) + '</span>');
    });
    const days = Number(env.经过天数);
    if (isFinite(days) && days > 0) {
      items.push('<span class="mn-env-i">同居第 ' + esc(days) + ' 天</span>');
    }
    return items.length ? '<div class="mn-env">' + items.join('') + '</div>' : '';
  }

  // 手风琴：条目多的组折起来。展开状态记在 state.foldOpen，变量刷新重渲染后仍然保持
  function accordion(foldKey, label, rows) {
    if (!rows.length) return '';
    const open = !!state.foldOpen[foldKey];
    return (
      '<div class="mn-acc' +
      (open ? ' open' : '') +
      '" data-fold="' +
      esc(foldKey) +
      '"><button class="mn-acc-head" type="button" aria-expanded="' +
      (open ? 'true' : 'false') +
      '"><span class="mn-gem" aria-hidden="true"></span><span class="mn-acc-name">' +
      esc(label) +
      '</span><span class="mn-acc-note">' +
      rows.length +
      ' 项</span></button><div class="mn-acc-body">' +
      rows.join('') +
      '</div></div>'
    );
  }

  // 一位主角的一栏：状态 → 心里话 → 两组关系 → 身体开发 → 性经验
  // 组的边界用细线（小块），人物之间的边界交给 CSS 的金线（大块）
  function characterCell(ch, name, changed) {
    let head =
      '<div class="mn-cell-name">' +
      esc(name) +
      '</div>';
    if (!isBranch(ch)) return '<div class="mn-cell">' + head + '<div class="mn-cell-state">—</div></div>';

    const state = textValue(ch.状态);
    if (state) head += '<div class="mn-cell-state">' + esc(state) + '</div>';
    const thoughtPath = name + '.内心独白';
    const thought = textValue(ch.内心独白);
    head +=
      '<div class="mn-thought' +
      (changed[thoughtPath] ? ' mn-changed' : '') +
      '" data-p="' +
      esc(thoughtPath) +
      '">' +
      (thought ? esc(thought) : '（暂无）') +
      '</div>';

    // 关系：每个「对 X」是一个小块，块间细线
    const blocks = [];
    Object.keys(ch).forEach(function (targetKey) {
      if (targetKey.indexOf('对') !== 0 || !isBranch(ch[targetKey])) return;
      const group = ch[targetKey];
      const rows = Object.keys(group).map(function (dim) {
        return barRow(dim, group[dim], name + '.' + targetKey + '.' + dim, changed);
      });
      if (!rows.length) return;
      blocks.push(
        '<div class="mn-block"><div class="mn-rel-target">对 ' +
          esc(targetKey.slice(1)) +
          '</div>' +
          rows.join('') +
          '</div>',
      );
    });

    // 身体开发 / 性经验：折起来，块内细线由 .mn-block 负责
    const folds = [];
    FOLD_GROUPS.forEach(function (spec) {
      const group = isBranch(ch[spec.key]) ? ch[spec.key] : null;
      if (!group) return;
      const rows = Object.keys(group).map(function (key) {
        const path = name + '.' + spec.key + '.' + key;
        return spec.mode === 'bar'
          ? barRow(key, group[key], path, changed)
          : flatRow(key, group[key], path, changed);
      });
      folds.push(accordion(name + '.' + spec.key, spec.key, rows));
    });
    if (folds.length) blocks.push('<div class="mn-block mn-block-folds">' + folds.join('') + '</div>');

    return '<div class="mn-cell">' + head + blocks.join('') + '</div>';
  }

  // 「你」「三人关系」：不是对照关系，各占一幅；标题下走一条金线（大块边界）
  function ownSection(spec, sd, changed) {
    const src = sd[spec.root];
    if (!isBranch(src)) return '';
    const rows = [];
    spec.bars.forEach(function (key) {
      if (src[key] !== undefined) rows.push(barRow(key, src[key], spec.root + '.' + key, changed));
    });
    const notes = [];
    spec.texts.forEach(function (key) {
      const row = noteRow(key, src[key], spec.root + '.' + key, changed);
      if (row) notes.push(row);
    });
    let grid = rows.join('');
    if (notes.length) grid += '<div class="mn-wide">' + notes.join('') + '</div>';
    let html = grid ? '<div class="mn-own">' + grid + '</div>' : '';
    spec.folds.forEach(function (fold) {
      const group = isBranch(src[fold.key]) ? src[fold.key] : null;
      if (!group) return;
      const keys = Object.keys(group);
      const foldKey = spec.root + '.' + fold.key;
      const body = keys.map(function (key) {
        const path = foldKey + '.' + key;
        return fold.mode === 'bar'
          ? barRow(key, group[key], path, changed)
          : flatRow(key, group[key], path, changed);
      });
      html += accordion(foldKey, fold.key, body);
    });
    if (!html) return '';
    return (
      '<section class="mn-sec"><div class="mn-sec-head"><span class="mn-sec-name">' +
      esc(spec.title) +
      '</span></div>' +
      html +
      '</section>'
    );
  }

  // ---------- 全局状态 ----------
  const state = {
    sd: null,
    open: false,
    view: 'main', // 'main' 变量页 / 'audio' 音声二级页
    updatedAt: 0,
    foldOpen: {},
    changed: {},
    pending: {},
    flashTimer: null,
  };
  let $panel = null;
  let $btn = null;
  let lastKey = '';

  function readSavedPos(key) {
    try {
      const saved = JSON.parse(lsGet(key) || 'null');
      if (saved && isFinite(saved.left) && isFinite(saved.top)) return saved;
    } catch (e) {
      /* 忽略 */
    }
    return null;
  }

  // ---------- 渲染 ----------
  function buildBody() {
    const sd = state.sd;
    const changed = state.changed;
    // 大块一：场景摘要
    let html = envStrip(sd.环境);
    // 大块二：两位主角左右对照，栏内按「状态 → 心里话 → 关系 → 身体开发 → 性经验」自上而下
    const people = PAIR.map(function (name) {
      return characterCell(sd[name], name, changed);
    }).join('');
    html +=
      '<section class="mn-sec mn-sec-people"><div class="mn-sec-head">' +
      '<span class="mn-sec-name">' +
      PAIR.join(' · ') +
      '</span><span class="mn-sec-note">好感 / 依赖 / 支配</span></div>' +
      '<div class="mn-cols">' +
      people +
      '</div></section>';
    // 大块三、四：你 / 三人关系
    html += ownSection(OWN_SPEC, sd, changed);
    html += ownSection(TRIO_SPEC, sd, changed);
    return html || '<div class="mn-empty">暂无可显示的变量</div>';
  }

  function renderContent() {
    if (!$panel || !$panel.length) return;
    if (!state.sd) {
      $panel.find('.mn-meta').text('等待初始化…');
      $panel.find('.mn-view-main').html('<div class="mn-empty">等待变量初始化…</div>');
      return;
    }
    $panel.find('.mn-meta').text(timeText(state.updatedAt) + ' · ' + leafCount(state.sd) + ' 项');
    const body = $panel.find('.mn-body');
    const scrollTop = body.scrollTop();
    // 只重画主视图：音声页是另一套结构，重画不该把用户从二级页里踢出来，
    // 也不该打断正在放的音频
    body.find('.mn-view-main').html(buildBody());
    body.scrollTop(scrollTop);
  }

  // 比对出真正变了的路径；面板关着时攒起来，展开时再一起点亮
  function diffAndStage(next, silent) {
    const nextFlat = flatten(next);
    const prevFlat = state.sd ? flatten(state.sd) : null;
    const changed = {};
    if (prevFlat) {
      Object.keys(nextFlat).forEach(function (path) {
        if (String(nextFlat[path]) !== String(prevFlat[path])) changed[path] = true;
      });
    }
    const paths = Object.keys(changed);
    if (!paths.length) return;
    if (silent || !state.open) {
      paths.forEach(function (path) {
        state.pending[path] = true;
      });
      return;
    }
    state.changed = changed;
    state.pending = {};
    scheduleClearFlash();
  }

  function refresh(force) {
    if (!$panel) return;
    const sd = getSafeMvuData();
    if (!sd) {
      if (force && !state.sd) renderContent();
      return;
    }
    const key = JSON.stringify(sd);
    if (!force && key === lastKey) return;
    diffAndStage(sd, false);
    lastKey = key;
    state.sd = JSON.parse(key);
    state.updatedAt = Date.now();
    console.info('[魅魔牛状态栏] 全部变量', state.sd);
    renderContent();
  }

  function scheduleClearFlash() {
    if (state.flashTimer) clearTimeout(state.flashTimer);
    state.flashTimer = setTimeout(function () {
      state.flashTimer = null;
      state.changed = {};
      if (!$panel) return;
      $panel.find('.mn-changed').removeClass('mn-changed');
    }, 2100);
  }

  // ---------- 二级页：音声播放器 ----------
  const audio = {
    el: null, // <audio>：挂在 body 上但 display:none。放内存里的话 iOS 上偶发不出声
    idx: -1, // 当前轨序，-1 表示还没选轨
    cues: [], // 当前轨字幕，按开始时间排好
    cueAt: -1, // 已经高亮的句序，用来避免每帧都碰 DOM
    hint: '', // 字幕没到／失败时字幕窗里的占位文案
    gate: true, // 耳机提示还没确认过
    dragging: false,
    seekR: 0, // 拖动进度条时的预览比例
    busy: false,
    seq: 0, // 切轨序号：异步回来的字幕用它判断自己是否已经过期
    raf: null,
    dead: false, // 已拆除：此后所有媒体事件都要当噪音丢掉
    msReady: false,
  };

  // 已解析的字幕按轨缓存：一份只要几 KB，换来切轨时字幕瞬时出现
  const VTT_CACHE = new Array(TRACKS.length).fill(null);
  let prefetchTimer = null;

  // 毫秒位数不固定（.68 与 .680 都合法），先补齐三位再换算
  function vttSec(h, m, s, ms) {
    return +h * 3600 + +m * 60 + +s + +(ms + '00').slice(0, 3) / 1000;
  }

  // 本作字幕是纯文本、无内联标签、无 cue 设置，只取时间轴与文本即可
  function parseVtt(text) {
    const out = [];
    const blocks = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n\n');
    for (let b = 0; b < blocks.length; b++) {
      const lines = blocks[b].split('\n');
      let head = -1;
      for (let l = 0; l < lines.length; l++) {
        if (lines[l].indexOf('-->') >= 0) {
          head = l;
          break;
        }
      }
      if (head < 0) continue;
      const m = /(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})/.exec(
        lines[head],
      );
      if (!m) continue;
      const txt = lines.slice(head + 1).join('\n').trim();
      if (!txt) continue;
      out.push({ s: vttSec(m[1], m[2], m[3], m[4]), t: txt });
    }
    out.sort(function (a, b) {
      return a.s - b.s;
    });
    return out;
  }

  function mmss(value) {
    if (!isFinite(value) || value < 0) return '--:--';
    const t = Math.floor(value);
    return (t < 600 ? '0' : '') + Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2);
  }

  // 音轨表里的 'mm:ss' 换算成秒。元素还没报出真实时长时（刚换源、元数据在路上），
  // 先用它把进度条撑住 —— 不然那几秒里进度条会杵在 0%，看着像跳回开头了
  function trackDurSec(track) {
    const m = track && /^(\d+):(\d{2})$/.exec(track.dur);
    return m ? +m[1] * 60 + +m[2] : 0;
  }

  function isPlaying() {
    return !!(audio.el && !audio.el.paused && !audio.el.ended);
  }

  function ensureAudioEl() {
    // 拆除过的实例再挂回来时，媒体事件要重新受理
    audio.dead = false;
    if (audio.el) return audio.el;
    const el = topDoc.createElement('audio');
    el.id = ID_AUDIO;
    el.preload = 'none';
    el.setAttribute('playsinline', ''); // iOS 上不要弹全屏播放器
    el.style.display = 'none';
    el.addEventListener('play', function () {
      if (audio.dead) return;
      paintTransport();
      tick(true);
      syncSession();
    });
    el.addEventListener('pause', function () {
      if (audio.dead) return;
      paintTransport();
      tick(false);
      syncSession();
    });
    el.addEventListener('ended', function () {
      if (audio.dead) return;
      paintTransport();
      tick(false);
      // 播完自动接下一轨。到最后一轨就停下不做循环 —— 循环会让人以为还没放完
      if (audio.idx >= 0 && audio.idx < TRACKS.length - 1) loadTrack(audio.idx + 1, true);
    });
    el.addEventListener('timeupdate', function () {
      if (audio.dead) return;
      paintProgress();
      paintCue(false);
    });
    el.addEventListener('loadedmetadata', function () {
      if (audio.dead) return;
      paintProgress();
    });
    el.addEventListener('waiting', function () {
      if (audio.dead) return;
      setBusy(true);
    });
    el.addEventListener('playing', function () {
      if (audio.dead) return;
      setBusy(false);
    });
    el.addEventListener('canplay', function () {
      if (audio.dead) return;
      setBusy(false);
    });
    el.addEventListener('error', function () {
      if (audio.dead) return; // 拆除时清 src 也会触发一次 error，那不是故障
      setBusy(false);
      paintTransport();
      if ($panel && $panel.length) {
        $panel.find('.mn-now-title').text('音频加载失败，检查网络后重试');
      }
    });
    topDoc.body.appendChild(el);
    audio.el = el;
    return el;
  }

  function setBusy(on) {
    audio.busy = !!on;
    if (!$panel || !$panel.length) return;
    $panel.find('.mn-player').toggleClass('mn-busy', audio.busy);
  }

  function paintTransport() {
    const playing = isPlaying();
    if ($panel && $panel.length) {
      $panel.find('.mn-player').toggleClass('mn-playing', playing);
      $panel.find('#mn-play').attr('aria-label', playing ? '暂停' : '播放');
    }
    if ($btn && $btn.length) $btn.toggleClass('mn-audio-on', playing);
    paintList(playing);
  }

  function paintList(playing) {
    if (!$panel || !$panel.length) return;
    $panel.find('.mn-trk').removeClass('is-on').removeAttr('aria-current');
    $panel.find('.mn-eq').removeClass('is-live');
    if (audio.idx < 0) return;
    const $row = $panel.find('.mn-trk[data-i="' + audio.idx + '"]');
    $row.addClass('is-on').attr('aria-current', 'true');
    if (playing) $row.find('.mn-eq').addClass('is-live');
  }

  function paintNow() {
    const track = TRACKS[audio.idx];
    if (!$panel || !$panel.length || !track) return;
    const p = trackParts(track);
    $panel.find('.mn-now-num').text(p.num);
    $panel
      .find('.mn-now-title')
      .text(p.rest)
      .attr('title', track.name);
    $panel.find('.mn-now-pre').text(track.pre ? '（' + track.pre + '）' : '');
    $panel
      .find('.mn-now-tag')
      .prop('hidden', false)
      .attr('data-w', track.who)
      .text(WHO[track.who].label);
    $panel.find('.mn-t-cur').text('00:00');
    $panel.find('.mn-t-dur').text(track.dur);
    $panel.find('.mn-seek-fill').css('width', '0%');
    $panel.find('.mn-seek-knob').css('left', '0%');
    $panel.find('.mn-seek').attr('aria-valuenow', 0);
    setBusy(false);
  }

  function paintProgress() {
    if (!$panel || !$panel.length) return;
    const el = audio.el;
    const track = TRACKS[audio.idx];
    const real = el && isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    // 真实时长优先；元数据还没到就退回音轨表的标称时长，进度条先有个正确的位置
    const dur = real || trackDurSec(track);
    const cur = el ? el.currentTime || 0 : 0;
    if (!audio.dragging) {
      const r = dur ? Math.min(1, cur / dur) : 0;
      $panel.find('.mn-seek-fill').css('width', (r * 100).toFixed(2) + '%');
      $panel.find('.mn-seek-knob').css('left', (r * 100).toFixed(2) + '%');
      $panel.find('.mn-t-cur').text(mmss(cur));
      $panel.find('.mn-seek').attr('aria-valuenow', Math.round(r * 100));
    }
    $panel.find('.mn-t-dur').text(dur ? mmss(dur) : '00:00');
  }

  // 返回「最后一条已经开始的字幕」。落在两句之间的空档时仍返回前一句，
  // 这样空档里画面不会突然空掉（本作的空档多在 1~3 秒）
  function cueIndexAt(t) {
    const c = audio.cues;
    let lo = 0;
    let hi = c.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (c[mid].s <= t) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  }

  function renderCues() {
    if (!$panel || !$panel.length) return;
    const $box = $panel.find('.mn-cues');
    const $in = $box.find('.mn-cues-in');
    if (!$in.length) return;
    audio.cueAt = -1;
    if (!audio.cues.length) {
      $in.html(
        '<p class="mn-cue mn-cue-hint">' +
          esc(audio.hint || (audio.idx < 0 ? '从下面选一轨' : '字幕加载中…')) +
          '</p>',
      );
      $box.scrollTop(0);
      return;
    }
    $in.html(
      audio.cues
        .map(function (c, i) {
          return '<p class="mn-cue" data-i="' + i + '">' + esc(c.t) + '</p>';
        })
        .join(''),
    );
    paintCue(true);
  }

  function paintCue(hard) {
    if (!$panel || !$panel.length) return;
    const el = audio.el;
    const i = cueIndexAt(el ? el.currentTime || 0 : 0);
    if (i === audio.cueAt && !hard) return;
    audio.cueAt = i;
    const $box = $panel.find('.mn-cues');
    const $in = $box.find('.mn-cues-in');
    $in.find('.mn-cue.is-now').removeClass('is-now');
    if (i < 0) {
      $box.scrollTop(0);
      return;
    }
    const $now = $in.find('.mn-cue[data-i="' + i + '"]');
    if (!$now.length) return;
    $now.addClass('is-now');
    // 当前句垂直居中。offsetTop 相对 .mn-cues（它是最近的定位祖先），已含
    // .mn-cues-in 的上下留白，所以首句也能停在正中
    const node = $now[0];
    const box = $box[0];
    box.scrollTop = Math.max(0, node.offsetTop - (box.clientHeight - node.offsetHeight) / 2);
  }

  function tick(on) {
    if (audio.raf) {
      topWin.cancelAnimationFrame(audio.raf);
      audio.raf = null;
    }
    if (!on || audio.dead) return;
    const frame = function () {
      audio.raf = null;
      if (audio.dead || !isPlaying()) return;
      // 字幕要跟手，timeupdate 只有 4Hz（手机更低），够不上逐句对齐，
      // 所以播放期间自己按帧推进；标签页不可见时 rAF 会停，回到前台由 timeupdate 对上
      paintProgress();
      paintCue(false);
      audio.raf = topWin.requestAnimationFrame(frame);
    };
    audio.raf = topWin.requestAnimationFrame(frame);
  }

  function playEl() {
    const el = ensureAudioEl();
    const p = el.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function (err) {
        // AbortError 是「换源或暂停把这次 play 打断了」，属于正常流程（连点两轨就有）。
        // 这种时候更不能去动播放状态：新那一轨可能正在缓冲，把它的转圈清掉就成了假象 ——
        // 用户会看到播放键像没反应，其实只是在等数据。
        if (!err || err.name === 'AbortError') return;
        // 剩下的是真的没起来（自动播放策略拒绝、没有可用源等），要让界面说实话
        setBusy(false);
        paintTransport();
        console.warn('[魅魔牛状态栏] 播放没起来', err);
      });
    }
  }

  function togglePlay() {
    if (audio.idx < 0) {
      loadTrack(0, true);
      return;
    }
    const el = ensureAudioEl();
    if (el.paused || el.ended) {
      if (el.ended) el.currentTime = 0;
      playEl();
    } else {
      el.pause();
    }
  }

  function stepTrack(dir) {
    if (audio.idx < 0) {
      loadTrack(0, true);
      return;
    }
    const n = TRACKS.length;
    loadTrack((audio.idx + dir + n) % n, true);
  }

  // 取字幕（带缓存）。seq 让快速连点时过期的响应自己作废，不会串轨
  function fetchCues(i) {
    if (VTT_CACHE[i]) return Promise.resolve(VTT_CACHE[i]);
    const url = AUDIO_BASE + encodeURIComponent(TRACKS[i].file) + '.vtt';
    return topWin
      .fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        const cues = parseVtt(text);
        if (!cues.length) throw new Error('解析后没有字幕');
        VTT_CACHE[i] = cues;
        return cues;
      });
  }

  // 备齐字幕。11 份加起来不到 100KB，而每切一次轨都要现场取一次 ——
  // 音频流会把这几十 KB 的请求挤在后面，实测切轨时字幕要等十几秒才到。
  // 进音声页后按顺序把没缓存的预先取回来，之后切轨就是瞬时的。
  // 一次只发一条、中间留间隔：不跟正在流的音频抢连接。
  function prefetchVtt() {
    let i = 0;
    const next = function () {
      prefetchTimer = null;
      // 面板收起不打断：一共就几十 KB，备完了下次切轨立刻有字幕；
      // 中途停下反而会让「收起面板听歌、回头再换一轨」又等一次
      if (audio.dead) return;
      while (i < TRACKS.length && (VTT_CACHE[i] || i === audio.idx)) i++;
      if (i >= TRACKS.length) return;
      const k = i++;
      fetchCues(k)
        .catch(function () {
          /* 单份失败就算了，真正播到那一轨时会再取一次并给出提示 */
        })
        .then(function () {
          if (audio.dead) return;
          prefetchTimer = setTimeout(next, 350);
        });
    };
    if (prefetchTimer) clearTimeout(prefetchTimer);
    prefetchTimer = setTimeout(next, 1500);
  }

  // 切轨：换源 → 立刻摆出「加载中」的字幕位 → 取字幕
  function loadTrack(i, autoplay) {
    if (i < 0 || i >= TRACKS.length) return;
    const el = ensureAudioEl();
    const track = TRACKS[i];
    const seq = ++audio.seq;
    const base = AUDIO_BASE + encodeURIComponent(track.file);
    audio.idx = i;
    audio.cues = VTT_CACHE[i] || [];
    audio.cueAt = -1;
    audio.hint = '';
    // 先发字幕请求再挂音频源：反过来的话，几十兆的音频流会先占住连接，
    // 几 KB 的字幕反而被排到后面（手机上能明显看到「字幕加载中」挂好几秒）
    const vtt = fetchCues(i)
      .then(function (cues) {
        if (seq !== audio.seq || audio.dead) return;
        audio.cues = cues;
        renderCues();
      })
      .catch(function (err) {
        if (seq !== audio.seq || audio.dead) return;
        audio.hint = '字幕加载失败（不影响播放）';
        renderCues();
        console.warn('[魅魔牛状态栏] 字幕没取到', base + '.vtt', err);
      });
    el.src = base;
    paintNow();
    paintList(false);
    renderCues();
    if (autoplay) {
      setBusy(true);
      playEl();
    }
    syncSession();
    return vtt;
  }

  function seekRatio(clientX) {
    const $s = $panel.find('.mn-seek');
    if (!$s.length) return 0;
    const r = $s[0].getBoundingClientRect();
    if (!r.width) return 0;
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  }

  function paintSeekPreview() {
    const el = audio.el;
    const dur = el && isFinite(el.duration) ? el.duration : 0;
    $panel.find('.mn-seek-fill').css('width', (audio.seekR * 100).toFixed(2) + '%');
    $panel.find('.mn-seek-knob').css('left', (audio.seekR * 100).toFixed(2) + '%');
    if (dur > 0) $panel.find('.mn-t-cur').text(mmss(audio.seekR * dur));
    $panel.find('.mn-seek').attr('aria-valuenow', Math.round(audio.seekR * 100));
  }

  // 锁屏 / 耳机线控：手机上这是「能不能当播放器用」的关键。全部 try 包住，
  // 不支持的 action 在个别浏览器上会直接抛
  function syncSession() {
    const ms = topWin.navigator && topWin.navigator.mediaSession;
    if (!ms) return;
    const track = TRACKS[audio.idx];
    try {
      if (track && topWin.MediaMetadata) {
        ms.metadata = new topWin.MediaMetadata({
          title: track.title,
          artist: WHO[track.who].label,
          album: '魅魔牛 · 音声',
        });
      }
    } catch (e) {
      /* 忽略 */
    }
    try {
      ms.playbackState = isPlaying() ? 'playing' : audio.idx >= 0 ? 'paused' : 'none';
    } catch (e) {
      /* 忽略 */
    }
    if (audio.msReady) return;
    audio.msReady = true;
    const bind = function (name, fn) {
      try {
        ms.setActionHandler(name, fn);
      } catch (e) {
        /* 该 action 不支持 */
      }
    };
    bind('play', playEl);
    bind('pause', function () {
      if (audio.el) audio.el.pause();
    });
    bind('stop', function () {
      if (audio.el) audio.el.pause();
    });
    bind('nexttrack', function () {
      stepTrack(1);
    });
    bind('previoustrack', function () {
      stepTrack(-1);
    });
  }

  function clearSession() {
    const ms = topWin.navigator && topWin.navigator.mediaSession;
    audio.msReady = false;
    if (!ms) return;
    try {
      ms.metadata = null;
      ms.playbackState = 'none';
    } catch (e) {
      /* 忽略 */
    }
    ['play', 'pause', 'stop', 'nexttrack', 'previoustrack'].forEach(function (name) {
      try {
        ms.setActionHandler(name, null);
      } catch (e) {
        /* 忽略 */
      }
    });
  }

  // 耳机提示只在「还没开始听」时挡路。返回不算确认，下次进来还会提醒；
  // 已经选过轨（在播或暂停在半途）就不再拦 —— 每次进来都挡一道会变成骚扰
  function renderAudioView() {
    if (!$panel || !$panel.length) return;
    $panel.find('.mn-gate').prop('hidden', !audio.gate);
    $panel.find('.mn-player').prop('hidden', audio.gate);
    if (audio.gate) return;
    paintNow();
    paintProgress();
    paintTransport();
    renderCues();
  }

  // ---------- 二级页切换 ----------
  function setView(view) {
    if (!$panel || !$panel.length) return;
    state.view = view === 'audio' ? 'audio' : 'main';
    const au = state.view === 'audio';
    $panel.find('.mn-view-main').prop('hidden', au);
    $panel.find('.mn-view-audio').prop('hidden', !au);
    // 按钮是图标，不换字：靠点亮状态 + 标题栏文案表明「已经在二级页里」
    $panel
      .find('#mn-nav-audio')
      .attr('aria-pressed', au ? 'true' : 'false')
      .attr('aria-label', au ? '返回变量页' : '音声')
      .attr('title', au ? '回到变量页' : '打开音声播放器');
    $panel.find('.mn-script').text(au ? 'Voice' : 'Variables');
    $panel.find('.mn-sub').text(au ? '音声' : '变量');
    // 右上角那个「更新于 / N 项」是变量页的读数，音声页上留着会让人以为在说音频
    $panel.toggleClass('mn-on-audio', au);
    renderAudioView();
    $panel.find('.mn-body').scrollTop(0);
  }

  // ---------- 展开逻辑：桌面悬浮可拖动 / 手机半屏固定 ----------
  function placePanel() {
    if (!$panel || !$panel.length) return;
    const vp = viewport();
    const panel = $panel[0];
    panel.style.left = '';
    panel.style.right = '';
    panel.style.top = '';
    panel.style.bottom = '';
    panel.style.width = '';
    panel.style.height = '';
    panel.style.maxWidth = '';

    if (isMobile()) {
      const pw = Math.max(240, vp.w - 16);
      // 手机端贴着底部当抽屉用：0.58 屏高只能看五六行，正文一多就得一直滚
      const ph = Math.round(vp.h * 0.8);
      // CSS 里那条 max-width:92vw 比这里的 100vw-16 更窄，会把面板压窄并挤到左边
      panel.style.maxWidth = 'none';
      panel.style.width = pw + 'px';
      panel.style.height = ph + 'px';
      panel.style.left = '8px';
      panel.style.top = Math.max(4, vp.h - ph - 8) + 'px';
      return;
    }

    const PW = Math.min(560, vp.w - 28);
    const PH = Math.min(680, vp.h - 28);
    panel.style.width = PW + 'px';
    panel.style.height = PH + 'px';
    const saved = readSavedPos(LS_PANEL_POS);
    if (saved) {
      panel.style.left = Math.max(4, Math.min(saved.left, vp.w - PW - 4)) + 'px';
      panel.style.top = Math.max(4, Math.min(saved.top, vp.h - PH - 4)) + 'px';
      return;
    }
    panel.style.left = Math.max(4, vp.w - PW - 16) + 'px';
    panel.style.top = '88px';
  }

  function setOpen(open) {
    if (state.open === open || !$panel || !$btn) return;
    state.open = open;
    $panel.toggleClass('mn-open', open);
    $btn.toggleClass('mn-btn-hidden', open); // 展开时隐藏缩略按钮（互斥）
    $panel.attr('aria-hidden', open ? 'false' : 'true');
    if (open) {
      setView('main'); // 每次展开都从变量页开始，上次停在音声页不该带到这次
      // 关着期间攒下的变动，展开时一次性点亮 —— 展开本来就是为了看「刚才变了什么」
      if (Object.keys(state.pending).length) {
        state.changed = state.pending;
        state.pending = {};
        scheduleClearFlash();
      }
      placePanel();
      renderContent();
    }
  }

  // ---------- 缩略按钮拖动（拖动只移动，单击展开/收起） ----------
  function makeBtnDraggable() {
    const el = $btn && $btn[0];
    if (!el) return;
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let initX = 0;
    let initY = 0;

    const saved = readSavedPos(LS_BTN_POS);
    if (saved) {
      // 保存位置钳制进当前视口（手机视口小，PC 上保存的坐标可能落在屏幕外）
      const vp = viewport();
      const maxX = Math.max(0, vp.w - (el.offsetWidth || 52));
      const maxY = Math.max(0, vp.h - (el.offsetHeight || 52));
      el.style.left = Math.max(0, Math.min(saved.left, maxX)) + 'px';
      el.style.top = Math.max(0, Math.min(saved.top, maxY)) + 'px';
      el.style.right = 'auto';
    }

    el.addEventListener('pointerdown', function (e) {
      dragging = true;
      moved = false;
      const rect = el.getBoundingClientRect();
      initX = rect.left;
      initY = rect.top;
      startX = e.clientX;
      startY = e.clientY;
      el.style.transition = 'none';
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      if (!moved) return;
      const vp = viewport();
      const maxX = Math.max(0, vp.w - el.offsetWidth);
      const maxY = Math.max(0, vp.h - el.offsetHeight);
      el.style.left = Math.max(0, Math.min(initX + dx, maxX)) + 'px';
      el.style.top = Math.max(0, Math.min(initY + dy, maxY)) + 'px';
      el.style.right = 'auto';
    });
    el.addEventListener('pointerup', function (e) {
      if (!dragging) return;
      dragging = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* 忽略 */
      }
      el.style.transition = '';
      if (moved) {
        lsSet(
          LS_BTN_POS,
          JSON.stringify({ left: Math.round(parseFloat(el.style.left)), top: Math.round(parseFloat(el.style.top)) }),
        );
      } else {
        setOpen(!state.open);
      }
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(!state.open);
      }
    });
  }

  // ---------- 面板拖动（按住顶栏移动；手机端禁用） ----------
  function makePanelDraggable() {
    const panel = $panel && $panel[0];
    if (!panel) return;
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let initX = 0;
    let initY = 0;

    panel.addEventListener('pointerdown', function (e) {
      if (isMobile()) return;
      if (!$(e.target).closest('.mn-head').length) return;
      if ($(e.target).closest('.mn-btn').length) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      initX = panel.offsetLeft;
      initY = panel.offsetTop;
      panel.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    panel.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      if (!moved) return;
      const vp = viewport();
      const maxX = Math.max(4, vp.w - panel.offsetWidth - 4);
      const maxY = Math.max(4, vp.h - panel.offsetHeight - 4);
      panel.style.left = Math.max(4, Math.min(initX + dx, maxX)) + 'px';
      panel.style.top = Math.max(4, Math.min(initY + dy, maxY)) + 'px';
      panel.style.right = 'auto';
    });
    const endDrag = function (e) {
      if (!dragging) return;
      dragging = false;
      try {
        panel.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* 忽略 */
      }
      if (moved) {
        lsSet(
          LS_PANEL_POS,
          JSON.stringify({
            left: Math.round(parseFloat(panel.style.left)),
            top: Math.round(parseFloat(panel.style.top)),
          }),
        );
      }
    };
    panel.addEventListener('pointerup', endDrag);
    panel.addEventListener('pointercancel', endDrag);
  }

  // 按钮位置兜底：旋转/缩放后若落在屏幕外，拖回可视区
  function clampBtnIntoViewport() {
    const el = $btn && $btn[0];
    if (!el || !el.offsetWidth) return;
    const vp = viewport();
    const rect = el.getBoundingClientRect();
    if (rect.left >= -4 && rect.top >= -4 && rect.right <= vp.w + 4 && rect.bottom <= vp.h + 4) return;
    const curL = isFinite(parseFloat(el.style.left)) ? parseFloat(el.style.left) : rect.left;
    const curT = isFinite(parseFloat(el.style.top)) ? parseFloat(el.style.top) : rect.top;
    const maxX = Math.max(0, vp.w - el.offsetWidth);
    const maxY = Math.max(0, vp.h - el.offsetHeight);
    el.style.left = Math.max(0, Math.min(curL, maxX)) + 'px';
    el.style.top = Math.max(0, Math.min(curT, maxY)) + 'px';
    el.style.right = 'auto';
  }

  // ---------- 生命周期：仅在本角色卡被选中时挂载；切走即拆除，切回自动恢复 ----------
  let mounted = false;
  let eventsBound = false;
  let loopsStarted = false;
  let mvuBound = false;
  let pollTimer = null;
  let viewportResizeHandler = null;

  function currentCardName() {
    try {
      const st = topWin.SillyTavern;
      if (!st || typeof st.getContext !== 'function') return null;
      const ctx = st.getContext();
      if (ctx && typeof st.getCharacters === 'function') {
        const chars = st.getCharacters() || [];
        const id = ctx.characterId;
        if (id != null && chars[id] && chars[id].name) return String(chars[id].name);
      }
      if (ctx && typeof ctx.name2 === 'string' && ctx.name2) return ctx.name2;
    } catch (e) {
      /* 忽略 */
    }
    return null;
  }
  function isOurCard() {
    const name = currentCardName();
    return !name || name === OUR_CARD; // 读取失败时保守放行（兼容群聊）
  }

  function teardown() {
    mounted = false;
    state.open = false;
    state.sd = null;
    state.updatedAt = 0;
    state.changed = {};
    state.pending = {};
    if (state.flashTimer) {
      clearTimeout(state.flashTimer);
      state.flashTimer = null;
    }
    // 播放器：切走角色卡必须停声，否则音乐会跟着放到别的卡里继续响。
    // dead 先立起来 —— 清 src 会触发一次 error 事件，此后所有媒体事件都当噪音丢掉
    audio.dead = true;
    audio.gate = true;
    audio.seq++;
    state.view = 'main'; // 重新挂载时面板是新建的，视图状态得跟着回到变量页
    audio.idx = -1;
    audio.cues = [];
    audio.cueAt = -1;
    audio.hint = '';
    audio.dragging = false;
    if (audio.raf) {
      topWin.cancelAnimationFrame(audio.raf);
      audio.raf = null;
    }
    if (prefetchTimer) {
      clearTimeout(prefetchTimer);
      prefetchTimer = null;
    }
    if ($btn && $btn.length) $btn.removeClass('mn-audio-on');
    const el = audio.el;
    audio.el = null;
    if (el) {
      try {
        el.pause();
      } catch (e) {
        /* 忽略 */
      }
      try {
        el.removeAttribute('src');
        el.load(); // 断开已缓冲的数据，别让手机继续为它占着网络
      } catch (e) {
        /* 忽略 */
      }
      try {
        if (el.parentNode) el.parentNode.removeChild(el);
      } catch (e) {
        /* 忽略 */
      }
    }
    clearSession();
    lastKey = '';
    loopsStarted = false;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (viewportResizeHandler) {
      try {
        topWin.removeEventListener('resize', viewportResizeHandler);
      } catch (e) {
        /* 忽略 */
      }
      try {
        if (topWin.visualViewport) topWin.visualViewport.removeEventListener('resize', viewportResizeHandler);
      } catch (e) {
        /* 忽略 */
      }
      viewportResizeHandler = null;
    }
    try {
      $(topDoc).off('.mnvars');
    } catch (e) {
      /* 忽略 */
    }
    try {
      $('#' + ID_PANEL + ', #' + ID_BTN + ', #' + ID_STYLE + ', #' + ID_AUDIO, topDoc).remove();
    } catch (e) {
      /* 忽略 */
    }
    $panel = null;
    $btn = null;
    console.info('[魅魔牛状态栏] 已切离本角色卡，界面拆除');
  }

  // ---------- 挂载 ----------
  function mount() {
    if (!topDoc.body) {
      setTimeout(mount, 200);
      return;
    }
    if (!isOurCard()) {
      teardown();
      return;
    }
    // 拆除过的话重新注入样式（样式只随 mount 注入）
    if (!$('#' + ID_STYLE, topDoc).length) $(topDoc.head).append(STYLE_CSS);

    const btnHtml =
      '<div class="mn-vars" id="' +
      ID_BTN +
      '" role="button" tabindex="0" aria-label="展开变量状态栏">' +
      '<img class="mn-icon" src="' + BTN_ICON_URL + '" alt="" draggable="false">' +
      '<span class="mn-fallback">变量</span></div>';
    const panelHtml =
      '<div class="mn-vars" id="' +
      ID_PANEL +
      '" aria-hidden="true">' +
      '<span class="mn-rails" aria-hidden="true"></span>' +
      '<span class="mn-rails-v" aria-hidden="true"></span>' +
      '<span class="mn-cor mn-tl" aria-hidden="true"></span>' +
      '<span class="mn-cor mn-tr" aria-hidden="true"></span>' +
      '<span class="mn-cor mn-bl" aria-hidden="true"></span>' +
      '<span class="mn-cor mn-br" aria-hidden="true"></span>' +
      '<div class="mn-head">' +
      '<span class="mn-head-copy"><span class="mn-script">Variables</span><span class="mn-sub">变量</span></span>' +
      '<span class="mn-meta">等待初始化…</span>' +
      '<span class="mn-tools">' +
      '<button class="mn-btn mn-ico" id="mn-nav-audio" type="button" aria-pressed="false"' +
      ' aria-label="音声" title="打开音声播放器">' +
      '<span class="mn-ico-glyph" aria-hidden="true">' + ICON_EAR + '</span></button>' +
      '<button class="mn-btn" id="mn-refresh" type="button" title="立即重新读取变量">刷新</button>' +
      '<button class="mn-btn" id="mn-close" type="button" title="关闭状态栏">关闭</button>' +
      '</span>' +
      '</div>' +
      '<div class="mn-body">' +
      '<div class="mn-view mn-view-main"><div class="mn-empty">等待变量初始化…</div></div>' +
      '<div class="mn-view mn-view-audio" hidden>' +
      AUDIO_HTML +
      '</div>' +
      '</div>' +
      '</div>';

    $(topDoc.body).append(btnHtml);
    $(topDoc.body).append(panelHtml);
    $btn = $('#' + ID_BTN, topDoc);
    $panel = $('#' + ID_PANEL, topDoc);

    // 图标加载失败时回退为「变量」文字（覆盖缓存了失败结果的情形）
    const iconEl = $('.mn-icon', $btn)[0];
    if (iconEl) {
      const iconFail = function () {
        $btn.addClass('mn-icon-failed');
      };
      $(iconEl).on('error.mnvars', iconFail);
      if (iconEl.complete && iconEl.naturalWidth === 0) iconFail();
    }

    $panel.on('click.mnvars', '#mn-nav-audio', function () {
      setView(state.view === 'audio' ? 'main' : 'audio');
    });
    // 耳机提示：「戴好了」才算确认；「返回」只是离开，下次进来还会提醒一次
    $panel.on('click.mnvars', '[data-act="gate-ok"]', function () {
      audio.gate = false;
      renderAudioView();
      $panel.find('.mn-body').scrollTop(0);
      prefetchVtt(); // 人已经站在音声页上了，现在把字幕备齐最不打扰
    });
    $panel.on('click.mnvars', '[data-act="gate-back"]', function () {
      setView('main');
    });
    $panel.on('click.mnvars', '#mn-play', function () {
      togglePlay();
    });
    $panel.on('click.mnvars', '#mn-prev', function () {
      stepTrack(-1);
    });
    $panel.on('click.mnvars', '#mn-next', function () {
      stepTrack(1);
    });
    // 点列表：换轨；点当前那一轨＝播放／暂停（比回头去按播放键顺手）
    $panel.on('click.mnvars', '.mn-trk', function () {
      const i = parseInt($(this).attr('data-i'), 10);
      if (!isFinite(i)) return;
      if (i === audio.idx) {
        togglePlay();
        return;
      }
      loadTrack(i, true);
    });
    // 拖动期间只动预览、松手才写 currentTime：边拖边 seek 会在手机上打出一串
    // Range 请求，而这是流式播放，拖一次就是好几次往返
    $panel.on('pointerdown.mnvars', '.mn-seek', function (e) {
      const el = audio.el;
      if (audio.idx < 0 || !el || !isFinite(el.duration) || el.duration <= 0) return;
      audio.dragging = true;
      $panel.find('.mn-player').addClass('mn-scrubbing');
      // 合成指针事件没有真实 pointerId，setPointerCapture 会抛；拦一下即可，真机正常
      try {
        this.setPointerCapture(e.pointerId);
      } catch (err) {
        /* 忽略 */
      }
      audio.seekR = seekRatio(e.clientX);
      paintSeekPreview();
      e.preventDefault();
    });
    $panel.on('pointermove.mnvars', '.mn-seek', function (e) {
      if (!audio.dragging) return;
      audio.seekR = seekRatio(e.clientX);
      paintSeekPreview();
      e.preventDefault();
    });
    $panel.on('pointerup.mnvars pointercancel.mnvars', '.mn-seek', function () {
      if (!audio.dragging) return;
      audio.dragging = false;
      $panel.find('.mn-player').removeClass('mn-scrubbing');
      const el = audio.el;
      const dur = el && isFinite(el.duration) ? el.duration : 0;
      if (dur > 0) {
        el.currentTime = audio.seekR * dur;
        paintProgress();
        paintCue(true);
      }
    });
    $panel.on('keydown.mnvars', '.mn-seek', function (e) {
      const el = audio.el;
      const dur = el && isFinite(el.duration) ? el.duration : 0;
      if (!dur) return;
      const d = e.key === 'ArrowLeft' ? -5 : e.key === 'ArrowRight' ? 5 : 0;
      if (!d) return;
      el.currentTime = Math.min(dur, Math.max(0, el.currentTime + d));
      paintProgress();
      paintCue(true);
      e.preventDefault();
    });
    $panel.on('click.mnvars', '#mn-refresh', function () {
      refresh(true);
    });
    $panel.on('click.mnvars', '#mn-close', function () {
      setOpen(false);
    });
    // 手风琴：展开状态存在 state 里，变量刷新重渲染后仍然保持
    $panel.on('click.mnvars', '.mn-acc-head', function () {
      const acc = $(this).closest('.mn-acc');
      const key = acc.attr('data-fold');
      if (!key) return;
      state.foldOpen[key] = !state.foldOpen[key];
      acc.toggleClass('open', !!state.foldOpen[key]);
      $(this).attr('aria-expanded', state.foldOpen[key] ? 'true' : 'false');
    });
    $(topDoc).on('keydown.mnvars', function (e) {
      if (e.key !== 'Escape' || !state.open) return;
      setOpen(false);
    });
    $(topDoc).on('pointerdown.mnvars', function (e) {
      if (!state.open) return;
      if ($(e.target).closest('#' + ID_PANEL + ', #' + ID_BTN).length) return;
      setOpen(false);
    });

    makeBtnDraggable();
    makePanelDraggable();
    setTimeout(clampBtnIntoViewport, 300);

    if (!loopsStarted) {
      loopsStarted = true;
      let resizeTimer = null;
      viewportResizeHandler = function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          if (state.open) placePanel();
          clampBtnIntoViewport();
        }, 200);
      };
      topWin.addEventListener('resize', viewportResizeHandler);
      if (topWin.visualViewport) topWin.visualViewport.addEventListener('resize', viewportResizeHandler);
      // 轮询兜底：Mvu 事件未就绪时补绑 + 数据兜底刷新
      pollTimer = setInterval(function () {
        if (topDoc.hidden) return;
        if (!mvuBound) tryBindMvu();
        refresh(false);
      }, 5000);
    }

    // 首次读取
    refresh(true);

    // 事件驱动刷新
    let refreshTimer = null;
    function schedule() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(function () {
        refresh(false);
      }, 500);
    }
    if (typeof eventOn === 'function' && typeof tavern_events === 'object' && !eventsBound) {
      eventsBound = true;
      eventOn(tavern_events.MESSAGE_RECEIVED, schedule);
      eventOn(tavern_events.MESSAGE_UPDATED, schedule);
      eventOn(tavern_events.MESSAGE_SENT, schedule);
      eventOn(tavern_events.MESSAGE_SWIPED, schedule);
      eventOn(tavern_events.CHAT_CHANGED, function () {
        if (!isOurCard()) {
          teardown(); // 切走：拆除界面
          return;
        }
        if (!mounted) {
          mount(); // 切回：重新挂载
          return;
        }
        state.sd = null;
        lastKey = '';
        renderContent();
        setTimeout(function () {
          refresh(true);
        }, 800);
      });
    }
    function tryBindMvu() {
      if (mvuBound || typeof eventOn !== 'function') return;
      const mvu = topWin.Mvu;
      if (!mvu || !mvu.events) return;
      mvuBound = true;
      eventOn(mvu.events.VARIABLE_INITIALIZED, schedule);
      eventOn(mvu.events.VARIABLE_UPDATE_ENDED, function (variables) {
        const sd = normalizeStatData(variables);
        if (!sd) {
          schedule();
          return;
        }
        diffAndStage(sd, false);
        state.sd = JSON.parse(JSON.stringify(sd));
        state.updatedAt = Date.now();
        lastKey = JSON.stringify(state.sd);
        renderContent();
      });
      console.info('[魅魔牛状态栏] 已绑定 Mvu 事件');
    }
    tryBindMvu();

    mounted = true;
    console.info('[魅魔牛状态栏] 已挂载');
  }

  $(function () {
    mount();
  });
  // iframe 被销毁时兜底清理顶层注入的 DOM，避免孤儿节点残留
  $(window).on('pagehide', function () {
    teardown();
  });
})();
