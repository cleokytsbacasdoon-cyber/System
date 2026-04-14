const { query } = require('./db');

async function fix() {
  // Restore correct version strings for all rows that were corrupted (version = id)
  const fixes = [
    ['mv-cmp-lstm-eval',            'lstm_eval_march_2025'],
    ['mv-cmp-random_forest-eval',   'random_forest_eval_march_2025'],
    ['mv-cmp-prophet-eval',         'prophet_eval_march_2025'],
    ['mv-cmp-xgb-1776151159476',    'xgboost_base_january_2026'],
    ['mv-cmp-xgb-1776150867867',    'xgboost_base_march_2026'],
    ['mv-cmp-xgb-1776147114465',    'xgboost_base_december_2025'],
    ['mv-cmp-xgb-1775947095302',    'xgboost_base_april_2026'],
    ['mv-cmp-xgb-1775944945247',    'xgboost_base_march_2025'],
    ['mv-cmp-xgb-1775922708432',    'xgboost_base_march_2025'],
    ['mv-1775836672351',            'xgboost_january_2026'],
    ['mv-1775836646785',            'xgboost_february_2026'],
    ['mv-1775836388003',            'xgboost_march_2026'],
  ];

  for (const [id, version] of fixes) {
    await query('UPDATE model_versions SET version=$1 WHERE id=$2', [version, id]);
    console.log('fixed:', id, '->', version);
  }

  const r = await query('SELECT id, version FROM model_versions ORDER BY deploy_date DESC');
  r.rows.forEach(row => console.log(row.id, '|', row.version));
  process.exit(0);
}

fix().catch(e => { console.error(e.message); process.exit(1); });
