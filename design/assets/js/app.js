/* 中庭 · 交互脚本:主题切换、问候语、书房筛选 */
(function () {
  'use strict';

  /* ---- 主题:首访跟随系统,手动切换本次会话生效 ---- */
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  if (toggle) {
    var sync = function () {
      var dark = root.dataset.theme === 'dark';
      toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
      toggle.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
    };
    toggle.addEventListener('click', function () {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      sync();
    });
    sync();
  }

  /* ---- 问候语与日期(首页) ---- */
  var greet = document.getElementById('greetingTitle');
  var dateEl = document.getElementById('greetingDate');
  if (greet || dateEl) {
    var now = new Date();
    if (greet) {
      var h = now.getHours();
      var t = '晚上好。';
      if (h >= 5 && h < 11) t = '早上好。';
      else if (h >= 11 && h < 13) t = '中午好。';
      else if (h >= 13 && h < 18) t = '下午好。';
      else if (h >= 23 || h < 5) t = '夜深了。';
      greet.textContent = t;
    }
    if (dateEl) {
      var days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      dateEl.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + days[now.getDay()];
    }
  }

  /* ---- 书房:按标签筛选 ---- */
  var chips = document.querySelectorAll('.chip[data-filter]');
  var list = document.getElementById('studyList');
  if (chips.length && list) {
    var empty = document.getElementById('studyEmpty');
    var apply = function (f) {
      var visible = 0;
      list.querySelectorAll('.post-item').forEach(function (item) {
        var show = f === 'all' || item.getAttribute('data-tag') === f;
        item.hidden = !show;
        if (show) visible += 1;
      });
      list.querySelectorAll('.month-group').forEach(function (group) {
        var any = group.querySelectorAll('.post-item:not([hidden])').length > 0;
        group.hidden = !any;
      });
      if (empty) empty.hidden = visible > 0;
    };
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) {
          c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
        });
        apply(chip.getAttribute('data-filter'));
      });
    });
  }
})();
