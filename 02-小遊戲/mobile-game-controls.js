(() => {
  if (window.__mobileGameControlsInstalled) return;
  window.__mobileGameControlsInstalled = true;

  const doc = document;
  const style = doc.createElement('style');
  style.textContent = `
    html, body { overscroll-behavior: none !important; -webkit-user-select: none !important; user-select: none !important; -webkit-touch-callout: none !important; }
    canvas { touch-action: none !important; -webkit-tap-highlight-color: transparent !important; }
    .mgc-root { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Microsoft JhengHei", sans-serif; }
    .mgc-pad { position: absolute; left: max(18px, env(safe-area-inset-left)); bottom: max(24px, env(safe-area-inset-bottom)); width: 136px; height: 136px; border-radius: 999px; border: 1px solid rgba(34,211,238,.55); background: rgba(15,23,42,.45); box-shadow: 0 0 28px rgba(34,211,238,.18); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); pointer-events: auto; touch-action: none; }
    .mgc-knob { position: absolute; left: 50%; top: 50%; width: 56px; height: 56px; border-radius: 999px; transform: translate(-50%, -50%); background: rgba(34,211,238,.92); box-shadow: 0 0 20px rgba(34,211,238,.72); }
    .mgc-actions { position: absolute; right: max(18px, env(safe-area-inset-right)); bottom: max(24px, env(safe-area-inset-bottom)); display: grid; grid-template-columns: 78px 78px; gap: 12px; pointer-events: auto; }
    .mgc-btn { width: 78px; height: 58px; border-radius: 18px; border: 1px solid rgba(255,255,255,.28); background: rgba(15,23,42,.76); color: #fff; font-weight: 900; letter-spacing: .06em; box-shadow: 0 12px 30px rgba(0,0,0,.38); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
    .mgc-btn:active, .mgc-btn.active { background: #22d3ee; color: #020617; transform: translateY(1px) scale(.98); }
    .mgc-btn.attack { grid-column: span 2; width: 168px; height: 64px; border-color: rgba(244,63,94,.72); font-size: 1rem; background: rgba(127,29,29,.78); }
    .mgc-hint { position: absolute; left: 50%; bottom: max(170px, calc(env(safe-area-inset-bottom) + 170px)); transform: translateX(-50%); padding: 7px 12px; border-radius: 999px; background: rgba(2,6,23,.62); color: rgba(226,232,240,.82); font-size: 12px; letter-spacing: .08em; pointer-events: none; white-space: nowrap; }
    @media (hover: hover) and (pointer: fine) { .mgc-root { display: none; } }
    @media (max-width: 520px) { .mgc-pad { width: 124px; height: 124px; } .mgc-knob { width: 50px; height: 50px; } .mgc-actions { grid-template-columns: 70px 70px; gap: 10px; } .mgc-btn { width: 70px; height: 54px; font-size: .82rem; } .mgc-btn.attack { width: 150px; height: 60px; } .mgc-hint { bottom: 156px; font-size: 11px; } }
  `;
  doc.head.appendChild(style);

  let meta = doc.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = doc.createElement('meta');
    meta.name = 'viewport';
    doc.head.appendChild(meta);
  }
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

  const originalPointerLock = Element.prototype.requestPointerLock;
  Element.prototype.requestPointerLock = function safePointerLock() {
    try {
      if (typeof originalPointerLock === 'function') return originalPointerLock.call(this);
    } catch (_) {}
    return Promise.resolve();
  };

  doc.addEventListener('touchmove', event => {
    const target = event.target;
    if (!target || !target.closest || !target.closest('input, textarea, select, .custom-scrollbar')) event.preventDefault();
  }, { passive: false, capture: true });

  const root = doc.createElement('div');
  root.className = 'mgc-root';
  root.innerHTML = `
    <div class="mgc-hint">手機／平板：左側移動，右側攻擊與互動</div>
    <div class="mgc-pad" id="mgc-pad"><div class="mgc-knob" id="mgc-knob"></div></div>
    <div class="mgc-actions">
      <button class="mgc-btn attack" id="mgc-attack" type="button">攻擊</button>
      <button class="mgc-btn" id="mgc-interact" type="button">互動</button>
      <button class="mgc-btn" id="mgc-skill" type="button">技能</button>
    </div>`;
  doc.body.appendChild(root);

  const keyMap = {
    KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
    ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
    Space: ' ', KeyE: 'e', KeyF: 'f', KeyM: 'm', KeyJ: 'j', KeyK: 'k', ShiftLeft: 'Shift'
  };
  const active = new Set();
  function keyEvent(type, code) {
    const event = new KeyboardEvent(type, { key: keyMap[code] || code, code, bubbles: true, cancelable: true });
    winDispatch(event);
  }
  function winDispatch(event) {
    try { window.dispatchEvent(event); } catch (_) {}
    try { doc.dispatchEvent(event); } catch (_) {}
  }
  function press(code) {
    if (active.has(code)) return;
    active.add(code);
    keyEvent('keydown', code);
  }
  function release(code) {
    if (!active.has(code)) return;
    active.delete(code);
    keyEvent('keyup', code);
  }
  function releaseAllMove() {
    ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].forEach(release);
  }
  function setMove(nx, ny) {
    const dead = 0.18;
    const up = ny < -dead, down = ny > dead, left = nx < -dead, right = nx > dead;
    [['KeyW', up], ['ArrowUp', up], ['KeyS', down], ['ArrowDown', down], ['KeyA', left], ['ArrowLeft', left], ['KeyD', right], ['ArrowRight', right]].forEach(([code, on]) => on ? press(code) : release(code));
  }

  const pad = doc.getElementById('mgc-pad');
  const knob = doc.getElementById('mgc-knob');
  function resetPad() {
    releaseAllMove();
    knob.style.transform = 'translate(-50%, -50%)';
  }
  function updatePad(x, y) {
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = rect.width * 0.34;
    let dx = x - cx, dy = y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > max) { dx = dx / dist * max; dy = dy / dist * max; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    setMove(dx / max, dy / max);
  }
  pad.addEventListener('pointerdown', e => { e.preventDefault(); pad.setPointerCapture(e.pointerId); updatePad(e.clientX, e.clientY); }, { passive: false });
  pad.addEventListener('pointermove', e => { if (!pad.hasPointerCapture(e.pointerId)) return; e.preventDefault(); updatePad(e.clientX, e.clientY); }, { passive: false });
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => pad.addEventListener(type, resetPad));

  function centerPoint() {
    const canvas = doc.querySelector('canvas');
    const rect = (canvas || doc.body).getBoundingClientRect();
    return { target: canvas || doc.body, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  function mouse(type, button = 0) {
    const { target, x, y } = centerPoint();
    const evt = new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y, button, buttons: type === 'mouseup' ? 0 : (button === 2 ? 2 : 1) });
    try { target.dispatchEvent(evt); } catch (_) {}
    try { doc.dispatchEvent(evt); } catch (_) {}
  }
  function clickExisting(selectors) {
    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      if (el && !el.disabled && el.offsetParent !== null) { el.click(); return true; }
    }
    return false;
  }
  function callIfExists(names) {
    for (const name of names) {
      if (typeof window[name] === 'function') { try { window[name](); return true; } catch (_) {} }
    }
    return false;
  }
  function tapButton(btn, onDown, onUp) {
    btn.addEventListener('pointerdown', e => { e.preventDefault(); btn.classList.add('active'); onDown(); }, { passive: false });
    const end = e => { e.preventDefault(); btn.classList.remove('active'); onUp && onUp(); };
    btn.addEventListener('pointerup', end, { passive: false });
    btn.addEventListener('pointercancel', end, { passive: false });
    btn.addEventListener('pointerleave', end, { passive: false });
  }

  tapButton(doc.getElementById('mgc-attack'), () => {
    clickExisting(['#atk-btn', '#btn-atk', '.attack-btn', '[data-action="attack"]']);
    callIfExists(['attack', 'attackMelee', 'shoot', 'fire']);
    ['Space','KeyJ','KeyK'].forEach(press);
    mouse('mousedown', 0);
  }, () => {
    mouse('mouseup', 0);
    mouse('click', 0);
    ['Space','KeyJ','KeyK'].forEach(release);
  });

  tapButton(doc.getElementById('mgc-interact'), () => {
    clickExisting(['#interact-btn', '#btn-interact', '[data-action="interact"]']);
    callIfExists(['interact', 'openManagementModal']);
    ['KeyE','Space','KeyF'].forEach(press);
  }, () => {
    ['KeyE','Space','KeyF'].forEach(release);
  });

  tapButton(doc.getElementById('mgc-skill'), () => {
    clickExisting(['#def-btn', '#ult-btn', '#skill-r', '#btn-move', '#btn-wind', '.skill-box.ready']);
    callIfExists(['useWindSkill', 'placeBuilding', 'openManagementModal']);
    ['ShiftLeft','KeyM','KeyF'].forEach(press);
    mouse('mousedown', 2);
  }, () => {
    mouse('mouseup', 2);
    ['ShiftLeft','KeyM','KeyF'].forEach(release);
  });

  doc.querySelectorAll('canvas, button, a, [role="button"], [onclick]').forEach(el => {
    el.style.touchAction = 'manipulation';
    el.style.webkitTapHighlightColor = 'transparent';
  });
})();
