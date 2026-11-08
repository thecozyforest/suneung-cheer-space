import * as THREE from 'three';
import { getUiScale } from './scale.js';

/** 3D 위치에 붙는 HTML 이름표·말풍선 */
export function createLabels(container) {
  const items = new Map();
  const v = new THREE.Vector3();
  return {
    set(id, { text, getPos, cls = '', html, onClick }) {
      let it = items.get(id);
      if (!it) {
        const el = document.createElement(onClick ? 'button' : 'div');
        el.className = `world-label ${cls}`;
        if (onClick) { el.type = 'button'; el.addEventListener('click', (e) => { e.stopPropagation(); it.onClick?.(); }); }
        container.appendChild(el);
        it = { el, getPos, text: null, onClick };
        items.set(id, it);
      }
      it.getPos = getPos; it.onClick = onClick;
      if (html != null && html !== it.text) { it.el.innerHTML = html; it.text = html; } else if (text != null && text !== it.text) { it.el.textContent = text; it.text = text; }
      it.el.className = `world-label ${cls}`;
      return it.el;
    },
    remove(id) { const it = items.get(id); if (it) { it.el.remove(); items.delete(id); } },
    clear(prefix = '') { for (const id of [...items.keys()]) if (id.startsWith(prefix)) this.remove(id); },
    has(id) { return items.has(id); },
    update(camera, w, h) {
      const k = getUiScale();
      for (const it of items.values()) {
        it.getPos(v);
        v.project(camera);
        const vis = v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
        if (!vis) { it.el.style.display = 'none'; continue; }
        it.el.style.display = '';
        it.el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)${k > 1 ? ` scale(${k})` : ''}`;
      }
    },
  };
}
