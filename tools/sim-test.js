// Fast-forwards each stage under a few play styles and prints the outcome.
// The simulation uses a fixed 0.05 s step and a per-stage seed, so results are reproducible.
//   npm install && python3 tools/build.py --test && node tools/sim-test.js
// Set CHROMIUM_SPARTICUZ=1 to use @sparticuz/chromium instead of Playwright's own browser.
const path = require('path');
const STRATEGIES = {
  0: ['auto', 'fill', 'carry', 'carry+late'],
  1: ['auto', 'zones', 'zones+reg', 'zones+reg+carry'],
  2: ['auto', 'hold', 'road', 'hold+road', 'protect+road'],
};
// Episode 3 detours: grass cells beside the blocked stretches of the vertical road.
const DETOUR = [[13, 10], [13, 11], [13, 12], [13, 13], [13, 18], [13, 19], [13, 20]];
async function launch() {
  if (process.env.CHROMIUM_SPARTICUZ) {
    const sp = require('@sparticuz/chromium'); const { chromium } = require('playwright-core');
    return chromium.launch({ executablePath: await sp.executablePath(), args: [...sp.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'], headless: true });
  }
  const { chromium } = require('playwright');
  return chromium.launch({ args: ['--allow-file-access-from-files'], headless: true });
}
async function run(stage, scen) {
  const b = await launch(); const p = await b.newPage({ viewport: { width: 400, height: 300 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../dist/anaume.test.html'));
  await p.waitForFunction(() => document.getElementById('loadNote').hidden, { timeout: 60000 });
  await p.evaluate(st => __start(st), stage); await p.click('#pauseBtn');
  await p.evaluate(([scen, detour]) => {
    const d = __dbg();
    if (scen.includes('hold')) d.S.defaultCls = 'hold';
    if (scen.includes('protect')) d.S.defaultCls = 'protect';
    if (scen.includes('road')) for (const [i, j] of detour) { const c = d.cells[j * 32 + i];
      if (c.type !== 'grass' || c.bld || c.decor) throw new Error('detour cell not paintable ' + i + ',' + j);
      c.type = 'road'; c.dirty = true; d.S.money -= 8; d.S.spent += 8; d.S.roadBuilt++; }
    if (scen.includes('zones')) d.plots.forEach(pl => pl.cells.forEach(c => { c.zone = 1; c.dirty = true; }));
    if (scen.includes('reg')) __reg();
    if (scen.includes('fill')) document.getElementById('buyFill').click();
    if (scen.includes('carry')) document.getElementById('buyCarry').click();
  }, [scen, DETOUR]);
  let r;
  for (let k = 0; k < 14; k++) {
    if (k === 1 && scen.includes('late')) await p.evaluate(() => document.getElementById('buyFill').click());
    r = await p.evaluate(() => { __ff(60); const d = __dbg(), S = d.S;
      return { t: Math.round(S.t), houses: S.houses, redigs: S.redigs, roadEnd: Math.round(S.road * 100), roadAvg: Math.round(S.roadSum / Math.max(1, S.roadSamples) * 100),
               waste: +S.waste.toFixed(1), complaints: S.complaints, maxStall: Math.round(S.maxStall), soilError: +d.err.toFixed(4), cleared: !!S.cleared, ended: S.ended }; });
    if (r.ended) break;
  }
  await b.close();
  return { stage: stage + 1, scen, ...r, errors: errs.length };
}
// Regression: the player must be able to classify an actual wall, not only
// change the default used by the synthetic strategy tests.
async function testStage3WallTool() {
  const b = await launch();
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto('file://' + path.resolve(__dirname, '../dist/anaume.test.html'));
    await p.waitForFunction(() => document.getElementById('loadNote').hidden, { timeout: 60000 });
    await p.evaluate(() => __start(2));
    await p.click('#pauseBtn');
    const result = await p.evaluate(() => {
      let first;
      for (let n = 0; n < 200; n++) {
        __ff(1);
        const w = __walls();
        if (w.length) { first = w[0]; break; }
      }
      if (!first) return { error: 'No wall appeared within 200 simulated seconds' };
      if (first.cls !== 'remove') return { error: 'First wall does not start as remove' };
      if (!__classifyWall(first.id)) return { error: 'Obstacle-classification tool rejected the wall' };
      const held = __walls().find(w => w.id === first.id);
      if (!held || held.cls !== 'hold' || held.claim !== 0) {
        return { error: 'Classifying a wall did not switch to hold and clear reservations', held };
      }
      // A held wall must eventually be removable by its owner and not freeze the sim.
      __ff(90);
      const d = __dbg();
      return { firstWall: first.id, firstState: held.cls, ownerRemoved: d.S.selfRemoved, t: d.S.t, errors: [] };
    });
    if (errors.length || result.error || result.ownerRemoved < 1) {
      throw new Error('Stage 3 wall interaction failed: ' + JSON.stringify({ ...result, errors }));
    }
    console.log('Stage 3 wall classification: PASS', result);
  } finally { await b.close(); }
}
(async () => {
  const rows = [];
  const only = process.env.STAGE ? +process.env.STAGE - 1 : null;
  for (const [st, list] of Object.entries(STRATEGIES)) if (only === null || +st === only) for (const sc of list) rows.push(await run(+st, sc));
  console.table(rows);
  if (rows.some(r => r.errors || Math.abs(r.soilError) > 0.001)) process.exitCode = 1;
  if (only === null || only === 2) {
    // The intended combination must remain winnable by actual simulation.
    const target = rows.find(r => r.stage === 3 && r.scen === 'hold+road');
    if (!target || !target.cleared) { console.error('Stage 3 hold+road no longer reaches its goal', target); process.exitCode = 1; }
    try { await testStage3WallTool(); }
    catch (e) { console.error(e); process.exitCode = 1; }
  }
})();
