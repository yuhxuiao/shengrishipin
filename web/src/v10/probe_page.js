// probe: file:// 下 <img> → canvas → toDataURL 是否被 taint 拦截
(function () {
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.getElementById('out');
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 320, 180);
      const url = c.toDataURL('image/jpeg', 0.9);
      window.renderAt = (t, type, q) => url;
      window.renderSheet = (ts, cols, w) => ({ url, ms: [1] });
      console.log('[probe] toDataURL ok, len=' + url.length);
      window.ready = true;
    } catch (e) {
      console.error('[probe] TAINTED: ' + e.message);
    }
  };
  img.onerror = (e) => console.error('[probe] img load failed');
  img.src = '../assets/images/v10/parts/body.png';
})();
