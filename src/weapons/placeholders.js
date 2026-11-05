// Fallback weapon textures ("ph_*") used until the weapon art exists.
export function createWeaponPlaceholders(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  make(scene, g, 'ph_ninja_star', 18, 18, () => {
    g.fillStyle(0xb0b8c8);
    g.fillTriangle(9, 0, 6, 9, 12, 9);
    g.fillTriangle(9, 18, 6, 9, 12, 9);
    g.fillTriangle(0, 9, 9, 6, 9, 12);
    g.fillTriangle(18, 9, 9, 6, 9, 12);
    g.fillStyle(0x303640).fillCircle(9, 9, 2);
  });

  // A meat cone on a spit, with shading bands so the rotation reads.
  make(scene, g, 'ph_doener', 30, 60, () => {
    g.fillStyle(0x9a9a9a).fillRect(13, 0, 4, 60);
    g.fillStyle(0x8a4a1c).fillRect(3, 8, 24, 42);
    g.fillStyle(0xb8682a);
    for (let y = 10; y < 50; y += 8) g.fillRect(3, y, 24, 3);
    g.fillStyle(0x5c2e10).fillRect(3, 8, 5, 42);
  });

  make(scene, g, 'ph_helmet_horned', 48, 24, () => {
    g.fillStyle(0xe8dcc0);
    g.fillTriangle(0, 0, 10, 20, 16, 14);
    g.fillTriangle(48, 0, 38, 20, 32, 14);
    g.fillStyle(0x8a8f98).fillRect(10, 10, 28, 14);
  });

  make(scene, g, 'ph_helmet_accurate', 48, 24, () => {
    g.fillStyle(0x8a8f98).fillEllipse(24, 18, 32, 24);
    g.fillStyle(0x5a5f68).fillRect(22, 12, 4, 12);
  });

  
  make(scene, g, 'ph_bullet', 10, 4, () => {
    g.fillStyle(0xffd060).fillRect(0, 0, 10, 4);
    g.fillStyle(0xfff4c0).fillRect(6, 1, 4, 2);
  });

  make(scene, g, 'ph_arrow', 30, 6, () => {
    g.fillStyle(0x8a5a2c).fillRect(4, 2, 22, 2);
    g.fillStyle(0xd0d4dc).fillTriangle(30, 3, 24, 0, 24, 6);
    g.fillStyle(0xc03030).fillRect(0, 0, 5, 6);
  });

  make(scene, g, 'ph_mercedes_star', 24, 24, () => {
    g.lineStyle(3, 0xd8dde6).strokeCircle(12, 12, 10);
    g.fillStyle(0xd8dde6);
    g.fillTriangle(12, 2, 10, 12, 14, 12);
    g.fillTriangle(3.5, 17, 11, 10.5, 13, 14);
    g.fillTriangle(20.5, 17, 13, 10.5, 11, 14);
  });

  make(scene, g, 'ph_magic_missile', 20, 20, () => {
    g.fillStyle(0x8a3cff, 0.45).fillCircle(10, 10, 10);
    g.fillStyle(0xc89aff).fillCircle(10, 10, 6);
    g.fillStyle(0xffffff).fillCircle(11, 9, 3);
  });

  make(scene, g, 'ph_proj_bumerang', 28, 28, () => {
    g.fillStyle(0xb07a40);
    g.fillTriangle(2, 4, 8, 2, 26, 22);
    g.fillTriangle(2, 4, 4, 10, 26, 22);
    g.fillTriangle(26, 22, 22, 26, 4, 10);
  });

  make(scene, g, 'ph_pfeffi_bottle', 12, 26, () => {
    g.fillStyle(0x2fae4a).fillRect(1, 9, 10, 17);
    g.fillStyle(0x2fae4a).fillRect(4, 2, 4, 8);
    g.fillStyle(0xe8e8e8).fillRect(3, 14, 6, 6);
    g.fillStyle(0x303030).fillRect(4, 0, 4, 3);
  });

  make(scene, g, 'ph_fx_mint_cloud', 96, 64, () => {
    g.fillStyle(0x7cffb0, 0.35).fillEllipse(48, 32, 96, 64);
    g.fillStyle(0xb8ffd8, 0.35).fillEllipse(36, 28, 48, 30);
    g.fillStyle(0xb8ffd8, 0.3).fillEllipse(62, 38, 44, 26);
  });

  make(scene, g, 'ph_fx_firewall', 48, 84, () => {
    g.fillStyle(0xd02a10, 0.85).fillTriangle(0, 84, 48, 84, 24, 4);
    g.fillStyle(0xff8a20, 0.9).fillTriangle(8, 84, 40, 84, 22, 24);
    g.fillStyle(0xffe070).fillTriangle(16, 84, 32, 84, 25, 48);
  });

  make(scene, g, 'ph_claymore_mine', 36, 24, () => {
    g.fillStyle(0x4a5a2a).fillRect(0, 4, 36, 16);
    g.fillStyle(0x2e3a18).fillRect(0, 18, 36, 6);
    g.fillStyle(0xff3030).fillRect(16, 0, 4, 6);
  });

  make(scene, g, 'ph_fx_chainsaw', 60, 30, () => {
    g.fillStyle(0xe07a10).fillRect(0, 6, 22, 18);
    g.fillStyle(0xb8bcc4).fillRect(20, 10, 38, 10);
    g.fillStyle(0x404448);
    for (let x = 22; x < 58; x += 6) {
      g.fillTriangle(x, 10, x + 3, 6, x + 6, 10);
      g.fillTriangle(x, 20, x + 3, 24, x + 6, 20);
    }
  });

  g.destroy();
}

function make(scene, g, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  g.clear();
  draw();
  g.generateTexture(key, w, h);
}
